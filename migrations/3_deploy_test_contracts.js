var Token = artifacts.require("Token");
var Creator = artifacts.require("Creator");
var TestCrowdsale = artifacts.require("TestCrowdsale");

var argv = require('yargs-parser')(process.argv.slice(2));

module.exports = function(deployer) {
  if (argv._ && argv._[0] === 'test') {
    deployer.deploy(Token);
    deployer.deploy(TestCrowdsale, Creator.address).then((crowdsale) => {
      return crowdsale.firstMintRound0(100500);
    });
  }
};
