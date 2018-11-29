import expectThrow from './helpers/expectThrow';

const Token = artifacts.require('./token-sale-contracts/TokenSale/Token/Token.sol');
const Crowdsale = artifacts.require('./test/TestCrowdsale.sol');

contract('Token', function (accounts) {

  before(async () => {
    const token = await Token.deployed();

    await token.setPause(false);
    await token.mint(accounts[0], 10000000000000);
  });

  it('should add initial balance to msg.sender', async () => {
    const token = await Token.deployed();
    const balance = await token.balanceOf(accounts[0]);
    assert.equal(balance, 10000000000000, '1000000000 tokens wasn\'t on balance');
  });

  it('should transfer tokens between accounts', async () => {
    const token = await Token.deployed();

    //Transfer from accounts[0] to accounts[1]
    await token.transfer(accounts[1], 5000000000000, {from: accounts[0]});
    assert.equal(await token.balanceOf(accounts[1], {from: accounts[1]}), 5000000000000,
      '5000000000000 tokens wasn\'t on balance');

    //Transfer from accounts[1] to accounts[0]
    await token.transfer(accounts[0], 5000000000000, {from: accounts[1]});
    assert.equal(await token.balanceOf(accounts[1], {from: accounts[1]}), 0,
      '0 tokens wasn\'t on balance');
  });

  it('should allow manager to burn tokens', async () => {

    const token = await Token.deployed();

    assert.equal(await token.balanceOf(accounts[10], {from: accounts[10]}), 0, '0 tokens wasn\'t on accounts[10]');

    await token.mint(accounts[10], 1000);

    assert.equal(await token.balanceOf(accounts[10], {from: accounts[10]}), 1000, '1000 tokens wasn\'t on accounts[10] after mint');

    await expectThrow(token.burn(accounts[10], 500, {from: accounts[1]})); // Only owner can burn tokens
    await token.burn(accounts[10], 500, {from: accounts[0]});

    assert.equal(await token.balanceOf(accounts[10], {from: accounts[10]}), 500, '500 tokens wasn\'t on accounts[10] after burn');

    await token.burn(accounts[10], 500, {from: accounts[0]});

    assert.equal(await token.balanceOf(accounts[10], {from: accounts[10]}), 0, '0 tokens wasn\'t on accounts[10] after burn');
  });

  it('should not allow to burn tokens in unburnable wallets', async () => {

    const crowdsale = await Crowdsale.deployed();
    const token = await Token.at(await crowdsale.token());

    assert.equal(await token.balanceOf(accounts[10], {from: accounts[10]}), 0, '0 tokens wasn\'t on accounts[10]');

    await crowdsale.mint(accounts[10], 1500);
    await crowdsale.burn(accounts[10], 500, {from: accounts[0]});

    assert.equal(await token.balanceOf(accounts[10], {from: accounts[10]}), 1000, '1000 tokens wasn\'t on accounts[10] after mint');

    await expectThrow(token.setUnburnableWallet(accounts[10], {from: accounts[1]})); // Only manager can set unburnable wallets
    await token.setUnburnableWallet(accounts[10], {from: accounts[2]});

    await expectThrow(crowdsale.burn(accounts[10], 500, {from: accounts[0]}));

    assert.equal(await token.balanceOf(accounts[10], {from: accounts[10]}), 1000, '1000 tokens wasn\'t on accounts[10]');
  });

  it('should not allow manager to grant and deny users to set unburnable wallets', async () => {

    const crowdsale = await Crowdsale.deployed();
    const token = await Token.at(await crowdsale.token());

    assert.equal(await token.balanceOf(accounts[11], {from: accounts[11]}), 0, '0 tokens wasn\'t on accounts[11]');

    await crowdsale.mint(accounts[11], 1500);
    await crowdsale.burn(accounts[11], 500, {from: accounts[0]});

    assert.equal(await token.balanceOf(accounts[11], {from: accounts[11]}), 1000, '1000 tokens wasn\'t on accounts[11] after mint');

    await expectThrow(token.setUnburnableWallet(accounts[11], {from: accounts[1]}));
    await expectThrow(token.grantToSetUnburnableWallet(accounts[11], true, {from: accounts[1]}));

    await token.grantToSetUnburnableWallet(accounts[1], true, {from: accounts[2]});
    await token.setUnburnableWallet(accounts[11], {from: accounts[1]});

    await token.grantToSetUnburnableWallet(accounts[1], false, {from: accounts[2]});
    await expectThrow(token.setUnburnableWallet(accounts[11], {from: accounts[1]}));

    await expectThrow(crowdsale.burn(accounts[11], 500, {from: accounts[0]}));

    assert.equal(await token.balanceOf(accounts[11], {from: accounts[11]}), 1000, '1000 tokens wasn\'t on accounts[10]');
  });

  it('should not allow massburn in unburnable wallets', async () => {

    const crowdsale = await Crowdsale.deployed();
    const token = await Token.at(await crowdsale.token());

    const tokenHolders = [
      '0xd12cFD596279CDb76915827d5039936cc48e2B8D',
      '0xbd44980Ca3B93Ce93A5C7393F93E6A3dD545EF23',
      '0xABCab1eBa2AA079a7E13102AD76Ffb235441b6c8'
    ];

    await crowdsale.mint(tokenHolders[0], 1500);
    await crowdsale.mint(tokenHolders[1], 1500);
    await crowdsale.mint(tokenHolders[2], 1500);
    await crowdsale.massBurnTokens(tokenHolders, [500, 500, 500], {from: accounts[2]});

    assert.equal(await token.balanceOf(tokenHolders[0]), 1000, '1000 tokens wasn\'t on tokenHolders[0]');
    assert.equal(await token.balanceOf(tokenHolders[1]), 1000, '1000 tokens wasn\'t on tokenHolders[1]');
    assert.equal(await token.balanceOf(tokenHolders[2]), 1000, '1000 tokens wasn\'t on tokenHolders[2]');

    await token.setUnburnableWallet(tokenHolders[0], {from: accounts[2]});

    await expectThrow(crowdsale.massBurnTokens(tokenHolders, [500, 500, 500], {from: accounts[2]}));

    assert.equal(await token.balanceOf(tokenHolders[0]), 1000, '1000 tokens wasn\'t on tokenHolders[0]');
    assert.equal(await token.balanceOf(tokenHolders[1]), 1000, '1000 tokens wasn\'t on tokenHolders[1]');
    assert.equal(await token.balanceOf(tokenHolders[2]), 1000, '1000 tokens wasn\'t on tokenHolders[2]');

    await crowdsale.massBurnTokens([tokenHolders[1], tokenHolders[2]], [1000, 1000], {from: accounts[2]});

    assert.equal(await token.balanceOf(tokenHolders[1]), 0, '0 tokens wasn\'t on tokenHolders[1]');
    assert.equal(await token.balanceOf(tokenHolders[2]), 0, '0 tokens wasn\'t on tokenHolders[2]');
  });

});
