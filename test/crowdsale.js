import expectThrow from './helpers/expectThrow';

const Crowdsale = artifacts.require('./test/TestCrowdsale.sol');
const Token = artifacts.require('./token-sale-contracts/TokenSale/Token/Token.sol');
const Creator = artifacts.require('./token-sale-contracts/TokenSale/Crowdsale/Creator.sol');
const TestCreator = artifacts.require('./token-sale-contracts/TokenSale/Crowdsale/TestCreator.sol');

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

  it('should allow manager to manually stop crowdsale (failed)', async () => {
    const creator = await TestCreator.new();
    const crowdsale = await Crowdsale.new(creator.address);
    await crowdsale.firstMintRound0(100500);

    const token = Token.at(await crowdsale.token());

    const now = Math.floor((new Date()).getTime() / 1000);

    if (!await crowdsale.isInitialized()) {
      await crowdsale.setStartTime(now + 24 * 3600);
      await crowdsale.initialize({from: accounts[2]});
      await crowdsale.setStartTime(now);
    }

    const rate = await crowdsale.rate(); // 10000 ether
    const getTokens = _getTokens.bind(this, rate);

    await crowdsale.setStartTime(now - 7 * 24 * 3600); // Disable time bonus

    const originalBalance = web3.eth.getBalance(accounts[10]);
    const spentEther = web3.toWei(1, 'ether');
    const purchasedTokens = getTokens(spentEther);

    await expectThrow(crowdsale.stop({from: accounts[10]}));

    await crowdsale.buyTokens(accounts[10], {from: accounts[10], value: spentEther});

    assertBNEqual(await token.balanceOf(accounts[10]), purchasedTokens, 'invalid accounts[10] balance');
    assertBNEqual(web3.eth.getBalance(accounts[10]), originalBalance - spentEther, 'invalid accounts[10] eth balance');

    await crowdsale.stop({from: accounts[2]})

    await expectThrow(crowdsale.buyTokens(accounts[10], {from: accounts[10], value: spentEther}));

    await crowdsale.finalize({from: accounts[10]}); // Crowdsale failed anybody can finalize

    await crowdsale.claimRefund({from: accounts[10]});

    assertBNEqual(web3.eth.getBalance(accounts[10]), originalBalance, 'invalid accounts[10] eth balance');
  });

  it('should allow manager to manually stop crowdsale (success)', async () => {
    const creator = await TestCreator.new();
    const crowdsale = await Crowdsale.new(creator.address);
    await crowdsale.firstMintRound0(100500);

    const token = Token.at(await crowdsale.token());

    const now = Math.floor((new Date()).getTime() / 1000);

    if (!await crowdsale.isInitialized()) {
      await crowdsale.setStartTime(now + 24 * 3600);
      await crowdsale.initialize({from: accounts[2]});
      await crowdsale.setStartTime(now);
    }

    const rate = await crowdsale.rate(); // 10000 ether
    const getTokens = _getTokens.bind(this, rate);

    await crowdsale.setStartTime(now - 7 * 24 * 3600); // Disable time bonus

    const originalBalance = web3.eth.getBalance(accounts[10]);
    const spentEther = web3.toWei(1, 'ether');
    await crowdsale.setSoftCap(spentEther);
    const purchasedTokens = getTokens(spentEther);

    await expectThrow(crowdsale.stop({from: accounts[10]}));

    await crowdsale.buyTokens(accounts[10], {from: accounts[10], value: spentEther});

    assertBNEqual(await token.balanceOf(accounts[10]), purchasedTokens, 'invalid accounts[10] balance');
    assertBNEqual(web3.eth.getBalance(accounts[10]), originalBalance - spentEther, 'invalid accounts[10] eth balance');

    await crowdsale.stop({from: accounts[2]})

    await expectThrow(crowdsale.buyTokens(accounts[10], {from: accounts[10], value: spentEther}));

    await expectThrow(crowdsale.finalize({from: accounts[10]})); // Crowdsale successed only manager can finalize
    await crowdsale.finalize({from: accounts[2]});

    await expectThrow(crowdsale.claimRefund({from: accounts[10]}));

    const wallet = '0xd12cFD596279CDb76915827d5039936cc48e2B8D';

    await expectThrow(token.transfer(wallet, 100500, {from: accounts[10]})); // Token is paused

    await crowdsale.setStopTime(now - 60 * 24 * 60 * 60); // Allow users to unpause. Set stop time = now - USER_UNPAUSE_TOKEN_TIMEOUT
    await crowdsale.tokenUnpause({from: accounts[10]}); // Crowdsale successed anybody can unpause

    token.transfer(wallet, 100500, {from: accounts[10]});
    assertBNEqual(await token.balanceOf(wallet), 100500, 'invalid wallet balance');
  });
});
