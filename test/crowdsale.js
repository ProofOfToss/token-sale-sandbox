import expectThrow from './helpers/expectThrow';

var Crowdsale = artifacts.require('./test/TestCrowdsale.sol');
var Token = artifacts.require('./token-sale-contracts/TokenSale/Token/Token.sol');
var Creator = artifacts.require('./token-sale-contracts/TokenSale/Crowdsale/Creator.sol');

contract('Crowdsale', function(accounts) {

  it('should have test accounts in wallets', async function() {
    let crowdsale = await Crowdsale.deployed();
    let creator = await Creator.deployed();

    assert.equal(await crowdsale.wallets(0), accounts[0], 'Invalid Beneficiary address');
    assert.equal(await crowdsale.wallets(1), accounts[1], 'Invalid Accountant address');
    assert.equal(await crowdsale.wallets(2), accounts[2], 'Invalid Manager address');
    assert.equal(await crowdsale.wallets(3), accounts[3], 'Invalid Observer address');
    assert.equal(await crowdsale.wallets(4), accounts[4], 'Invalid Bounty  address');
    assert.equal(await crowdsale.wallets(5), accounts[5], 'Invalid Company, White list address');
    assert.equal(await crowdsale.wallets(6), accounts[6], 'Invalid Team address');
    assert.equal(await crowdsale.wallets(7), accounts[7], 'Invalid Founders address');
    assert.equal(await crowdsale.wallets(8), accounts[8], 'Invalid Fund address');
    assert.equal(await crowdsale.wallets(9), accounts[9], 'Invalid Fees address');
  });

});
