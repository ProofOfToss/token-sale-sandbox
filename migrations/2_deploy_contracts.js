var TossToken = artifacts.require("TossToken");
var TossCrowdsale = artifacts.require("TossCrowdsale");

module.exports = function(deployer) {
  deployer.deploy(TossToken, {gasPrice: 0}).then(function() {
    return deployer.deploy(TossCrowdsale, TossToken.address, {gasPrice: 0});
  });
};
