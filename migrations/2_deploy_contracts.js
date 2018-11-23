var Creator = artifacts.require("Creator");
var Crowdsale = artifacts.require("Crowdsale");

module.exports = function(deployer) {
  deployer.deploy(Creator, {gasPrice: 0}).then(function() {
    return deployer.deploy(Crowdsale, Creator.address, {gasPrice: 0});
  });
};
