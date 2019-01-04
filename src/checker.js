import "@babel/polyfill";
import Tronweb from 'tronweb';
import { list, update } from './game.js';

const config = require('./config.js');

if (!process.env.endPoint || !process.env.jwt || !process.env.network) {
  console.error('Environment variables are missing');
  process.exit();
}

const network = config.networks[process.env.network];
const tronWeb = new Tronweb(
  network.fullHost,
  network.fullHost,
  network.fullHost,
  network.privateKey
);

const contracts = (process.env.network === 'mainnet') ?
  require('./contracts.json') : require('./contracts-testnet.json');
const factory = contracts['FaceWorthPollFactory'];
const factoryContract = tronWeb.contract(factory.abi, factory.address);

function check(hash, block) {
  console.log(new Date(), 'Checking Block Number for', hash, 'at block', block);
  factoryContract.checkBlockNumber(`0x${hash}`).send({
    shouldPollResponse: false,
    callValue: 0,
    feeLimit: 1000000000
  }).catch(e=>console.error(e));
}

factoryContract.FaceWorthPollCreated().watch((err, data) => {
  if (err) return console.error('Failed to bind event listener:', err);
  if (data) {
    let { result } = data;
    console.log(new Date(), 'Detected new poll:', result);
    let checkPointOne = Number(result.commitEndBlock) + 1;
    console.log('checkPointOne', checkPointOne);
    let checkPointTwo = Number(result.revealEndBlock) + 1;
    console.log('checkPointTwo', checkPointTwo);
    let hash = result.hash;
    let watcher = setInterval(async () => {
      let currentBlock = await factoryContract.getCurrentBlock().call();
      if (currentBlock >= checkPointOne) {
        let currentStage = await factoryContract.getCurrentStage(`0x${hash}`).call();
        if (currentStage === 1) {
          check(hash, currentBlock.toNumber());
        } else if (currentStage === 2) {
          if (currentBlock >= checkPointTwo) {
            check(hash, currentBlock.toNumber());
          }
        } else {
          clearInterval(watcher);
        }
      }
    }, 3000);
  }
});

factoryContract.StageChange().watch((err, data) => {
  if (err) return console.error('Failed to bind event listener:', err);
  if (data) {
    let { result } = data;
    if (result.newStage > '2') {
      factoryContract.getStatus(`0x${result.hash}`).call().then((data) => {
        update(
          result.hash,
          result.newStage,
          data.totalWorth.toNumber(),
          data.participantCount.toNumber(),
          data.revealCount.toNumber()).catch(e => console.error(e));
      }).catch(e => {
        console.error(e);
      });
    } else {
      update(result.hash, result.newStage).catch(e => {
        console.error(e);
      });
    }
  }
});

function updateEndedGames(games) {
  return games.filter((game) => {
    let updated = false;
    factoryContract.getStatus(`0x${game.hash}`).call().then((data) => {
      console.log(game.hash, 'current stage is', data.currentStage);
      if(data.currentStage > 2) {
        update(
          game.hash,
          data.currentStage.toString(),
          data.totalWorth.toNumber(),
          data.participantCount.toNumber(),
          data.revealCount.toNumber()).catch(e => {
          console.error(e);
          updated = true;
        });
      }
    }).catch(e => {
      console.error(e);
    });
    return !updated;
  });
}

list({ 'status': '1' }, 1000).then((games) => {
  if (games && games.length > 0) {
    console.log(new Date(), 'found', games.length, 'games in commit stage');
    const gamesInProgress = updateEndedGames(games);
    const checked = new Map();
    let maxCheckPoint = 0;
    gamesInProgress.forEach((game) => {
      let checkPoint = game.commitEndBlock + 1;
      if (!checked.has(checkPoint)) {
        checked.set(checkPoint, false);
      }
      if (checkPoint > maxCheckPoint) {
        maxCheckPoint = checkPoint;
      }
    });
    let commitWatcher = setInterval(async () => {
      let currentBlock = await factoryContract.getCurrentBlock().call();
      let currentBlockNumber = currentBlock.toNumber();
      gamesInProgress.forEach((game) => {
        let checkPoint = game.commitEndBlock + 1;
        if(checkPoint <= currentBlockNumber && !checked.get(checkPoint)) {
          check(game.hash, currentBlockNumber);
          checked.set(checkPoint, true);
        }
      });
      if (currentBlockNumber >= maxCheckPoint) {
        clearInterval(commitWatcher);
      }
    }, 3000);
  }
});

list({ 'status': '2' }, 1000).then((games) => {
  if (games && games.length > 0) {
    console.log(new Date(), 'found', games.length, 'games in reveal stage');
    const gamesInProgress = updateEndedGames(games);
    const checked = new Map();
    let maxCheckPoint = 0;
    gamesInProgress.forEach((game) => {
      let checkPoint = game.revealEndBlock + 1;
      if (!checked.has(checkPoint)) {
        checked.set(checkPoint, false);
      }
      if (checkPoint > maxCheckPoint) {
        maxCheckPoint = checkPoint;
      }
    });
    let revealWatcher = setInterval(async () => {
      let currentBlock = await factoryContract.getCurrentBlock().call();
      let currentBlockNumber = currentBlock.toNumber();
      gamesInProgress.forEach((game) => {
        let checkPoint = game.revealEndBlock + 1;
        if(checkPoint <= currentBlockNumber && !checked.get(checkPoint)) {
          check(game.hash, currentBlockNumber);
          checked.set(checkPoint, true);
        }
      });
      if (currentBlockNumber >= maxCheckPoint) {
        clearInterval(revealWatcher);
      }
    }, 3000);
  }
});

