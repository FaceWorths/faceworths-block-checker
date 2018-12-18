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

const activeGames = {};

factoryContract.FaceWorthPollCreated().watch((err, {result}) => {
  if (err) return console.error('Failed to bind event listener:', err);
  console.log('Detected new poll:', result.hash);
  activeGames[result.hash] = result.hash;
});
