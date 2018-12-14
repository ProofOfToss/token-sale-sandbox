import expectThrow from './helpers/expectThrow';

const Crowdsale = artifacts.require('./test/TestCrowdsale.sol');
const Token = artifacts.require('./token-sale-contracts/TokenSale/Token/Token.sol');
const PeriodicAllocation = artifacts.require('./token-sale-contracts/TokenSale/Crowdsale/PeriodicAllocation.sol');
const TestCreator = artifacts.require('./token-sale-contracts/TokenSale/Crowdsale/TestCreator.sol');
const TestAllocationQueue = artifacts.require('./token-sale-contracts/TokenSale/Crowdsale/TestAllocationQueue.sol');

const web3 = Token.web3;

contract('AllocationQueue', function(accounts) {

  const _getTokens = (rate, wei) => rate * wei / web3.toWei(1, 'ether');
  const assertBNEqual = (actual, expected, message) => {
    return assert.equal(
      Math.round(actual / web3.toWei(1, 'ether')),
      Math.round(expected / web3.toWei(1, 'ether')),
      message
    );
  };



  it('should determine month for dates', async function() {
    const token = await Token.deployed();
    const allocationQueue = await TestAllocationQueue.new(token.address);

    const assertDateMonth = async (date, expected) => {
      return assert.equal(parseInt(await allocationQueue.groupDatesPublic(Math.floor(date.getTime() / 1000))), expected, 'Invalid month for date ' + date.toISOString());
    };

    for (let i = 1970; i < 2100; i++) {
      await assertDateMonth(new Date(`${i}-01-01T00:00:00.000Z`), i * 100 + 1);
      await assertDateMonth(new Date(`${i}-12-31T23:59:59.999Z`), i * 100 + 12);
    }

    for (let i = 2018; i <= 2021; i++) {
      for (let j = 1; j <= 12; j++) {
        let day = 31;
        if (j === 4 || j === 6 || j === 9 || j === 11) {
          day = 30;
        } else if (j === 2) {
          day = i === 2020 ? 29 : 28;
        }

        await assertDateMonth(new Date(`${i}-${j < 10 ? '0' + j : j}-01T00:00:00.000Z`), i * 100 + j);
        await assertDateMonth(new Date(`${i}-${j < 10 ? '0' + j : j}-${day}T23:59:59.999Z`), i * 100 + j);
      }
    }
  });

  it('should mine tokens for system wallets', async function() {
    const creator = await TestCreator.new();
    const crowdsale = await Crowdsale.new(creator.address);

    const rate = await crowdsale.rate(); // 10000 ether
    const getTokens = _getTokens.bind(this, rate);
    const spentEther = web3.toWei(1, 'ether');
    const purchasedTokens = getTokens(spentEther);
    const totalTokens = purchasedTokens * 2;

    await crowdsale.privateMint(purchasedTokens / 2);

    const token = Token.at(await crowdsale.token());
    const allocationQueue = TestAllocationQueue.at(await crowdsale.allocationQueue());
    const allocation = PeriodicAllocation.at(await crowdsale.allocation());

    const now = Math.floor((new Date()).getTime() / 1000);

    const monthSeconds = 30 * 24 * 60 * 60;
    const yearSeconds = 366 * 24 * 60 * 60;

    const formatDate = (d) => d.getUTCFullYear() * 100 + (d.getUTCMonth() + 1);

    const oneMonth = formatDate(new Date((now + monthSeconds) * 1000));
    const twoMonth = formatDate(new Date((now + monthSeconds * 2) * 1000));
    const sixMonth = formatDate(new Date((now + monthSeconds * 6) * 1000));
    const twelveMonth = formatDate(new Date((now + monthSeconds * 12) * 1000));

    if (!await crowdsale.isInitialized()) {
      await crowdsale.setStartTime(now + 24 * 3600);
      await crowdsale.initialize({from: accounts[2]});
      await crowdsale.setStartTime(now);
    }

    const wallets = [];
    for (let i = 0; i < 13; i++) {
      wallets[i] = await crowdsale.wallets(i);
    }

    await crowdsale.setStartTime(now - 7 * 24 * 3600); // Disable time bonus

    assert.equal(parseInt(await token.balanceOf(accounts[10])), 0, '0 tokens wasn\'t on accounts[10]');

    await crowdsale.buyTokens(accounts[10], {from: accounts[10], value: spentEther / 2});

    assertBNEqual(await crowdsale.ethWeiRaised(), spentEther, 'invalid Accountant balance');
    assertBNEqual(await token.balanceOf(accounts[1]), purchasedTokens / 2, 'invalid Accountant balance');
    assertBNEqual(await token.balanceOf(accounts[10]), purchasedTokens / 2, 'invalid accounts[10] balance');
    assertBNEqual(await token.balanceOf(allocationQueue.address), totalTokens * 0.39, 'invalid allocationQueue balance');
    assertBNEqual(parseInt(await token.freezedTokenOf(accounts[10])), 0, 'invalid accounts[10] freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(allocationQueue.address)), 0, 'invalid allocationQueue freezed tokens');

    // 4% – tokens for Airdrop, freeze 2 month
    assertBNEqual(await allocationQueue.queue(wallets[11], twoMonth), totalTokens * 0.04, 'invalid Airdrop balance');

    // 7% - tokens for Players and Investors
    assertBNEqual(await token.balanceOf(wallets[10]), 0, 'invalid Players and Investors balance');
    assertBNEqual(await token.balanceOf(allocation.address), totalTokens * 0.07, 'invalid Players and Investors allocation balance');

    // 4% - tokens to Advisers wallet, freeze 1 month
    assertBNEqual(await allocationQueue.queue(wallets[5], oneMonth), totalTokens * 0.04, 'invalid Advisers balance');

    // 7% - tokens to Team wallet, freeze 50% 6 month, 50% 12 month
    assertBNEqual(await allocationQueue.queue(wallets[6], sixMonth), totalTokens * 0.07 / 2, 'invalid Team balance');
    assertBNEqual(await allocationQueue.queue(wallets[6], twelveMonth), totalTokens * 0.07 / 2, 'invalid Team balance');

    // 1% - tokens to Bounty wallet, freeze 2 month
    assertBNEqual(await allocationQueue.queue(wallets[4], twoMonth), totalTokens * 0.01, 'invalid Bounty balance');

    // 11% - tokens to Founders wallet, freeze 50% 6 month, 50% 12 month
    assertBNEqual(await allocationQueue.queue(wallets[7], sixMonth), totalTokens * 0.11 / 2, 'invalid Founders balance');
    assertBNEqual(await allocationQueue.queue(wallets[7], twelveMonth), totalTokens * 0.11 / 2, 'invalid Founders balance');

    // 12% - tokens to Fund wallet, freeze 50% 2 month, 50% 12 month
    assertBNEqual(await allocationQueue.queue(wallets[8], twoMonth), totalTokens * 0.12 / 2, 'invalid Fund balance');
    assertBNEqual(await allocationQueue.queue(wallets[8], twelveMonth), totalTokens * 0.12 / 2, 'invalid Fund balance');

    // 4% – tokens to Referrals wallet, no freeze
    assertBNEqual(await token.balanceOf(wallets[12]), totalTokens * 0.04, 'invalid Referrals balance');

    const accountNames = {
      11: 'Airdrop',
      5: 'Advisers',
      6: 'Team',
      4: 'Bounty',
      7: 'Founders',
      8: 'Fund',
    };

    const nowBalances = [
      {account: 11, balance: 0}, // Airdrop
      {account:  5, balance: 0}, // Advisers
      {account:  6, balance: 0}, // Team
      {account:  4, balance: 0}, // Bounty
      {account:  7, balance: 0}, // Founders
      {account:  8, balance: 0} // Fund
    ];

    const oneMonthBalances = [
      {account: 11, balance: 0}, // Airdrop
      {account:  5, balance: totalTokens * 0.04}, // Advisers
      {account:  6, balance: 0}, // Team
      {account:  4, balance: 0}, // Bounty
      {account:  7, balance: 0}, // Founders
      {account:  8, balance: 0}  // Fund
    ];

    const twoMonthBalances = [
      {account: 11, balance: totalTokens * 0.04}, // Airdrop
      {account:  5, balance: totalTokens * 0.04}, // Advisers
      {account:  6, balance: 0}, // Team
      {account:  4, balance: totalTokens * 0.01}, // Bounty
      {account:  7, balance: 0}, // Founders
      {account:  8, balance: totalTokens * 0.12 / 2} // Fund
    ];

    const sixMonthBalances = [
      {account: 11, balance: totalTokens * 0.04}, // Airdrop
      {account:  5, balance: totalTokens * 0.04}, // Advisers
      {account:  6, balance: totalTokens * 0.07 / 2}, // Team
      {account:  4, balance: totalTokens * 0.01}, // Bounty
      {account:  7, balance: totalTokens * 0.11 / 2}, // Founders
      {account:  8, balance: totalTokens * 0.12 / 2}  // Fund
    ];

    const twelveMonthBalances = [
      {account: 11, balance: totalTokens * 0.04}, // Airdrop
      {account:  5, balance: totalTokens * 0.04}, // Advisers
      {account:  6, balance: totalTokens * 0.07}, // Team
      {account:  4, balance: totalTokens * 0.01}, // Bounty
      {account:  7, balance: totalTokens * 0.11}, // Founders
      {account:  8, balance: totalTokens * 0.12}  // Fund
    ];

    for (let i = 0; i < nowBalances.length; i++) {
      const accountIndex = nowBalances[i].account;
      await allocationQueue.unlockFor(wallets[accountIndex], now);
      await expectThrow(allocationQueue.unlockFor(wallets[accountIndex], now + monthSeconds));

      assertBNEqual(await token.balanceOf(wallets[accountIndex]), nowBalances[i].balance, `invalid ${accountNames[accountIndex]} now balance`);
    }

    await allocationQueue.setDateOffset(monthSeconds);

    for (let i = 0; i < oneMonthBalances.length; i++) {
      const accountIndex = oneMonthBalances[i].account;
      await allocationQueue.unlockFor(wallets[accountIndex], now);

      assertBNEqual(await token.balanceOf(wallets[accountIndex]), oneMonthBalances[i].balance, `invalid ${accountNames[accountIndex]} one month balance`);
    }

    await allocationQueue.setDateOffset(monthSeconds * 2);

    for (let i = 0; i < twoMonthBalances.length; i++) {
      const accountIndex = twoMonthBalances[i].account;
      await allocationQueue.unlockFor(wallets[accountIndex], now);

      assertBNEqual(await token.balanceOf(wallets[accountIndex]), twoMonthBalances[i].balance, `invalid ${accountNames[accountIndex]} two month balance`);
    }

    await allocationQueue.setDateOffset(monthSeconds * 6);

    for (let i = 0; i < sixMonthBalances.length; i++) {
      const accountIndex = sixMonthBalances[i].account;
      await allocationQueue.unlockFor(wallets[accountIndex], now);

      assertBNEqual(await token.balanceOf(wallets[accountIndex]), sixMonthBalances[i].balance, `invalid ${accountNames[accountIndex]} six month balance`);
    }

    await allocationQueue.setDateOffset(yearSeconds);

    for (let i = 0; i < twelveMonthBalances.length; i++) {
      const accountIndex = twelveMonthBalances[i].account;
      await allocationQueue.unlockFor(wallets[accountIndex], now);

      assertBNEqual(await token.balanceOf(wallets[accountIndex]), twelveMonthBalances[i].balance, `invalid ${accountNames[accountIndex]} twelve month balance`);
    }

    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[11])), 0, 'invalid Airdrop freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[5])), 0, 'invalid Advisers freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[6])), 0, 'invalid Team freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[4])), 0, 'invalid Bounty freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[7])), 0, 'invalid Founders freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[8])), 0, 'invalid Fund freezed tokens');
    assertBNEqual(parseInt(await token.freezedTokenOf(wallets[12])), 0, 'invalid Referrals freezed tokens');
  });
});
