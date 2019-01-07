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
  start: async function() {
    var self = this;

    // Bootstrap the Token abstraction for Use.
    Crowdsale.setProvider(web3.currentProvider);
    Token.setProvider(web3.currentProvider);
    PeriodicAllocation.setProvider(web3.currentProvider);
    AllocationQueue.setProvider(web3.currentProvider);

    const crowdsale = await TossCrowdsale.deployed();
    const tokenAddress = await crowdsale.token();
    const allocationAddress = await crowdsale.allocation();

    var allocation = PeriodicAllocation.at(await crowdsale.allocation());
    var allocationQueue = AllocationQueue.at(await crowdsale.allocationQueue());

    window.allocation = allocation;
    window.allocationQueue = allocationQueue;

    console.log('CROWDSALE ADDRESS: ' + crowdsale.address);

    var data = await this.gatherDataFromCrowdsale();

    console.log(data);

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

      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        alert('It seems you didn\'t yet create a Token contract. Proceed to controls.html page and create via either functions initialize(), setup() or firstMintRound0() AND REFRESH THIS PAGE.');

        if (window.GLOBAL_IS_CONTROLS_PAGE === true) {
          self._init();
        }
      } else {
        console.log('TOKEN ADDRESS: ' + tokenAddress);
        console.log('ALLOCATION ADDRESS: ' + allocationAddress);
        self._init();
      }
    });
  },


  _init: function () {
    this.listenToOtherEvents();
    this.getBalances();

    setInterval(() => this.getBalances(), 5000);

    if ($('.js-my-address').length > 0) {
      $('.js-my-address').val(account);
    }

    if (window.GLOBAL_IS_INDEX_PAGE === true) {
      this.refreshBalance();
      this.listenToPurchaseEvents();

        /*setInterval(() =>*/ this.showCrowdsaleInfo()/*, 1000)*/;
    } else if (window.GLOBAL_IS_CONTROLS_PAGE === true) {
      this.listenToCrowdsaleActions();
      this.showCrowdsaleInfoInForm();
    } else if (window.GLOBAL_IS_TOKEN_PAGE === true) {
      this.refreshBalance();
      this.listenToTokenActions();
    }

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

        $('.now-minus-1m').html(now - monthSeconds);
        $('.now-minus-2m').html(now - monthSeconds * 2);
        $('.now-minus-7m').html(now - monthSeconds * 7);
    }, 5000);
  },


  listenToPurchaseEvents: async function () {
    // create a new web3 objects, because the one which comes from MetaMask has problems with events listening
    customWeb3 = new Web3(web3.currentProvider);

    var self = this;
    var Crowdsale2 = contract(crowdsale_artifacts);
    Crowdsale2.setProvider(customWeb3.currentProvider);

    var crowdsale = await Crowdsale.deployed();
    var tokenPurchaseEvent = crowdsale.TokenPurchase({}, {fromBlock: 0, toBlock: 'latest'});
    var $purchaseContainer = $('.js-crowdsale-purchases');

    tokenPurchaseEvent.watch(function(error, result) {
      if ($('[data-tx-id="' + result.transactionHash + '"]').length == 0) {
        web3.eth.getBlock(result.blockNumber, function (e, r) {
          let ev = result.args;
          let html = '<tr data-tx-id="' + result.transactionHash + '">';
          html += '<td>' + self.getDateTime(r.timestamp) + '</td>';
          html += '<td>' + ev.purchaser + '</td>';
          html += '<td>' + ev.beneficiary + '</td>';
          html += '<td>' + ev.value.toNumber() / 10**18  + '</td>';
          html += '<td>' + ev.amount.toNumber() / 10**18 + '</td>';
          html += '</tr>';

          $purchaseContainer.append($(html));
        });
      }
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


  listenToOtherEvents: async function () {
    var self = this;

    // create a new web3 objects, because the one which comes from MetaMask has problems with events listening
    customWeb3 = new Web3(web3.currentProvider);

    const TossCrowdsale2 = contract(toss_crowdsale_artifacts);
    TossCrowdsale2.setProvider(customWeb3.currentProvider);

    const crowdsale = await TossCrowdsale2.deployed();
    const tokenAddress = await crowdsale.token();
    const tokenDeployed = tokenAddress !== '0x0000000000000000000000000000000000000000';
    let toss = null;

    if (tokenDeployed) {
      toss = await web3.eth.contract(TossToken.abi).at(tokenAddress);
    }

    const events = [
      ['Crowdsale', 'TokenPurchase'],
      ['Crowdsale', 'Finalized'],
      ['Crowdsale', 'Initialized'],
      ['Token', 'OwnershipTransferred'],
      ['Token', 'Pause'],
      ['Token', 'Unpause'],
      ['Token', 'Unpause'],
      ['Token', 'Transfer'],
      ['Token', 'Burn'],
      ['Token', 'Migrate'],
      ['Token', 'Mint'],
      ['Token', 'Approval']
    ];

    for (let i = 0; i < events.length; i++) {
      if (events[i][0] === 'Token' && !tokenDeployed) {
        continue;
      }

      const c = events[i][0] === 'Crowdsale' ? crowdsale : toss;
      const e = c[events[i][1]]({}, {fromBlock: 0, toBlock: 'latest'});

      e.watch(function (error, result) {
        web3.eth.getBlock(result.blockNumber, function (e, r) {
          console.log('[NEW EVENT]', self.getDateTime(r.timestamp), events[i][0] + ' / ' + events[i][1], result.args);
        });
      });
    }
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


  listenToCrowdsaleActions: async function () {
    var crowdsale = await TossCrowdsale.deployed();
    var from = {from: account};

    $('.js-cs-actions-change-period').click(function () {
        var startTime = parseInt($('.js-cs-actions-change-period-start-time').val(), 10);
        var stopTime = parseInt($('.js-cs-actions-change-period-stop-time').val(), 10);

        console.log(startTime, stopTime, from);
        crowdsale.setStartTime(startTime, from);
        crowdsale.setStopTime(stopTime, from);
    });

    $('.js-cs-actions-reset').click(async () => {
      await crowdsale.reset(from);
    });

    $('.js-cs-actions-check-wallet-address').click(async () => {
      const roleNumber = parseInt($('.js-cs-actions-check-wallet-address-role-number').val(), 10);

      console.log(roleNumber);

      var w = await crowdsale.wallets(roleNumber);

      console.log(w);
    });

    $('.js-cs-actions-setup-set-default-actions').click(() => {
      $('.js-cs-actions-setup-soft-cap').val('8500000000000000000000');
      $('.js-cs-actions-setup-hard-cap').val('71500000000000000000000');
      $('.js-cs-actions-setup-rate').val('10000000000000000000000');
      $('.js-cs-actions-setup-over-limit').val('20000000000000000000');
      $('.js-cs-actions-setup-min-pay').val('71000000000000000');
      $('.js-cs-actions-setup-value[data-bonus="0"]').val('71000000000000000000');
      $('.js-cs-actions-setup-procent[data-bonus="0"]').val('30');
      $('.js-cs-actions-setup-freeze-time[data-bonus="0"]').val('600');
      $('.js-cs-actions-setup-bonuses-by-date-duration[data-bonus="0"]').val('86400');
      $('.js-cs-actions-setup-bonuses-by-date-percent[data-bonus="0"]').val('15');
    });

    $('.js-cs-actions-setup').click(() => {
      var bonuses = this.collectBonusData('js-cs-actions-setup');
      var profits = this.collectProfitData('js-cs-actions-setup');
      var startTime = parseInt($('.js-cs-actions-setup-start-time').val(), 10);
      var stopTime = parseInt($('.js-cs-actions-setup-stop-time').val(), 10);
      var softCap = parseInt($('.js-cs-actions-setup-soft-cap').val(), 10);
      var hardCap = parseInt($('.js-cs-actions-setup-hard-cap').val(), 10);
      var rate = parseInt($('.js-cs-actions-setup-rate').val(), 10);
      var maxAllProfit = parseInt($('.js-cs-actions-setup-max-all-profit').val(), 10);
      var overLimit = parseInt($('.js-cs-actions-setup-over-limit').val(), 10);
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
      console.log(from);
      crowdsale.claimRefund(from);
    });

    $('.js-cs-actions-reset-all-wallets').click(function () {
      crowdsale.resetAllWallets(from);
    });

      $('.js-cs-actions-fast-token-sale').click(function () {
          var sum = parseInt($('.js-cs-actions-fast-token-sale-sum').val(), 10);

          console.log(sum);
          crowdsale.privateMint(sum, from);
      });

    $('.js-cs-actions-move-tokens').click(function () {
      var address = $('.js-cs-actions-move-tokens-migration-agent-address').val();

      console.log(address);
      crowdsale.moveTokens(address, from);
    });

    $('.js-cs-actions-migrate-all').click(function () {
      var holders = [];

      var addr1 = $('.js-cs-actions-migrate-all-holder1-address').val();
      var addr2 = $('.js-cs-actions-migrate-all-holder2-address').val();
      var addr3 = $('.js-cs-actions-migrate-all-holder3-address').val();

      if (addr1.length > 0) {
        holders.push(addr1);
      }

      if (addr2.length > 0) {
        holders.push(addr2);
      }

      if (addr3.length > 0) {
        holders.push(addr3);
      }

      console.log(holders, from);
      crowdsale.moveTokens(holders, from);
    });

    $('.js-cs-actions-mass-burn-tokens').click(function () {
      var beneficiaries = [];
      var values = [];

      var addr1 = $('.js-cs-actions-mass-burn-tokens-ben1-address').val();
      var addr2 = $('.js-cs-actions-mass-burn-tokens-ben2-address').val();
      var addr3 = $('.js-cs-actions-mass-burn-tokens-ben3-address').val();
      var value1 = $('.js-cs-actions-mass-burn-tokens-ben1-value').val();
      var value2 = $('.js-cs-actions-mass-burn-tokens-ben2-value').val();
      var value3 = $('.js-cs-actions-mass-burn-tokens-ben3-value').val();

      if (addr1.length > 0 && value1.length > 0) {
        beneficiaries.push(addr1);
        values.push(parseInt(value1, 10));
      }

      if (addr2.length > 0 && value2.length > 0) {
        beneficiaries.push(addr2);
        values.push(parseInt(value2, 10));
      }

      if (addr3.length > 0 && value3.length > 0) {
        beneficiaries.push(addr3);
        values.push(parseInt(value3, 10));
      }

      console.log(beneficiaries, values, from);
      crowdsale.massBurnTokens(beneficiaries, values, from);
    });

    $('.js-cs-actions-token-pause').click(function () {
      crowdsale.tokenPause(from);
    });

    $('.js-cs-actions-token-unpause').click(function () {
      crowdsale.tokenUnpause(from);
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
      crowdsale.paymentsInOtherCurrency(pTokenAmount, nonEthSum, from);
    });

    $('.js-cs-actions-change-wallet').click(function () {
      var role = $('.js-cs-actions-change-wallet-role').val();
      var address = $('.js-cs-actions-change-wallet-address').val();

      console.log(role, address);
      crowdsale.changeWallet(role, address, from);
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

    $('.js-cs-actions-unlock-allocation').click(async function () {
      var address = $('.js-cs-actions-unlock-allocation-address').val();

      const allocationAddress = await crowdsale.allocation();
      const allocation = await web3.eth.contract(AllocationToss.abi).at(allocationAddress);

      console.log(address);
      allocation.unlockFor(address, from, function (e, r) {
        console.log(e, r);
      });
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

  listenToTokenActions: async function () {
    // Send TOSS
    const crowdsale = await TossCrowdsale.deployed();
    const tokenAddress = await crowdsale.token();
    const toss = await web3.eth.contract(TossToken.abi).at(tokenAddress);
    const from = {from: account};

    toss.paused(function (e, r) {
      console.log('IS PAUSED: ' + r);
    });

    $('.js-t-actions-allowance').click(function () {
      var addressFrom = $('.js-t-actions-allowance-owner-address').val();
      var addressTo = $('.js-t-actions-allowance-spender-address').val();

      console.log(addressFrom, addressTo, from);

      toss.allowance(addressFrom, addressTo, from, function (e, r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-transfer').click(function () {
      var address = $('.js-t-actions-transfer-address').val();
      var amount = parseInt($('.js-t-actions-transfer-amount').val(), 10);

      console.log(address, amount, from);

      toss.transfer(address, amount, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-transfer-from').click(function () {
      var addressFrom = $('.js-t-actions-transfer-from-from-address').val();
      var addressTo = $('.js-t-actions-transfer-from-to-address').val();
      var amount = parseInt($('.js-t-actions-transfer-from-amount').val(), 10);

      console.log(addressFrom, addressTo, amount, from);

      toss.transferFrom(addressFrom, addressTo, amount, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-approve').click(function () {
      var address = $('.js-t-actions-approve-address').val();
      var amount = parseInt($('.js-t-actions-approve-amount').val(), 10);

      console.log(address, amount, from);

      toss.approve(address, amount, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-increase-approval').click(function () {
      var address = $('.js-t-actions-increase-approval-address').val();
      var amount = parseInt($('.js-t-actions-increase-approval-amount').val(), 10);

      console.log(address, amount, from);

      toss.increaseApproval(address, amount, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-decrease-approval').click(function () {
      var address = $('.js-t-actions-decrease-approval-address').val();
      var amount = parseInt($('.js-t-actions-decrease-approval-amount').val(), 10);

      console.log(address, amount, from);

      toss.decreaseApproval(address, amount, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-migrate').click(function () {
      toss.migrate(from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-check-balance').click(function () {
      var address = $('.js-t-actions-check-balance-address').val();

      console.log(address, from);

      toss.balanceOf(address, from, function (e ,r) {
        console.log(e, r.toNumber() / 10**18);
      });
    });

    $('.js-t-actions-check-frozen-token-balance').click(function () {
      var address = $('.js-t-actions-check-frozen-token-balance-address').val();

      console.log(address, from);

      toss.freezedTokenOf(address, from, function (e ,r) {
        console.log(e, r.toNumber() / 10**18);
      });
    });

    $('.js-t-actions-check-frozen-token-defrost-date').click(function () {
      var address = $('.js-t-actions-check-frozen-token-defrost-date-address').val();

      console.log(address, from);

      toss.defrostDate(address, from, function (e ,r) {
        console.log(e, r.toNumber());
      });
    });

    $('.js-t-actions-set-unpaused-wallet').click(function () {
      var address = $('.js-t-actions-set-unpaused-wallet-address').val();
      var mode = $('.js-t-actions-set-unpaused-wallet-mode').val() ? true : false;

      console.log(address, mode, from);

      toss.setUnpausedWallet(address, mode, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-transfer-and-freeze').click(function () {
      var address = $('.js-t-actions-transfer-and-freeze-address').val();
      var amount = parseInt($('.js-t-actions-transfer-and-freeze-amount').val(), 10);
      var when = parseInt($('.js-t-actions-transfer-and-freeze-when').val(), 10);

      console.log(address, amount, when, from);

      toss.transferAndFreeze(address, amount, when, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-freeze-tokens').click(function () {
      var address = $('.js-t-actions-freeze-tokens-address').val();
      var amount = parseInt($('.js-t-actions-freeze-tokens-amount').val(), 10);
      var when = parseInt($('.js-t-actions-freeze-tokens-when').val(), 10);

      console.log(address, amount, when, from);

      toss.freezeTokens(address, amount, when, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-mass-freeze-tokens').click(function () {
      var beneficiaries = [];
      var amounts = [];
      var whens = [];

      var addr1 = $('.js-t-actions-mass-freeze-tokens-ben1-address').val();
      var addr2 = $('.js-t-actions-mass-freeze-tokens-ben2-address').val();
      var addr3 = $('.js-t-actions-mass-freeze-tokens-ben3-address').val();

      var amount1 = $('.js-t-actions-mass-freeze-tokens-ben1-amount').val();
      var amount2 = $('.js-t-actions-mass-freeze-tokens-ben2-amount').val();
      var amount3 = $('.js-t-actions-mass-freeze-tokens-ben3-amount').val();

      var when1 = $('.js-t-actions-mass-freeze-tokens-ben1-when').val();
      var when2 = $('.js-t-actions-mass-freeze-tokens-ben2-when').val();
      var when3 = $('.js-t-actions-mass-freeze-tokens-ben3-when').val();

      if (addr1 && amount1 && when1) {
        beneficiaries.push(addr1);
        amounts.push(parseInt(amount1, 10));
        whens.push(parseInt(when1, 10));
      }

      if (addr2 && amount2 && when2) {
        beneficiaries.push(addr2);
        amounts.push(parseInt(amount2, 10));
        whens.push(parseInt(when2, 10));
      }

      if (addr3 && amount3 && when3) {
        beneficiaries.push(addr3);
        amounts.push(parseInt(amount3, 10));
        whens.push(parseInt(when3, 10));
      }

      console.log(beneficiaries, amounts, whens, from);

      toss.masFreezedTokens(beneficiaries, amounts, whens, from, function (e ,r) {
        console.log(e, r);
      });
    });
  },


  getDateTime: function (timestamp) {
    var date = new Date(timestamp * 1000);

    return date.toLocaleString('en-GB', {timeZone: 'UTC'}) + ' (UTC)';
  },


  gatherDataFromCrowdsale: async function (getTotalSupply) {
      var crowdsale = await Crowdsale.deployed();

    // Gather info from blockchain
    var data = {
      overall: await crowdsale.totalSaledToken(),
      isFinalized: await crowdsale.isFinalized(),
      isInitialized: await crowdsale.isInitialized(),
      isPausedCrowdsale: await crowdsale.isPausedCrowdsale(),
      chargeBonuses: await crowdsale.chargeBonuses(),
      canFirstMint: await crowdsale.canFirstMint(),
      startTime: await crowdsale.startTime(),
        stopTime: await crowdsale.stopTime(),
      rate: await crowdsale.rate(),
      softCap: await crowdsale.softCap(),
      hardCap: await crowdsale.hardCap(),
      overLimit: await crowdsale.overLimit(),
      minPay: await crowdsale.minPay(),
      weiRaised: await crowdsale.weiRaised(),
      nonEthWeiRaised: await crowdsale.nonEthWeiRaised(),
      tokenReserved: await crowdsale.tokenReserved(),
      tokenSaleType: await crowdsale.getTokenSaleType(),
      hasEnded: await crowdsale.hasEnded(),
      goalReached: await crowdsale.goalReached(),
      getProfitPercent: await crowdsale.getProfitPercent(),
      totalSupply: getTotalSupply === true ? await crowdsale.totalSupply() : 0,
      maxAllProfit: await crowdsale.maxAllProfit(),
      //currentTime: await crowdsale.getCurrentTime(),
      //endTime2: await crowdsale.getEndTime2(),
    };

      var bonuses = [], bonusesLength = await crowdsale.getBonusesLength();

      for (let i = 0; i < bonusesLength; i++) {
      // since we cannot iterate over mapping, try to get 10 bonuses (in reality there will be only 1 bonus)
      try {
        bonuses[i] = await crowdsale.bonuses(i);
      } catch (Error) {
      }
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

    return data;
  },


  showCrowdsaleInfoInForm: async function () {
    // Gather info from blockchain
    var data = await this.gatherDataFromCrowdsale();

    // Set actions input default values
    // Set values only once when the page is initialized
    if (crowdsaleInfoFetched === false) {
      var numberedData = ['startTime', 'stopTime', 'rate', 'softCap', 'hardCap', 'overLimit', 'minPay', 'maxAllProfit'];

      $.each(numberedData, function (k, v) {
        $('[data-c-name="' + v + '"]').each(function () {
          var val = data[v].toNumber();

          $(this).val(val);
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

      $('[data-c-name="bonusesByDatePercent"]').each(function () {
        var key = parseInt($(this).data('bonus'), 10);

        if (typeof(data.bonusesByDate[key]) !== 'undefined') {
          $(this).val(data.bonusesByDate[key][0].toNumber());
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
  },


  showCrowdsaleInfo: async function() {
    // Gather info from blockchain
    var data = await this.gatherDataFromCrowdsale(true);

    // Set HTML info
    $('.js-cs-total-saled-token').html(data.totalSaledToken.toNumber() / 10**18);
    $('.js-cs-is-finalized').html(data.isFinalized ? 'Yes' : 'No');
    $('.js-cs-is-initialized').html(data.isInitialized ? 'Yes' : 'No');
    $('.js-cs-is-paused-crowdsale').html(data.isPausedCrowdsale ? 'Yes' : 'No');
    $('.js-cs-can-first-mint').html(data.canFirstMint ? 'Yes' : 'No');
    $('.js-cs-charge-bonuses').html(data.chargeBonuses ? 'Yes' : 'No');
    $('.js-cs-start-time').html(this.getDateTime(data.startTime.toNumber()));
      $('.js-cs-stop-time').html(this.getDateTime(data.stopTime.toNumber()));
    $('.js-cs-rate').html(data.rate.toNumber() / 10**18);
    $('.js-cs-soft-cap').html(data.softCap.toNumber() / 10**18);
    $('.js-cs-hard-cap').html(data.hardCap.toNumber() / 10**18);
    $('.js-cs-over-limit').html(data.overLimit.toNumber() / 10**18);
    $('.js-cs-min-pay').html(data.minPay.toNumber() / 10**18);
    $('.js-cs-eth-wei-raised').html(data.weiRaised.toNumber() / 10**18);
    $('.js-cs-non-eth-wei-raised').html(data.nonEthWeiRaised.toNumber() / 10**18);
    $('.js-cs-token-reserved').html(data.tokenReserved.toNumber() / 10**18);
    $('.js-cs-token-sale-type').html(data.tokenSaleType);
    $('.js-cs-has-ended').html(data.hasEnded ? 'Yes' : 'No');
    $('.js-cs-goal-reached').html(data.goalReached ? 'Yes' : 'No');
    $('.js-cs-get-profit-percent').html(data.getProfitPercent.toNumber());
    $('.js-cs-total-supply').html(data.totalSupply.toNumber() / 10**18);
    $('.js-cs-max-all-profit').html(data.maxAllProfit.toNumber());

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
          $balanceElement.html(balance.toNumber() / 10**18);
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
