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

factoryContract.FaceWorthPollCreated().watch((err, {result}) => {
  if (err) return console.error('Failed to bind event listener:', err);
  console.log('Detected new poll:', result);
  activeGames.set(result.hash, setInterval(()=>{
    factoryContract.checkBlockNumber('0x' + result.hash).send({
      shouldPollResponse: false,
      callValue: 0,
      feeLimit: 1000000000
    });
  }, 3000));
});

factoryContract.StageChange().watch((err, {result}) => {
  if (err) return console.error('Failed to bind event listener:', err);
  console.log('Detected stage change:', result);
  if (result.newStage > 2) {
    clearInterval(activeGames.get(result.hash));
    activeGames.delete(result.hash);
  }
});
