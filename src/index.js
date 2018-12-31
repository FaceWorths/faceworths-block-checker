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

function check(hash, block) {
  console.log(new Date(), 'Checking Block Number for ', hash, 'at block', block);
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
    if (currentBlock >= checkPointOne) {
      let currentStage = await factoryContract.getCurrentStage(`0x${hash}`).call();
      if (currentStage === 1) {
        check(hash, currentBlock.toNumber());
      } else if (currentStage === 2) {
        if (currentBlock >= checkPointTwo) {
          check(hash, currentBlock.toNumber);
        }
      } else {
        clearInterval(watcher);
      }
    }
  }, 3000);
});
