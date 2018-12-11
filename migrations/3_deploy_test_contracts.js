var Token = artifacts.require("Token");
var TestCreator = artifacts.require("TestCreator");
var TestCrowdsale = artifacts.require("TestCrowdsale");

var argv = require('yargs-parser')(process.argv.slice(2));

module.exports = function(deployer) {
  if (argv._ && argv._[0] === 'test') {
    deployer.deploy(Token);
    deployer.deploy(TestCreator).then((creator) => {
      return deployer.deploy(TestCrowdsale, creator.address).then((crowdsale) => {
        return crowdsale.firstMintRound0(100500);
      });
    });
  }
};
