require('babel-polyfill');

const Token = artifacts.require('./token-sale-contracts/TokenSale/Token/Token.sol');
const PeriodicAllocation = artifacts.require('./test/PeriodicAllocation.sol');

contract('PeriodicAllocation', function (accounts) {

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  before(async () => {
    const token = await Token.deployed();

    await token.setPause(false);
    await token.mint(accounts[0], 10000000000000);
  });

  it('should unlock tokens by equal parts', async () => {

    const now = Math.floor((new Date()).getTime() / 1000);
    const beneficiary = [
      '0xd12cFD596279CDb76915827d5039936cc48e2B8D',
      '0xbd44980Ca3B93Ce93A5C7393F93E6A3dD545EF23'
    ];

    const TOTAL = 1333;
    const SHARE_1 = 33;
    const SHARE_2 = 66;

    const sharePart1 = (step) => Math.round(TOTAL * Math.floor(SHARE_1 / 2 * step) / (SHARE_1 + SHARE_2));
    const sharePart2 = (step) => Math.round(TOTAL * Math.floor(SHARE_2 / 3 * step) / (SHARE_1 + SHARE_2));

    const token = await Token.deployed();
    const allocation = await PeriodicAllocation.new(token.address, now, {from: accounts[0]});
    await token.mint(allocation.address, TOTAL);

    await allocation.addShare(beneficiary[0], SHARE_1, 2, 10 /*seconds*/, {from: accounts[0]});
    await allocation.addShare(beneficiary[1], SHARE_2, 3, 10 /*seconds*/, {from: accounts[0]});

    await allocation.unlockFor(beneficiary[0]);
    await allocation.unlockFor(beneficiary[1]);

    assert.equal(await token.balanceOf(beneficiary[0]), 0, '0 tokens wasn\'t on beneficiary[0]');
    assert.equal(await token.balanceOf(beneficiary[1]), 0, '0 tokens wasn\'t on beneficiary[1]');
    assert.equal(await token.balanceOf(allocation.address), TOTAL, '0 tokens wasn\'t on allocation');

    await wait(10000);
    await token.mint(accounts[0], 1); // mine tokens for adding new block to restrpc

    await allocation.unlockFor(beneficiary[0]);
    await allocation.unlockFor(beneficiary[1]);

    assert.equal(await token.balanceOf(beneficiary[0]), sharePart1(1), 'sharePart1 tokens wasn\'t on beneficiary[0]');
    assert.equal(await token.balanceOf(beneficiary[1]), sharePart2(1), 'sharePart2 tokens wasn\'t on beneficiary[1]');
    assert.equal(await token.balanceOf(allocation.address), TOTAL - (sharePart1(1) + sharePart2(1)), 'TOTAL - (sharePart1 + sharePart2) tokens wasn\'t on allocation');

    await wait(10000);
    await token.mint(accounts[0], 1); // mine tokens for adding new block to restrpc

    await allocation.unlockFor(beneficiary[0]);
    await allocation.unlockFor(beneficiary[1]);
    await allocation.unlockFor(beneficiary[0]); // Repeating unlockFor at same period should not transfer tokens
    await allocation.unlockFor(beneficiary[1]);

    assert.equal(await token.balanceOf(beneficiary[0]), sharePart1(2), '2 * sharePart1 tokens wasn\'t on beneficiary[0]');
    assert.equal(await token.balanceOf(beneficiary[1]), sharePart2(2), '2 * sharePart2 tokens wasn\'t on beneficiary[1]');
    assert.equal(await token.balanceOf(allocation.address), TOTAL - (sharePart1(2) + sharePart2(2)), 'TOTAL - 2 * (sharePart1 + sharePart2) tokens wasn\'t on allocation');

    await wait(10000);
    await token.mint(accounts[0], 1); // mine tokens for adding new block to restrpc

    await allocation.unlockFor(beneficiary[0]);
    await allocation.unlockFor(beneficiary[1]);

    assert.equal(await token.balanceOf(beneficiary[0]), sharePart1(2), '2 * sharePart1 tokens wasn\'t on beneficiary[0]');
    assert.equal(await token.balanceOf(beneficiary[1]), sharePart2(3), '3 * sharePart2 tokens wasn\'t on beneficiary[1]');
    assert.equal(await token.balanceOf(allocation.address), 0, '0 tokens wasn\'t on allocation');
  });

});
