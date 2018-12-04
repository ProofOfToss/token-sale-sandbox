import expectThrow from './helpers/expectThrow';

const Crowdsale = artifacts.require('./test/TestCrowdsale.sol');
const Token = artifacts.require('./token-sale-contracts/TokenSale/Token/Token.sol');
const Creator = artifacts.require('./token-sale-contracts/TokenSale/Crowdsale/Creator.sol');
const PeriodicAllocation = artifacts.require('./token-sale-contracts/TokenSale/Crowdsale/PeriodicAllocation.sol');
const TestCreator = artifacts.require('./token-sale-contracts/TokenSale/Crowdsale/TestCreator.sol');
const TestAllocationQueue = artifacts.require('./token-sale-contracts/TokenSale/Crowdsale/TestAllocationQueue.sol');

const web3 = Token.web3;

contract('Crowdsale', function(accounts) {

  const _getTokens = (rate, wei) => rate * wei / web3.toWei(1, 'ether');
  const assertBNEqual = (actual, expected, message) => {
    return assert.equal(
      Math.round(actual / web3.toWei(1, 'ether')),
      Math.round(expected / web3.toWei(1, 'ether')),
      message
    );
  };

  it('should have test accounts in wallets', async function() {
    const crowdsale = await Crowdsale.deployed();
    const creator = await Creator.deployed();

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

  it('should add time and volume bonuses', async function() {
    const crowdsale = await Crowdsale.deployed();
    const creator = await Creator.deployed();
    const token = Token.at(await crowdsale.token());

    const now = Math.floor((new Date()).getTime() / 1000);

    if (!await crowdsale.isInitialized()) {
      await crowdsale.setStartTime(now + 24 * 3600);
      await crowdsale.initialize({from: accounts[2]});
      await crowdsale.setStartTime(now);
    }

    let balance = 0;
    assert.equal(parseInt(await token.balanceOf(accounts[10])), 0, '0 tokens wasn\'t on accounts[10]');
    assert.equal(parseInt(await token.freezedTokenOf(accounts[10])), 0, '0 freezed tokens wasn\'t on accounts[10]');

    // min pay: web3.toWei(71, 'finney')
    // value bonus 30%: web3.toWei(71, 'ether')
    // time bonus 15%: 1 day
    // time bonus 10%: 2 days
    // time bonus 5%: 4 days

    const VBValue = web3.toWei(71, 'ether');
    const VBBonus = 1.3;
    const TB1day = 1.15;
    const TB3day = 1.1;
    const TB7day = 1.05;

    const rate = await crowdsale.rate(); // 10000 ether
    const amount = web3.toWei(1, 'ether');
    const getTokens = _getTokens.bind(this, rate);

    await crowdsale.setStartTime(now - 60);

    // Time bonus 1 day
    balance += getTokens(amount) * TB1day;
    await crowdsale.buyTokens(accounts[10], {from: accounts[10], value: amount});

    assertBNEqual(await token.balanceOf(accounts[10]), balance, 'invalid purchase with 1 day time bonus');

    // Maximum of Time bonus 1 day and Volume bonus
    balance += getTokens(VBValue) * VBBonus;
    await crowdsale.buyTokens(accounts[10], {from: accounts[10], value: VBValue});

    assertBNEqual(await token.balanceOf(accounts[10]), balance, 'invalid purchase with 1 day time bonus and volume bonus');

    await crowdsale.setStartTime(now - 24 * 3600);

    // Time bonus 3 day
    balance += getTokens(amount) * TB3day;
    await crowdsale.buyTokens(accounts[10], {from: accounts[10], value: amount});
    assertBNEqual(await token.balanceOf(accounts[10]), balance, 'invalid purchase with 2 days time bonus');

    await crowdsale.setStartTime(now - 3 * 24 * 3600);

    // Time bonus 7 day
    balance += getTokens(amount) * TB7day;
    await crowdsale.buyTokens(accounts[10], {from: accounts[10], value: amount});
    assertBNEqual(await token.balanceOf(accounts[10]), balance, 'invalid purchase with 4 days time bonus');

    await crowdsale.setStartTime(now - 7 * 24 * 3600);

    // No bonus
    balance += getTokens(amount);
    await crowdsale.buyTokens(accounts[10], {from: accounts[10], value: amount});
    assertBNEqual(await token.balanceOf(accounts[10]), balance, 'invalid purchase without bonus');

    // Volume bonus
    balance += getTokens(VBValue) * VBBonus;
    await crowdsale.buyTokens(accounts[10], {from: accounts[10], value: VBValue});
    assertBNEqual(await token.balanceOf(accounts[10]), balance, 'invalid purchase with volume bonus');

    assert.equal(parseInt(await token.freezedTokenOf(accounts[10])), 0, '0 freezed tokens wasn\'t on accounts[10]');
  });

  it('should mine tokens for system wallets', async function() {
    const creator = await TestCreator.new();
    const crowdsale = await Crowdsale.new(creator.address);
    await crowdsale.firstMintRound0(100500);

    const token = Token.at(await crowdsale.token());
    const allocationQueue = TestAllocationQueue.at(await crowdsale.allocationQueue());
    const allocation = PeriodicAllocation.at(await crowdsale.allocation());

    const now = Math.floor((new Date()).getTime() / 1000);

    const monthSeconds = 30 * 24 * 60 * 60;
    const yearSeconds = 366 * 24 * 60 * 60;

    const oneMonth = Math.floor((now + monthSeconds) / monthSeconds);
    const twoMonth = Math.floor((now + monthSeconds * 2) / monthSeconds);
    const sixMonth = Math.floor((now + monthSeconds * 6) / monthSeconds);
    const twelveMonth = Math.floor((now + monthSeconds * 12) / monthSeconds);

    if (!await crowdsale.isInitialized()) {
      await crowdsale.setStartTime(now + 24 * 3600);
      await crowdsale.initialize({from: accounts[2]});
      await crowdsale.setStartTime(now);
    }

    const wallets = [];

    for (let i = 0; i < 12; i++) {
      wallets[i] = await crowdsale.wallets(i);
    }

    const rate = await crowdsale.rate(); // 10000 ether
    const getTokens = _getTokens.bind(this, rate);

    await crowdsale.setStartTime(now - 7 * 24 * 3600); // Disable time bonus

    const spentEther = web3.toWei(1, 'ether');
    const purchasedTokens = getTokens(spentEther);
    const totalTokens = purchasedTokens * 2;

    assert.equal(parseInt(await token.balanceOf(accounts[10])), 0, '0 tokens wasn\'t on accounts[10]');

    await crowdsale.buyTokens(accounts[10], {from: accounts[10], value: spentEther});

    assertBNEqual(await token.balanceOf(accounts[10]), purchasedTokens, 'invalid accounts[10] balance');
    assertBNEqual(await token.balanceOf(allocationQueue.address), totalTokens * 0.43, 'invalid allocationQueue balance');
    assertBNEqual(parseInt(await token.freezedTokenOf(accounts[10])), 0, 'invalid accounts[10] freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(allocationQueue.address)), 0, 'invalid allocationQueue freezed tokens');

    // 4% – tokens for Airdrop, freeze 2 month
    assertBNEqual(await allocationQueue.queue(wallets[11], twoMonth), totalTokens * 0.04, 'invalid Airdrop balance');

    // 7% - tokens for Players and Investors
    assertBNEqual(await token.balanceOf(wallets[10]), 0, 'invalid Players and Investors balance');
    assertBNEqual(await token.balanceOf(allocation.address), totalTokens * 0.07, 'invalid Players and Investors allocation balance');

    // 4% - tokens to Company (White List) wallet, freeze 1 month
    assertBNEqual(await allocationQueue.queue(wallets[5], oneMonth), totalTokens * 0.04, 'invalid Company (White List) balance');

    // 7% - tokens to Team wallet, freeze 50% 6 month, 50% 12 month
    assertBNEqual(await allocationQueue.queue(wallets[6], sixMonth), totalTokens * 0.07 / 2, 'invalid Team balance');
    assertBNEqual(await allocationQueue.queue(wallets[6], twelveMonth), totalTokens * 0.07 / 2, 'invalid Team balance');

    // 1% - tokens to Bounty wallet, freeze 2 month
    assertBNEqual(await allocationQueue.queue(wallets[4], twoMonth), totalTokens * 0.01, 'invalid Bounty balance');

    // 15% - tokens to Founders wallet, freeze 50% 6 month, 50% 12 month
    assertBNEqual(await allocationQueue.queue(wallets[7], sixMonth), totalTokens * 0.15 / 2, 'invalid Founders balance');
    assertBNEqual(await allocationQueue.queue(wallets[7], twelveMonth), totalTokens * 0.15 / 2, 'invalid Founders balance');

    // 12% - tokens to Fund wallet, freeze 50% 2 month, 50% 12 month
    assertBNEqual(await allocationQueue.queue(wallets[8], twoMonth), totalTokens * 0.12 / 2, 'invalid Fund balance');
    assertBNEqual(await allocationQueue.queue(wallets[8], twelveMonth), totalTokens * 0.12 / 2, 'invalid Fund balance');

    const accountNames = {
      11: 'Airdrop',
      5: 'Company (White List)',
      6: 'Team',
      4: 'Bounty',
      7: 'Founders',
      8: 'Fund',
    };

    const nowBalances = [
      {account: 11, balance: 0}, // Airdrop
      {account:  5, balance: 0}, // Company (White List)
      {account:  6, balance: 0}, // Team
      {account:  4, balance: 0}, // Bounty
      {account:  7, balance: 0}, // Founders
      {account:  8, balance: 0}  // Fund
    ];

    const oneMonthBalances = [
      {account: 11, balance: 0}, // Airdrop
      {account:  5, balance: totalTokens * 0.04}, // Company (White List)
      {account:  6, balance: 0}, // Team
      {account:  4, balance: 0}, // Bounty
      {account:  7, balance: 0}, // Founders
      {account:  8, balance: 0}  // Fund
    ];

    const twoMonthBalances = [
      {account: 11, balance: totalTokens * 0.04}, // Airdrop
      {account:  5, balance: totalTokens * 0.04}, // Company (White List)
      {account:  6, balance: 0}, // Team
      {account:  4, balance: totalTokens * 0.01}, // Bounty
      {account:  7, balance: 0}, // Founders
      {account:  8, balance: totalTokens * 0.12 / 2}  // Fund
    ];

    const sixMonthBalances = [
      {account: 11, balance: totalTokens * 0.04}, // Airdrop
      {account:  5, balance: totalTokens * 0.04}, // Company (White List)
      {account:  6, balance: totalTokens * 0.07 / 2}, // Team
      {account:  4, balance: totalTokens * 0.01}, // Bounty
      {account:  7, balance: totalTokens * 0.15 / 2}, // Founders
      {account:  8, balance: totalTokens * 0.12 / 2}  // Fund
    ];

    const twelveMonthBalances = [
      {account: 11, balance: totalTokens * 0.04}, // Airdrop
      {account:  5, balance: totalTokens * 0.04}, // Company (White List)
      {account:  6, balance: totalTokens * 0.07}, // Team
      {account:  4, balance: totalTokens * 0.01}, // Bounty
      {account:  7, balance: totalTokens * 0.15}, // Founders
      {account:  8, balance: totalTokens * 0.12}  // Fund
    ];

    for (let i = 0; i < nowBalances.length; i++) {
      const accountIndex = nowBalances[i].account;
      await allocationQueue.unlockFor(wallets[accountIndex]);

        assertBNEqual(await token.balanceOf(wallets[accountIndex]), nowBalances[i].balance, `invalid ${accountNames} now balance`);
    }

    await allocationQueue.setDateOffset(monthSeconds);

    for (let i = 0; i < oneMonthBalances.length; i++) {
      const accountIndex = oneMonthBalances[i].account;
      await allocationQueue.unlockFor(wallets[accountIndex]);

        assertBNEqual(await token.balanceOf(wallets[accountIndex]), oneMonthBalances[i].balance, `invalid ${accountNames} one month balance`);
    }

    await allocationQueue.setDateOffset(monthSeconds * 2);

    for (let i = 0; i < twoMonthBalances.length; i++) {
      const accountIndex = twoMonthBalances[i].account;
      await allocationQueue.unlockFor(wallets[accountIndex]);

      assertBNEqual(await token.balanceOf(wallets[accountIndex]), twoMonthBalances[i].balance, `invalid ${accountNames} two month balance`);
    }

    await allocationQueue.setDateOffset(monthSeconds * 6);

    for (let i = 0; i < sixMonthBalances.length; i++) {
      const accountIndex = sixMonthBalances[i].account;
      await allocationQueue.unlockFor(wallets[accountIndex]);

      assertBNEqual(await token.balanceOf(wallets[accountIndex]), sixMonthBalances[i].balance, `invalid ${accountNames} six month balance`);
    }

    await allocationQueue.setDateOffset(yearSeconds);

    for (let i = 0; i < twelveMonthBalances.length; i++) {
      const accountIndex = twelveMonthBalances[i].account;
      await allocationQueue.unlockFor(wallets[accountIndex]);

        assertBNEqual(await token.balanceOf(wallets[accountIndex]), twelveMonthBalances[i].balance, `invalid ${accountNames} twelve month balance`);
    }

    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[11])), 0, 'invalid Airdrop freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[5])), 0, 'invalid Company (White List) freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[6])), 0, 'invalid Team freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[4])), 0, 'invalid Bounty freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[7])), 0, 'invalid Founders freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[8])), 0, 'invalid Fund freezed tokens');
  });
});
