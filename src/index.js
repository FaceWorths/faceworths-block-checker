'use strict';

const Tronweb = require("tronweb");
const config = require('./config.js');
const args = require('yargs').argv;
const contracts = require('./contracts.json');

if (!args.network) {
  console.error('network is not specified. e.g. --network=development');
  process.exit();
}

const network = config.networks[args.network];

const tronWeb = new Tronweb(
  network.fullHost,
  network.fullHost,
  network.fullHost,
  network.privateKey
);

const factory = contracts['FaceWorthPollFactory'];

const factoryContract = tronWeb.contract(factory.abi, factory.address);

const activeGames = new Map();

function check(hash) {
  console.log(new Date(), 'Checking Block Number for ', hash)
  factoryContract.checkBlockNumber(`0x${hash}`).send({
    shouldPollResponse: false,
    callValue: 0,
    feeLimit: 1000000000
  });
 }

factoryContract.FaceWorthPollCreated().watch((err, {result}) => {
  if (err) return console.error('Failed to bind event listener:', err);
  console.log(new Date(), 'Detected new poll:', result);
  let checkPointOne = Number(result.commitEndBlock) + 1;
  console.log('checkPointOne', checkPointOne);
  let checkPointTwo = Number(result.revealEndBlock) + 1;
  console.log('checkPointTwo', checkPointTwo);
  let hash = result.hash;
  let watcher = setInterval(async () => {
    let currentBlock = await factoryContract.getCurrentBlock().call();
    let currentBlockNumber = currentBlock.toNumber();
    if (currentBlockNumber >= checkPointOne) {
      let currentStage = await factoryContract.getCurrentStage(`0x${hash}`);
      console.log('currentStage', currentStage);
      if (currentStage === 1) {
        check(hash);
      }
    } else if (currentBlockNumber >= checkPointTwo) {
      let currentStage = await factoryContract.getCurrentStage(`0x${hash}`);
      console.log('currentStage', currentStage);
      if (currentStage === 2) {
        check(hash);
      } else {
        clearInterval(watcher);
      }
    }
  }, 3000);
});