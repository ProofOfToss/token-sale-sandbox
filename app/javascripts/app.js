// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import toss_crowdsale_artifacts from '../../build/contracts/Crowdsale.json'
import toss_token_artifacts from '../../build/contracts/Token.json'

// TossToken is our usable abstraction, which we'll use through the code below.
var TossCrowdsale = contract(toss_crowdsale_artifacts);
var TossToken = contract(toss_token_artifacts);

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

    // Bootstrap the TossToken abstraction for Use.
    TossCrowdsale.setProvider(web3.currentProvider);
    TossToken.setProvider(web3.currentProvider);

    const crowdsale = await TossCrowdsale.deployed();
    const tokenAddress = await crowdsale.token();

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
        self._init();
      }
    });
  },


  _init: function () {
    this.listenToOtherEvents();

    if (window.GLOBAL_IS_INDEX_PAGE === true) {
      this.refreshBalance();
      this.listenToPurchaseEvents();

      setInterval(() => this.showCrowdsaleInfo(), 1000);
    } else if (window.GLOBAL_IS_CONTROLS_PAGE === true) {
      this.listenToCrowdsaleActions();
      this.showCrowdsaleInfoInForm();
    } else if (window.GLOBAL_IS_TOKEN_PAGE === true) {
      this.refreshBalance();
      this.listenToTokenActions();
    }
  },


  listenToPurchaseEvents: async function () {
    // create a new web3 objects, because the one which comes from MetaMask has problems with events listening
    customWeb3 = new Web3(web3.currentProvider);

    var TossCrowdsale2 = contract(toss_crowdsale_artifacts);
    TossCrowdsale2.setProvider(customWeb3.currentProvider);

    var crowdsale = await TossCrowdsale2.deployed();
    var tokenPurchaseEvent = crowdsale.TokenPurchase({}, {fromBlock: 0, toBlock: 'latest'});
    var $purchaseContainer = $('.js-crowdsale-purchases');

    tokenPurchaseEvent.watch(function(error, result) {
      if ($('[data-tx-id="' + result.transactionHash + '"]').length == 0) {
        web3.eth.getBlock(result.blockNumber, function (e, r) {
          let e = result.args;
          let html = '<tr data-tx-id="' + result.transactionHash + '">';
          html += '<td>' + self.getDateTime(r.timestamp) + '</td>';
          html += '<td>' + e.purchaser + '</td>';
          html += '<td>' + e.beneficiary + '</td>';
          html += '<td>' + e.value.toNumber() / 10**18  + '</td>';
          html += '<td>' + e.amount.toNumber() / 10**18 + '</td>';
          html += '</tr>';

          $purchaseContainer.append($(html));
        });
      }
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
    const toss = await web3.eth.contract(TossToken.abi).at(tokenAddress);

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
      procent: [],
      freezeTime: []
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

    $('.' + selectorPrefix + '-freeze-time').each(function () {
      if ($(this).val() != '') {
        bonuses.freezeTime[parseInt($(this).data('bonus'), 10)] = parseInt($(this).val(), 10);
      }
    });

    return bonuses;
  },


  collectBonusByDateData: function (selectorPrefix) {
    var bonusesByDate = {
      duration: [],
      percent: []
    };

    $('.' + selectorPrefix + '-duration').each(function () {
      if ($(this).val() != '') {
        bonusesByDate.duration[parseInt($(this).data('bonus'), 10)] = parseInt($(this).val(), 10);
      }
    });

    $('.' + selectorPrefix + '-percent').each(function () {
      if ($(this).val() != '') {
        bonusesByDate.percent[parseInt($(this).data('bonus'), 10)] = parseInt($(this).val(), 10);
      }
    });

    return bonusesByDate;
  },


  listenToCrowdsaleActions: async function () {
    var crowdsale = await TossCrowdsale.deployed();
    var from = {from: account};

    $('.js-cs-actions-setup').click(() => {
      var bonuses = this.collectBonusData('js-cs-actions-setup');
      var bonusesByDate = this.collectBonusByDateData('js-cs-actions-setup-bonuses-by-date');
      var startTime = parseInt($('.js-cs-actions-setup-start-time').val(), 10);
      var endTime = parseInt($('.js-cs-actions-setup-end-time').val(), 10);
      var softCap = parseInt($('.js-cs-actions-setup-soft-cap').val(), 10);
      var hardCap = parseInt($('.js-cs-actions-setup-hard-cap').val(), 10);
      var rate = parseInt($('.js-cs-actions-setup-rate').val(), 10);
      var maxAllProfit = parseInt($('.js-cs-actions-setup-max-all-profit').val(), 10);
      var overLimit = parseInt($('.js-cs-actions-setup-over-limit').val(), 10);
      var minPay = parseInt($('.js-cs-actions-setup-min-pay').val(), 10);

      console.log(
        startTime, endTime, softCap, hardCap,
        rate, 0,
        maxAllProfit, overLimit, minPay,
        bonusesByDate.duration, bonusesByDate.percent,
        bonuses.value, bonuses.procent, bonuses.freezeTime,
        from
      );

      crowdsale.setup(
        startTime, endTime, softCap, hardCap,
        rate, 0,
        maxAllProfit, overLimit, minPay,
        bonusesByDate.duration, bonusesByDate.percent,
        bonuses.value, bonuses.procent, bonuses.freezeTime,
        from
      );
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
      crowdsale.getCash(from);
    });

    $('.js-cs-actions-reset-all-wallets').click(function () {
      crowdsale.resetAllWallets(from);
    });

    $('.js-cs-actions-first-mint-round0-mint').click(function () {
      var count = parseInt($('.js-cs-actions-first-mint-round0-count').val(), 10);

      console.log(count);
      crowdsale.firstMintRound0(count, from);
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
      var value = web3.toWei(parseFloat($('.js-cs-actions-buy-tokens-value').val()));

      console.log(benificiary, {from: account, value: value});
      crowdsale.buyTokens(benificiary, {from: account, value: value});
    });
  },


  listenToTokenActions: async function () {
    // Send TOSS
    const crowdsale = await TossCrowdsale.deployed();
    const tokenAddress = await crowdsale.token();
    const toss = await web3.eth.contract(TossToken.abi).at(tokenAddress);
    const from = {from: account};

    $('.js-t-actions-transfer').click(function () {
      var address = $('.js-t-actions-transfer-address').val();
      var amount = parseInt($('.js-t-actions-transfer-amount').val(), 10) * 10**18;

      console.log(address, amount, from);

      toss.transfer(address, amount, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-transfer-from').click(function () {
      var addressFrom = $('.js-t-actions-transfer-from-from-address').val();
      var addressTo = $('.js-t-actions-transfer-from-to-address').val();
      var amount = parseInt($('.js-t-actions-transfer-from-amount').val(), 10) * 10**18;

      console.log(addressFrom, addressTo, amount, from);

      toss.transferFrom(addressFrom, addressTo, amount, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-approve').click(function () {
      var address = $('.js-t-actions-approve-address').val();
      var amount = parseInt($('.js-t-actions-approve-amount').val(), 10) * 10**18;

      console.log(address, amount, from);

      toss.approve(address, amount, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-increase-approval').click(function () {
      var address = $('.js-t-actions-increase-approval-address').val();
      var amount = parseInt($('.js-t-actions-increase-approval-amount').val(), 10) * 10**18;

      console.log(address, amount, from);

      toss.increaseApproval(address, amount, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-decrease-approval').click(function () {
      var address = $('.js-t-actions-decrease-approval-address').val();
      var amount = parseInt($('.js-t-actions-decrease-approval-amount').val(), 10) * 10**18;

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

    $('.js-t-actions-check-frozen-token-balance').click(function () {
      var address = $('.js-t-actions-check-frozen-token-balance-address').val();

      console.log(address, from);

      toss.freezedTokenOf(address, from, function (e ,r) {
        console.log(e, r.toNumber());
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

    $('.js-t-js-t-actions-transfer-and-freeze-transfer').click(function () {
      var address = $('.js-t-actions-transfer-and-freeze-address').val();
      var amount = parseInt($('.js-t-actions-transfer-and-freeze-amount').val(), 10) * 10**18;
      var when = parseInt($('.js-t-actions-transfer-and-freeze-when').val(), 10);

      console.log(address, amount, when, from);

      toss.transferAndFreeze(address, amount, when, from, function (e ,r) {
        console.log(e, r);
      });
    });

    $('.js-t-actions-freeze-tokens').click(function () {
      var address = $('.js-t-actions-freeze-tokens-address').val();
      var amount = parseInt($('.js-t-actions-freeze-tokens-amount').val(), 10) * 10**18;
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
        amounts.push(parseInt(amount1, 10) * 10**18);
        whens.push(parseInt(when1, 10));
      }

      if (addr2 && amount2 && when2) {
        beneficiaries.push(addr2);
        amounts.push(parseInt(amount2, 10) * 10**18);
        whens.push(parseInt(when2, 10));
      }

      if (addr3 && amount3 && when3) {
        beneficiaries.push(addr3);
        amounts.push(parseInt(amount3, 10) * 10**18);
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

    return date.toLocaleString();
  },


  gatherDataFromCrowdsale: async function () {
    var crowdsale = await TossCrowdsale.deployed();

    // Gather info from blockchain
    var data = {
      totalSaledToken: await crowdsale.totalSaledToken(),
      isFinalized: await crowdsale.isFinalized(),
      isInitialized: await crowdsale.isInitialized(),
      isPausedCrowdsale: await crowdsale.isPausedCrowdsale(),
      chargeBonuses: await crowdsale.chargeBonuses(),
      canFirstMint: await crowdsale.canFirstMint(),
      startTime: await crowdsale.startTime(),
      endTime: await crowdsale.endTime(),
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
      totalSupply: await crowdsale.totalSupply(),
      maxAllProfit: await crowdsale.maxAllProfit()
    };

    var bonuses = [];

    for (let i = 0; i < 10; i++) {
      // since we cannot iterate over mapping, try to get 10 bonuses (in reality there will be only 1 bonus)
      try {
        bonuses[i] = await crowdsale.bonuses(i);
      } catch (Error) {
      }
    }

    data['bonuses'] = bonuses;

    var bonusesByDate = [];

    for (let i = 0; i < 10; i++) {
      // since we cannot iterate over mapping, try to get 10 profits (in reality there will be only 3-4 profits)
      try {
        bonusesByDate[i] = await crowdsale.profits(i);
      } catch (Error) {
      }
    }

    data['bonusesByDate'] = bonusesByDate;

    return data;
  },


  showCrowdsaleInfoInForm: async function () {
    // Gather info from blockchain
    var data = await this.gatherDataFromCrowdsale();

    // Set actions input default values
    // Set values only once when the page is initialized
    if (crowdsaleInfoFetched === false) {
      var numberedData = ['startTime', 'endTime', 'rate', 'softCap', 'hardCap', 'overLimit', 'minPay', 'maxAllProfit'];

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

      $('[data-c-name="bonusesFreezeTime"]').each(function () {
        var key = parseInt($(this).data('bonus'), 10);

        if (typeof(data.bonuses[key]) !== 'undefined') {
          $(this).val(data.bonuses[key][2].toNumber());
        }
      });

      $('[data-c-name="bonusesByDateDuration"]').each(function () {
        var key = parseInt($(this).data('bonus'), 10);

        if (typeof(data.bonusesByDate[key]) !== 'undefined') {
          $(this).val(data.bonusesByDate[key][0].toNumber());
        }
      });

      $('[data-c-name="bonusesByDatePercent"]').each(function () {
        var key = parseInt($(this).data('bonus'), 10);

        if (typeof(data.bonusesByDate[key]) !== 'undefined') {
          $(this).val(data.bonusesByDate[key][1].toNumber());
        }
      });
    }

    crowdsaleInfoFetched = true;
  },


  showCrowdsaleInfo: async function() {
    // Gather info from blockchain
    var data = await this.gatherDataFromCrowdsale();

    // Set HTML info
    $('.js-cs-total-saled-token').html(data.totalSaledToken.toNumber() / 10**18);
    $('.js-cs-is-finalized').html(data.isFinalized ? 'Yes' : 'No');
    $('.js-cs-is-initialized').html(data.isInitialized ? 'Yes' : 'No');
    $('.js-cs-is-paused-crowdsale').html(data.isPausedCrowdsale ? 'Yes' : 'No');
    $('.js-cs-can-first-mint').html(data.canFirstMint ? 'Yes' : 'No');
    $('.js-cs-charge-bonuses').html(data.chargeBonuses ? 'Yes' : 'No');
    $('.js-cs-start-time').html(this.getDateTime(data.startTime.toNumber()));
    $('.js-cs-end-time').html(this.getDateTime(data.endTime.toNumber()));
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
    $('.js-cs-total-supply').html(data.totalSupply.toNumber());
    $('.js-cs-max-all-profit').html(data.maxAllProfit.toNumber());

    $('.js-cs-bonuses').empty();
    $('.js-cs-bonuses-by-date').empty();

    $.each(data.bonuses, function (k, b) {
      let html = '<tr>';
      html += '<td>' + b[0].toNumber() / 10**18 + '</td>';
      html += '<td>' + b[1].toNumber() + '%</td>';
      html += '<td>' + b[2].toNumber() + ' secs (' + b[2].toNumber() / 60 / 60 / 24 + ' days)</td>';
      html += '</tr>';

      $('.js-cs-bonuses').append(html);
    });

    $.each(data.bonusesByDate, function (k, b) {
      let html = '<tr>';
      html += '<td>' + b[0].toNumber() + '%</td>';
      html += '<td>' + b[1].toNumber() + ' days</td>';
      html += '</tr>';

      $('.js-cs-bonuses-by-date').append(html);
    });
  },


  refreshBalance: async function() {
    const crowdsale = await TossCrowdsale.deployed();
    const tokenAddress = await crowdsale.token();
    const toss = await web3.eth.contract(TossToken.abi).at(tokenAddress);

    const balance = await toss.balanceOf(account, {from: account}, function (e, r) {
      console.log(e, r);

      let $balanceElement = $('#balance');

      if ($balanceElement.length > 0) {
        $balanceElement.html(r.toNumber());
      }
    });

  }
};


window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 TossToken, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
  }

  App.start();
});
