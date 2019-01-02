// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import crowdsale_artifacts from '../../build/contracts/TestCrowdsale.json'
import token_artifacts from '../../build/contracts/Token.json'
import allocation_queue_artifacts from '../../build/contracts/TestAllocationQueue.json'
import periodic_allocation_artifacts from '../../build/contracts/PeriodicAllocation.json'

// Token is our usable abstraction, which we'll use through the code below.
var Crowdsale = contract(crowdsale_artifacts);
var Token = contract(token_artifacts);
var AllocationQueue = contract(allocation_queue_artifacts);
var PeriodicAllocation = contract(periodic_allocation_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;
var crowdsaleInfoFetched = false;
var customWeb3;

window.App = {
  start: function() {
    var self = this;

    // Bootstrap the Token abstraction for Use.
    Crowdsale.setProvider(web3.currentProvider);
    Token.setProvider(web3.currentProvider);
    PeriodicAllocation.setProvider(web3.currentProvider);
    AllocationQueue.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];

      self.refreshBalance();
      self.listenToActions();
      self.listenToPurchaseEvents();
      self.getBalances();

      setInterval(() => self.showCrowdsaleInfo(), 5000);
      setInterval(() => self.getBalances(), 5000);
      setInterval(() => {
        var now = Math.floor((new Date()).getTime() / 1000);
        var monthSeconds = 30 * 24 * 60 * 60;
        var yearSeconds = 366 * 24 * 60 * 60;

        $('.now').html(now);
        $('.now-plus-180').html(now + 180);
        $('.now-plus-300').html(now + 300);
        $('.now-plus-600').html(now + 600);

        $('.now-plus-1m').html(now + monthSeconds);
        $('.now-plus-2m').html(now + monthSeconds * 2);
        $('.now-plus-6m').html(now + monthSeconds * 6);
        $('.now-plus-12m').html(now + yearSeconds);

      }, 5000);
    });
  },


  listenToPurchaseEvents: async function () {
    // create a new web3 objects, because the one which comes from MetaMask has problems with events litening
    customWeb3 = new Web3(web3.currentProvider);

    var Crowdsale2 = contract(crowdsale_artifacts);
    Crowdsale2.setProvider(customWeb3.currentProvider);

    var crowdsale = await Crowdsale.deployed();
    var tokenPurchaseEvent = crowdsale.TokenPurchase({}, {fromBlock: 0, toBlock: 'latest'});
    var $purchaseContainer = $('.js-crowdsale-purchases');

    tokenPurchaseEvent.watch(function(error, result) {
      let e = result.args;
      let html = '<tr>';
      html += '<td>' + e.purchaser + '</td>';
      html += '<td>' + e.beneficiary + '</td>';
      html += '<td>' + e.value.toNumber() / 10**18  + '</td>';
      html += '<td>' + e.amount.toNumber() / 10**18 + '</td>';
      html += '</tr>';

      $purchaseContainer.append($(html));
    });

    var token = Token.at(await crowdsale.token());

    var tokenTransferEvent = token.Transfer({}, {fromBlock: 0, toBlock: 'latest'});
    var $transferContainer = $('.js-token-transfers');

    tokenTransferEvent.watch(function(error, result) {
      let e = result.args;
      let html = '<tr>';
      html += '<td>' + e.from + '</td>';
      html += '<td>' + e.to + '</td>';
      html += '<td>' + e.value.toNumber() / 10**18 + '</td>';
      html += '</tr>';

      $transferContainer.append($(html));
    });
  },


  collectBonusData: function (selectorPrefix) {
    var bonuses = {
      value: [],
      procent: []
    };

    $('.' + selectorPrefix + '-value').each(function () {
      if ($(this).val() != '') {
        bonuses.value[parseInt($(this).data('bonus'), 10)] = parseInt($(this).val(), 10);
      }
    });

    $('.' + selectorPrefix + '-procent').each(function () {
      if ($(this).val() != '') {
        bonuses.procent[parseInt($(this).data('bonus'), 10)] = parseInt($(this).val(), 10);
      }
    });

    return bonuses;
  },

  collectProfitData: function (selectorPrefix) {
    var profits = {
      duration: [],
      procent: []
    };

    $('.' + selectorPrefix + '-pduration').each(function () {
      if ($(this).val() != '') {
        profits.duration[parseInt($(this).data('profit'), 10)] = parseInt($(this).val(), 10);
      }
    });

    $('.' + selectorPrefix + '-pprocent').each(function () {
      if ($(this).val() != '') {
        profits.procent[parseInt($(this).data('profit'), 10)] = parseInt($(this).val(), 10);
      }
    });

    return profits;
  },


  listenToActions: async function () {
    var crowdsale = await Crowdsale.deployed();
    var from = {from: web3.eth.coinbase};

    var allocation = PeriodicAllocation.at(await crowdsale.allocation());
    var allocationQueue = AllocationQueue.at(await crowdsale.allocationQueue());

    window.allocationQueue = allocationQueue;

    $('.js-cs-actions-change-period').click(function () {
      var startTime = parseInt($('.js-cs-actions-change-period-start-time').val(), 10);
      var stopTime = parseInt($('.js-cs-actions-change-period-stop-time').val(), 10);

      console.log(startTime, stopTime, from);
      crowdsale.setStartTime(startTime, from);
      crowdsale.setStopTime(stopTime, from);
    });

    $('.js-cs-actions-setup').click(() => {
      var bonuses = this.collectBonusData('js-cs-actions-setup');
      var profits = this.collectProfitData('js-cs-actions-setup');
      var startTime = parseInt($('.js-cs-actions-setup-start-time').val(), 10);
      var stopTime = parseInt($('.js-cs-actions-setup-stop-time').val(), 10);
      var softCap = parseInt($('.js-cs-actions-setup-soft-cap').val(), 10);
      var hardCap = parseInt($('.js-cs-actions-setup-hard-cap').val(), 10);
      var rate = parseInt($('.js-cs-actions-setup-rate').val(), 10);
      var overLimit = parseInt($('.js-cs-actions-setup-over-limit').val(), 10);
      var maxAllProfit = parseInt($('.js-cs-actions-setup-max-all-profit').val(), 10);
      var minPay = parseInt($('.js-cs-actions-setup-min-pay').val(), 10);

      console.log('Setup:');
      console.log(
        startTime, softCap, hardCap,
        rate, 0,
        maxAllProfit, overLimit, minPay,
        profits.duration, profits.procent, bonuses.value, bonuses.procent, from
      );

      crowdsale.setup(
        startTime, softCap, hardCap,
        rate, 0,
        maxAllProfit, overLimit, minPay,
        profits.duration, profits.procent, bonuses.value, bonuses.procent, from
      );
    });

    $('.js-cs-actions-change-targets').click(function () {
      var softCap = parseInt($('.js-cs-actions-change-targets-soft-cap').val(), 10);
      var hardCap = parseInt($('.js-cs-actions-change-targets-hard-cap').val(), 10);

      console.log(softCap, hardCap, from);
      crowdsale.changeTargets(softCap, hardCap, from);
    });

    $('.js-cs-actions-change-rate').click(function () {
      var rate = parseInt($('.js-cs-actions-setup-rate').val(), 10);
      var overLimit = parseInt($('.js-cs-actions-setup-over-limit').val(), 10);
      var minPay = parseInt($('.js-cs-actions-setup-min-pay').val(), 10);
      var maxAllProfit = parseInt($('.js-cs-actions-setup-max-all-profit').val(), 10);

      console.log(rate, overLimit, minPay, maxAllProfit, from);
      crowdsale.changeRate(rate, overLimit, minPay, maxAllProfit, from);
    });

    $('.js-cs-actions-set-bonuses').click(() => {
      var bonuses = this.collectBonusData('js-cs-actions-set-bonuses');
      var profits = this.collectProfitData('js-cs-actions-set-bonuses');

      console.log(bonuses.value, bonuses.procent, from);
      crowdsale.setBonuses(bonuses.value, bonuses.procent, from);
      crowdsale.setProfits(profits.duration, profits.procent, from);
    });

    $('.js-cs-actions-get-profit-percent-for-date').click(async function () {
      var date = parseInt($('.js-cs-actions-get-profit-percent-for-date-date').val(), 10);
      console.log(date);

      var percent = await crowdsale.getProfitPercentForData(date);
      console.log(percent.toNumber());
    });

    $('.js-cs-actions-finalize').click(function () {
      crowdsale.finalize(from);
    });

    $('.js-cs-actions-finalize-2').click(function () {
      crowdsale.finalize2(from);
    });

    $('.js-cs-actions-initialize').click(function () {
      crowdsale.initialize(from);
    });

    $('.js-cs-actions-distruct-vault').click(function () {
      crowdsale.distructVault(from);
    });

    $('.js-cs-actions-claim-refund').click(function () {
      crowdsale.claimRefund(from);
    });

    $('.js-cs-actions-get-cash').click(function () {
      // crowdsale.getCash(from);
    });

    $('.js-cs-actions-get-cash-custom').click(function () {
      var address = $('.js-cs-actions-get-cash-custom-address').val();

      console.log(address);
      // crowdsale.getCashFrom(address, from);
    });

    $('.js-cs-actions-fast-token-sale').click(function () {
      var sum = parseInt($('.js-cs-actions-fast-token-sale-sum').val(), 10);

      console.log(sum);
      crowdsale.privateMint(sum, from);
    });

    $('.js-cs-actions-token-pause').click(function () {
      crowdsale.tokenPause(from);
    });

    $('.js-cs-actions-token-unpause').click(function () {
      crowdsale.tokenUnause(from);
    });

    $('.js-cs-actions-crowdsale-pause').click(function () {
      crowdsale.setCrowdsalePause(true, from);
    });

    $('.js-cs-actions-crowdsale-unpause').click(function () {
      crowdsale.setCrowdsalePause(false, from);
    });

    $('.js-cs-actions-payments-in-other-currency').click(function () {
      var pTokenAmount = parseInt($('.js-cs-actions-payments-in-other-currency-pToken-amount').val(), 10);
      var nonEthSum = parseInt($('.js-cs-actions-payments-in-other-currency-non-eth-sum').val(), 10);

      console.log(pTokenAmount, nonEthSum);
      crowdsale.paymentsInOtherCurrency(pTokenAmount, nonEthSum, {from: web3.eth.coinbase});
    });

    $('.js-cs-actions-change-wallet').click(function () {
      var role = $('.js-cs-actions-change-wallet-role').val();
      var address = $('.js-cs-actions-change-wallet-address').val();

      console.log(rate, address);
      crowdsale.changeWallet(rate, address);
    });

    $('.js-cs-actions-buy-tokens').click(function () {
      var benificiary = $('.js-cs-actions-buy-tokens-benificiary').val();
      var value = web3.toWei(parseFloat($('.js-cs-actions-buy-tokens-value').val(), 10));

      console.log(benificiary, {from: web3.eth.coinbase, value: value});
      crowdsale.buyTokens(benificiary, {from: web3.eth.coinbase, value: value});
    });

    // Send TOSS
    var toss = await Token.deployed();

    $('.js-send-toss').click(function () {
      var address = $('.js-send-toss-address').val();
      var amount = parseInt($('.js-send-toss-amount').val(), 10);

      console.log(address, amount);
      toss.transfer(address, amount, from);
    });

    $('.js-cs-actions-set-allocation-periods').click(function () {
      var unlockStart = $('.js-cs-actions-set-periodic-allocation-unlock-start-value').val().trim();
      var offset = $('.js-cs-actions-set-allocation-offset-value').val().trim();

      console.log(unlockStart, offset);

      crowdsale.setAllocationUnlockStart(unlockStart, from);
      allocationQueue.setDateOffset(offset, from);
    });

    $('.js-cs-actions-mass-burn').click(function () {
      var beneficiary = $('.js-cs-actions-burn-wallets').val().split(',').map(s => s.trim());
      var values = $('.js-cs-actions-burn-values').val().split(',').map(parseInt);
      console.log(beneficiary, values);
      crowdsale.massBurnTokens(beneficiary, values, from);
    });

    $('.js-cs-actions-add-unburnable-wallet').click(async function () {
      var token = Token.at(await crowdsale.token());

      var address = $('.js-cs-actions-unburnable-wallet').val().trim();
      console.log(address, from);
      token.setUnburnableWallet(address, from);
    });

    $('#excel-parameters-fill').click(function () {
      var data = $('#excel-parameters').val();
      var now = Math.floor((new Date()).getTime() / 1000);

      var parsers = [
        {
          name: 'Start time (unix timestamp)',
          selector: '.js-cs-actions-setup-start-time',
          parse: (value) => { return now + (!!parseInt(value) ? parseInt(value) : 120); }
        },
        {
          name: 'End time (unix timestamp)',
          selector: '.js-cs-actions-change-period-stop-time',
          parse: (value) => { return now + (!!parseInt(value) ? parseInt(value) : 120); }
        },
        {
          name: 'Soft cap (ETH)',
          selector: '.js-cs-actions-setup-soft-cap',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Hard cap (ETH)',
          selector: '.js-cs-actions-setup-hard-cap',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Rate (token count for 1 ETH)',
          selector: '.js-cs-actions-setup-rate',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Over limit (ETH)',
          selector: '.js-cs-actions-setup-over-limit',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Min pay (ETH)',
          selector: '.js-cs-actions-setup-min-pay',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Max all profit (%)',
          selector: '.js-cs-actions-setup-max-all-profit',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Bonus by volume 1 min ETH',
          selector: '.js-cs-actions-setup-value[data-bonus=0]',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Bonus by volume 1 percent',
          selector: '.js-cs-actions-setup-procent[data-bonus=0]',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Bonus by volume 2 min ETH',
          selector: '.js-cs-actions-setup-value[data-bonus=1]',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Bonus by volume 2 percent',
          selector: '.js-cs-actions-setup-procent[data-bonus=1]',
          parse: (value) => { return (value).trim(); }
        },

        {
          name: 'Bonus by time 1 day num',
          selector: '.js-cs-actions-setup-pduration[data-profit=0]',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Bonus by time 1 percent',
          selector: '.js-cs-actions-setup-pprocent[data-profit=0]',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Bonus by time 2 day num',
          selector: '.js-cs-actions-setup-pduration[data-profit=1]',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Bonus by time 2 percent',
          selector: '.js-cs-actions-setup-pprocent[data-profit=1]',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Bonus by time 3 day num',
          selector: '.js-cs-actions-setup-pduration[data-profit=2]',
          parse: (value) => { return (value).trim(); }
        },
        {
          name: 'Bonus by time 3 percent',
          selector: '.js-cs-actions-setup-pprocent[data-profit=2]',
          parse: (value) => { return (value).trim(); }
        }
      ];

      var parsed = data.split('\n').map((s) => s.split('\t'));

      parsers.forEach((p) => {
        $(p.selector).val('');
      });

      parsed.forEach((d) => {
        parsers.forEach((p) => {
          if (p.name === d[0]) {
            $(p.selector).val(p.parse(d[1]));
          }
        });
      });
    });

    $('.js-cs-actions-set-allocation-queue-unlock').click(function () {
      var owner = $('.js-cs-actions-set-allocation-queue-owner').val().trim();
      var date = $('.js-cs-actions-set-allocation-queue-date').val().trim();
      allocationQueue.unlockFor(owner, date, from);
    });

    $('.js-cs-actions-set-periodic-allocation-unlock').click(function () {
      var owner = $('.js-cs-actions-set-periodic-allocation-owner').val().trim();
      allocation.unlockFor(owner, from);
    });
  },
  
  getBalances: async function () {
    var crowdsale = await Crowdsale.deployed();
    var token = Token.at(await crowdsale.token());
    var allocation = PeriodicAllocation.at(await crowdsale.allocation());
    var allocationQueue = AllocationQueue.at(await crowdsale.allocationQueue());
    var from = {from: account};

    if (parseInt(token.address) === 0) {
      return;
    }

    let html = '';

    var wallets = [
      {'address': '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1', 'description': 'beneficiary'},
      {'address': '0x22d491bde2303f2f43325b2108d26f1eaba1e32b', 'description': 'accountant'},
      {'address': '0xe11ba2b4d45eaed5996cd0823791e0c93114882d', 'description': 'manager'},
      {'address': '0xd03ea8624c8c5987235048901fb614fdca89b117', 'description': 'observer'},
      {'address': '0x95ced938f7991cd0dfcb48f0a06a40fa1af46ebc', 'description': 'bounty'},
      {'address': '0x3e5e9111ae8eb78fe1cc3bb8915d5d461f3ef9a9', 'description': 'advisers'},
      {'address': '0x28a8746e75304c0780e011bed21c72cd78cd535e', 'description': 'team'},
      {'address': '0xaca94ef8bd5ffee41947b4585a84bda5a3d3da6e', 'description': 'founders'},
      {'address': '0x1df62f291b2e969fb0849d99d9ce41e2f137006e', 'description': 'fund'},
      {'address': '0xffcf8fdee72ac11b5c542428b35eef5769c409f0', 'description': 'fees'},
      {'address': '0x991A1d6ff0aBc0bd0a3ecb1617c71143E4691A6f', 'description': 'players and investors'},
      {'address': '0x050178b27d28907A535b6B256B301955Ad1c3b43', 'description': 'airdrop'},
      {'address': '0xb4b559bB0ce9119948C04548b9FDD6967453491F', 'description': 'referrals'},
      {'address': '0x63DeAC5551f614FB1e85dDa2c440DC0661b7D29d', 'description': 'buyer 1'},
      {'address': '0xf0f5409ea22b14a20b12b330bd52a91597efbe8f', 'description': 'buyer 2'},
      {'address': '0xb7d4ac7fce988da56fef5373a6596a0144af9924', 'description': 'buyer 3'},
      {'address': allocation.address, 'description': 'allocation'},
      {'address': allocationQueue.address, 'description': 'allocationQueue'},
    ];

    for(let i = 0; i < wallets.length; i++) {
      var balance = await token.balanceOf(wallets[i].address);
      var ethBalance = await (new Promise((resolve, reject) => {
        Token.web3.eth.getBalance(wallets[i].address, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      }));

      html += '<tr>';
      html += '<td>' + wallets[i].address + '</td>';
      html += '<td>' + wallets[i].description + '</td>';
      html += '<td>' + (balance.toNumber() / 10**18)  + '</td>';
      html += '<td>' + (ethBalance / 10**18)  + '</td>';
      html += '</tr>';
    }

    var $balanceContainer = $('.js-token-balances');

    $balanceContainer.html(html);

    // Periodic allocation
    var unlockStart = await allocation.unlockStart();
    $('.js-periodic-allocation-unlock-start').html(unlockStart.toNumber());

    wallets = [
      {'address': '0x991A1d6ff0aBc0bd0a3ecb1617c71143E4691A6f', 'description': 'players and investors'},
    ];

    html = '';
    for(let i = 0; i < wallets.length; i++) {
      var shares = await allocation.shares(wallets[i].address);

      html += '<tr>';
      html += '<td>' + wallets[i].address + '</td>';
      html += '<td>' + wallets[i].description + '</td>';
      html += '<td>' + (shares[0].toNumber()) + '</td>';
      html += '<td>' + (shares[1].toNumber()) + '</td>';
      html += '<td>' + (shares[2].toNumber()) + '</td>';
      html += '</tr>';
    }

    $('.js-periodic-allocation').html(html);


    // Allocation queue
    var totalShare = await allocationQueue.totalShare();
    $('.js-allocation-queue-total-share').html(totalShare.toNumber());

    wallets = [
      {'address': '0x95ced938f7991cd0dfcb48f0a06a40fa1af46ebc', 'description': 'bounty'},
      {'address': '0x3e5e9111ae8eb78fe1cc3bb8915d5d461f3ef9a9', 'description': 'advisers'},
      {'address': '0x28a8746e75304c0780e011bed21c72cd78cd535e', 'description': 'team'},
      {'address': '0xaca94ef8bd5ffee41947b4585a84bda5a3d3da6e', 'description': 'founders'},
      {'address': '0x1df62f291b2e969fb0849d99d9ce41e2f137006e', 'description': 'fund'},
      {'address': '0x050178b27d28907A535b6B256B301955Ad1c3b43', 'description': 'airdrop'},
    ];

    const now = Math.floor((new Date()).getTime() / 1000);

    const monthSeconds = 30 * 24 * 60 * 60;
    const yearSeconds = 366 * 24 * 60 * 60;
    const formatDate = (d) => d.getUTCFullYear() * 100 + (d.getUTCMonth() + 1);

    const oneMonth = formatDate(new Date((now + monthSeconds) * 1000));
    const twoMonth = formatDate(new Date((now + monthSeconds * 2) * 1000));
    const sixMonth = formatDate(new Date((now + monthSeconds * 6) * 1000));
    const twelveMonth = formatDate(new Date((now + yearSeconds) * 1000));

    html = '';
    for(let i = 0; i < wallets.length; i++) {
      var oneMonthShare = (await allocationQueue.queue(wallets[i].address, oneMonth)).toNumber() / 10**18;
      var twoMonthShare = (await allocationQueue.queue(wallets[i].address, twoMonth)).toNumber() / 10**18;
      var sixMonthShare = (await allocationQueue.queue(wallets[i].address, sixMonth)).toNumber() / 10**18;
      var twelveMonthShare = (await allocationQueue.queue(wallets[i].address, twelveMonth)).toNumber() / 10**18;

      html += '<tr>';
      html += '<td>' + wallets[i].address + '</td>';
      html += '<td>' + wallets[i].description + '</td>';
      html += '<td>' + oneMonthShare + '</td>';
      html += '<td>' + twoMonthShare + '</td>';
      html += '<td>' + sixMonthShare + '</td>';
      html += '<td>' + twelveMonthShare + '</td>';
      html += '<td>' + (oneMonthShare + twoMonthShare + sixMonthShare + twelveMonthShare)  + '</td>';
      html += '</tr>';
    }

    $('.js-allocation-queue').html(html);
  },


  getDateTime: function (timestamp) {
    var date = new Date(timestamp * 1000);

    return date.toLocaleString();
  },


  showCrowdsaleInfo: async function() {
    var crowdsale = await Crowdsale.deployed();

    // Gather info from blockchain
    var data = {
      overall: await crowdsale.totalSaledToken(),
      isFinalized: await crowdsale.isFinalized(),
      isInitialized: await crowdsale.isInitialized(),
      isPausedCrowdsale: await crowdsale.isPausedCrowdsale(),
      startTime: await crowdsale.startTime(),
      stopTime: await crowdsale.stopTime(),
      rate: await crowdsale.rate(),
      softCap: await crowdsale.softCap(),
      hardCap: await crowdsale.hardCap(),
      overLimit: await crowdsale.overLimit(),
      minPay: await crowdsale.minPay(),
      maxAllProfit: await crowdsale.maxAllProfit(),
      weiRaised: await crowdsale.weiRaised(),
      weiTotalRaised: await crowdsale.weiTotalRaised(),
      tokenReserved: await crowdsale.tokenReserved(),
      chargeBonuses: await crowdsale.chargeBonuses(),
      tokenSaleType: await crowdsale.getTokenSaleType(),
      hasEnded: await crowdsale.hasEnded(),
      goalReached: await crowdsale.goalReached(),
      getProfitPercent: await crowdsale.getProfitPercent()
    };

    var bonuses = [], bonusesLength = await crowdsale.getBonusesLength();

    for (let i = 0; i < bonusesLength; i++) {
      // since we cannot iterate over mapping, try to get 10 bonuses (in reality there will be only 1 bonus)
      try {
        bonuses[i] = await crowdsale.bonuses(i);
      } catch (Error) {}
    }

    data['bonuses'] = bonuses;

    var profits = [], profitsLength = await crowdsale.getProfitsLength();

    for (let i = 0; i < profitsLength; i++) {
      // since we cannot iterate over mapping, try to get 10 bonuses (in reality there will be only 1 bonus)
      try {
        profits[i] = await crowdsale.profits(i);
      } catch (Error) {}
    }

    data['profits'] = profits;

    // Set actions input default values
    // Set values only once when the page is initialized
    if (crowdsaleInfoFetched === false) {
      var numberedData = ['startTime', 'rate', 'softCap', 'hardCap', 'overLimit', 'minPay', 'maxAllProfit'];

      $.each(numberedData, function (k, v) {
        $('[data-c-name="' + v + '"]').each(function () {
          $(this).val(data[v].toNumber());
        });
      });

      $('[data-c-name="bonusesValue"]').each(function () {
        var key = parseInt($(this).data('bonus'), 10);

        if (typeof(data.bonuses[key]) !== 'undefined') {
          $(this).val(data.bonuses[key][0].toNumber());
        }
      });

      $('[data-c-name="bonusesProcent"]').each(function () {
        var key = parseInt($(this).data('bonus'), 10);

        if (typeof(data.bonuses[key]) !== 'undefined') {
          $(this).val(data.bonuses[key][1].toNumber());
        }
      });

      $('[data-c-name="profitsDuration"]').each(function () {
        var key = parseInt($(this).data('profit'), 10);

        if (typeof(data.profits[key]) !== 'undefined') {
          $(this).val(data.profits[key][1].toNumber());
        }
      });

      $('[data-c-name="profitsProcent"]').each(function () {
        var key = parseInt($(this).data('profit'), 10);

        if (typeof(data.profits[key]) !== 'undefined') {
          $(this).val(data.profits[key][0].toNumber());
        }
      });

      var allocation = PeriodicAllocation.at(await crowdsale.allocation());
      var allocationQueue = AllocationQueue.at(await crowdsale.allocationQueue());

      if (parseInt(allocation.address, 16)) {
        var allocationUnlockStart = await allocation.unlockStart();
        $('.js-cs-actions-set-periodic-allocation-unlock-start-value').val(allocationUnlockStart);
      }

      if (parseInt(allocationQueue.address, 16)) {
        var positiveOffset = (await allocationQueue.datePositiveOffset());
        var negativeOffset = (await allocationQueue.dateNegativeOffset());
        var allocationOffset = positiveOffset - negativeOffset;

        console.log('allocationOffset', positiveOffset.toNumber(), negativeOffset.toNumber(), allocationOffset);

        $('.js-cs-actions-set-allocation-offset-value').val(allocationOffset);
      }
    }

    crowdsaleInfoFetched = true;

    // Set HTML info
    $('.js-cs-overall').html(data.overall.toNumber() / 10**18);
    $('.js-cs-is-finalized').html(data.isFinalized ? 'Yes' : 'No');
    $('.js-cs-is-initialized').html(data.isInitialized ? 'Yes' : 'No');
    $('.js-cs-is-paused-crowdsale').html(data.isPausedCrowdsale ? 'Yes' : 'No');
    $('.js-cs-start-time').html(this.getDateTime(data.startTime.toNumber()));
    $('.js-cs-stop-time').html(this.getDateTime(data.stopTime.toNumber()));
    $('.js-cs-rate').html(data.rate.toNumber());
    $('.js-cs-soft-cap').html(data.softCap.toNumber() / 10**18);
    $('.js-cs-hard-cap').html(data.hardCap.toNumber() / 10**18);
    $('.js-cs-over-limit').html(data.overLimit.toNumber() / 10**18);
    $('.js-cs-min-pay').html(data.minPay.toNumber() / 10**3);
    $('.js-cs-max-all-profit').html(data.maxAllProfit.toNumber());
    $('.js-cs-wei-raised').html(data.weiRaised.toNumber() / 10**18);
    $('.js-cs-wei-total-raised').html(data.weiTotalRaised.toNumber() / 10**18);
    $('.js-cs-token-reserved').html(data.tokenReserved.toNumber() / 10**18);
    $('.js-cs-charge-bonuses').html(data.chargeBonuses ? 'Yes' : 'No');
    $('.js-cs-token-sale-type').html(data.tokenSaleType);
    $('.js-cs-has-ended').html(data.hasEnded ? 'Yes' : 'No');
    $('.js-cs-goal-reached').html(data.goalReached ? 'Yes' : 'No');
    $('.js-cs-get-profit-percent').html(data.getProfitPercent.toNumber());

    $('.js-cs-bonuses').empty();
    $('.js-cs-profits').empty();

    $.each(data.bonuses, function (k, b) {
      let html = '<tr>';
      html += '<td>' + b[0].toNumber() / 10**18 + '</td>';
      html += '<td>' + b[1].toNumber() + '%</td>';
      html += '</tr>';

      $('.js-cs-bonuses').append(html);
    });

    $.each(data.profits, function (k, b) {
      let html = '<tr>';
      html += '<td>' + b[0].toNumber() + '%</td>';
      html += '<td>' + b[1].toNumber() + ' secs (' + b[1].toNumber() / 60 / 60 / 24 + ' days)</td>';
      html += '</tr>';

      $('.js-cs-profits').append(html);
    });

    $('.js-cs-actions-buy-tokens-benificiary').val(web3.eth.coinbase);
  },


  refreshBalance: async function() {
    var toss = await Token.deployed();
    var balance = await toss.balanceOf.call(account, {from: account});
    var $balanceElement = $('#balance');

    if ($balanceElement.length > 0) {
      $balanceElement.html(balance.toNumber());
    }
  }
};


window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 Token, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
  }

  App.start();
});
