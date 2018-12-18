module.exports = {
  networks: {
    development: {
      privateKey: '3af6160869b902e697664fe3d4efb1d29ccc44654d3556b36430d230e8a3afd1',
      fullHost: "http://127.0.0.1:9090",
    },
    shasta: {
      privateKey: process.env.PK,
      fullHost: "https://api.shasta.trongrid.io",
    },
    mainnet: {
      privateKey: process.env.PK,
      fullHost: "https://api.trongrid.io",
    }
  }
};