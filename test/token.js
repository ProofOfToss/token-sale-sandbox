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

});
