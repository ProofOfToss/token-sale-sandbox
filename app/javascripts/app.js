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
    if (window.GLOBAL_IS_INDEX_PAGE === true) {
      this.refreshBalance();
      this.listenToPurchaseEvents();
      this.listenToTokenActions();

      setInterval(() => this.showCrowdsaleInfo(), 1000);
    } else if (window.GLOBAL_IS_CONTROLS_PAGE === true) {
      this.listenToCrowdsaleActions();
    }
  },


  listenToPurchaseEvents: async function () {
    // create a new web3 objects, because the one which comes from MetaMask has problems with events litening
    customWeb3 = new Web3(web3.currentProvider);

    var TossCrowdsale2 = contract(toss_crowdsale_artifacts);
    TossCrowdsale2.setProvider(customWeb3.currentProvider);

    var crowdsale = await TossCrowdsale.deployed();
    var tokenPurchaseEvent = crowdsale.TokenPurchase({}, {fromBlock: 0, toBlock: 'latest'});
    var $purchaseContainer = $('.js-crowdsale-purchases');

    tokenPurchaseEvent.watch(function(error, result) {
      if ($('[data-tx-id="' + result.transactionHash + '"]').length == 0) {
        let e = result.args;
        let html = '<tr data-tx-id="' + result.transactionHash + '">';
        html += '<td>' + e.purchaser + '</td>';
        html += '<td>' + e.beneficiary + '</td>';
        html += '<td>' + e.value.toNumber() / 10**18  + '</td>';
        html += '<td>' + e.amount.toNumber() / 10**18 + '</td>';
        html += '</tr>';

        $purchaseContainer.append($(html));
      }
    });
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


  listenToCrowdsaleActions: async function () {
    var crowdsale = await TossCrowdsale.deployed();
    var from = {from: account};

    $('.js-cs-actions-change-period').click(function () {
      var startTime = parseInt($('.js-cs-actions-change-period-start-time').val(), 10);
      var endDiscountTime = parseInt($('.js-cs-actions-change-period-end-discount-time').val(), 10);
      var endTime = parseInt($('.js-cs-actions-change-period-end-time').val(), 10);

      console.log(startTime, endDiscountTime, endTime, from);
      crowdsale.changePeriod(startTime, endDiscountTime, endTime, from);
    });

    $('.js-cs-actions-setup').click(() => {
      var bonuses = this.collectBonusData('js-cs-actions-setup');
      var startTime = parseInt($('.js-cs-actions-setup-start-time').val(), 10);
      var endDiscountTime = parseInt($('.js-cs-actions-setup-end-discount-time').val(), 10);
      var endTime = parseInt($('.js-cs-actions-setup-end-time').val(), 10);
      var softCap = parseInt($('.js-cs-actions-setup-soft-cap').val(), 10);
      var hardCap = parseInt($('.js-cs-actions-setup-hard-cap').val(), 10);
      var rate = parseInt($('.js-cs-actions-setup-rate').val(), 10);
      var overLimit = parseInt($('.js-cs-actions-setup-over-limit').val(), 10);
      var minPay = parseInt($('.js-cs-actions-setup-min-pay').val(), 10);

      console.log(
        startTime, endDiscountTime, endTime, softCap, hardCap, rate, overLimit, minPay,
        bonuses.value, bonuses.procent, bonuses.freezeTime, from
      );

      crowdsale.setup(
        startTime, endDiscountTime, endTime, softCap, hardCap, rate, overLimit, minPay,
        bonuses.value, bonuses.procent, bonuses.freezeTime, from
      );
    });

    $('.js-cs-actions-change-targets').click(function () {
      var softCap = parseInt($('.js-cs-actions-change-targets-soft-cap').val(), 10);
      var hardCap = parseInt($('.js-cs-actions-change-targets-hard-cap').val(), 10);

      console.log(softCap, hardCap, from);
      crowdsale.changeTargets(softCap, hardCap, from);
    });

    $('.js-cs-actions-change-rate').click(function () {
      var rate = parseInt($('.js-cs-actions-change-rate-rate').val(), 10);
      var overLimit = parseInt($('.js-cs-actions-change-rate-over-limit').val(), 10);
      var minPay = parseInt($('.js-cs-actions-change-rate-min-pay').val(), 10);

      console.log(rate, overLimit, minPay, from);
      crowdsale.changeRate(rate, overLimit, minPay, from);
    });

    $('.js-cs-actions-set-bonuses').click(() => {
      var bonuses = this.collectBonusData('js-cs-actions-set-bonuses');

      console.log(bonuses.value, bonuses.procent, bonuses.freezeTime, from);
      crowdsale.setBonuses(bonuses.value, bonuses.procent, bonuses.freezeTime, from);
    });

    $('.js-cs-actions-get-profit-percent-for-date').click(async function () {
      var date = parseInt($('.js-cs-actions-get-profit-percent-for-date-date').val(), 10);
      console.log(date);

      var percent = await crowdsale.getProfitPercentForData(date);
      console.log(percent.toNumber());
    });

    $('.js-cs-actions-finalize-all').click(function () {
      crowdsale.finalizeAll(from);
    });

    $('.js-cs-actions-finalize').click(function () {
      crowdsale.finalize(from);
    });

    $('.js-cs-actions-finalize-1').click(function () {
      crowdsale.finalize1(from);
    });

    $('.js-cs-actions-finalize-2').click(function () {
      crowdsale.finalize2(from);
    });

    $('.js-cs-actions-finalize-3').click(function () {
      crowdsale.finalize3(from);
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

    $('.js-cs-actions-get-cash-custom').click(function () {
      var address = $('.js-cs-actions-get-cash-custom-address').val();

      console.log(address);
      crowdsale.getCashFrom(address, from);
    });

    $('.js-cs-actions-fast-token-sale').click(function () {
      var sum = parseInt($('.js-cs-actions-fast-token-sale-sum').val(), 10);

      console.log(sum);
      crowdsale.fastTokenSale(sum, from);
    });

    $('.js-cs-actions-token-pause').click(function () {
      crowdsale.tokenPause(from);
    });

    $('.js-cs-actions-token-unpause').click(function () {
      crowdsale.tokenUnpause(from);
    });

    $('.js-cs-actions-crowdsale-pause').click(function () {
      crowdsale.crowdsalePause(from);
    });

    $('.js-cs-actions-crowdsale-unpause').click(function () {
      crowdsale.crowdsaleUnpause(from);
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
    const toss = web3.eth.contract(TossToken.abi).at(tokenAddress);

    $('.js-send-toss').click(function () {
      var address = $('.js-send-toss-address').val();
      var amount = parseInt($('.js-send-toss-amount').val(), 10);

      console.log(address, amount);

      toss.transfer(address, amount, {from: address}, function (e ,r) {
        console.log(e, r);
      });
    });
  },


  getDateTime: function (timestamp) {
    var date = new Date(timestamp * 1000);

    return date.toLocaleString();
  },


  showCrowdsaleInfo: async function() {
    var crowdsale = await TossCrowdsale.deployed();

    // Gather info from blockchain
    var data = {
      overall: await crowdsale.overall(),
      isFinalized: await crowdsale.isFinalized(),
      isInitialized: await crowdsale.isInitialized(),
      isPausedCrowdsale: await crowdsale.isPausedCrowdsale(),
      startMint: await crowdsale.startMint(),
      startTime: await crowdsale.startTime(),
      endDiscountTime: await crowdsale.endDiscountTime(),
      endTime: await crowdsale.endTime(),
      rate: await crowdsale.rate(),
      softCap: await crowdsale.softCap(),
      hardCap: await crowdsale.hardCap(),
      overLimit: await crowdsale.overLimit(),
      minPay: await crowdsale.minPay(),
      weiRaised: await crowdsale.weiRaised(),
      weiTotalRaised: await crowdsale.weiTotalRaised(),
      tokenReserved: await crowdsale.tokenReserved(),
      bounty: await crowdsale.bounty(),
      team: await crowdsale.team(),
      company: await crowdsale.company(),
      tokenSaleType: await crowdsale.getTokenSaleType(),
      hasEnded: await crowdsale.hasEnded(),
      goalReached: await crowdsale.goalReached(),
      getProfitPercent: await crowdsale.getProfitPercent()
    };

    var bonuses = [];

    for (let i = 0; i < 10; i++) {
      // since we cannot iterate over mapping, try to get 10 bonuses (in reality there will be only 1 bonus)
      try {
        bonuses[i] = await crowdsale.bonuses(i);
      } catch (Error) {}
    }

    data['bonuses'] = bonuses;

    // Set actions input default values
    // Set values only once when the page is initialized
    if (crowdsaleInfoFetched === false) {
      var numberedData = ['startTime', 'endTime', 'endDiscountTime', 'rate', 'softCap', 'hardCap', 'overLimit', 'minPay'];

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
    }

    crowdsaleInfoFetched = true;

    // Set HTML info
    $('.js-cs-overall').html(data.overall.toNumber() / 10**18);
    $('.js-cs-is-finalized').html(data.isFinalized ? 'Yes' : 'No');
    $('.js-cs-is-initialized').html(data.isInitialized ? 'Yes' : 'No');
    $('.js-cs-is-paused-crowdsale').html(data.isPausedCrowdsale ? 'Yes' : 'No');
    $('.js-cs-start-mint').html(data.startMint ? 'Yes' : 'No');
    $('.js-cs-start-time').html(this.getDateTime(data.startTime.toNumber()));
    $('.js-cs-end-discount-time').html(this.getDateTime(data.endDiscountTime.toNumber()));
    $('.js-cs-end-time').html(this.getDateTime(data.endTime.toNumber()));
    $('.js-cs-rate').html(data.rate.toNumber());
    $('.js-cs-soft-cap').html(data.softCap.toNumber() / 10**18);
    $('.js-cs-hard-cap').html(data.hardCap.toNumber() / 10**18);
    $('.js-cs-over-limit').html(data.overLimit.toNumber() / 10**18);
    $('.js-cs-min-pay').html(data.minPay.toNumber() / 10**18);
    $('.js-cs-wei-raised').html(data.weiRaised.toNumber() / 10**18);
    $('.js-cs-wei-total-raised').html(data.weiTotalRaised.toNumber() / 10**18);
    $('.js-cs-token-reserved').html(data.tokenReserved.toNumber() / 10**18);
    $('.js-cs-bounty').html(data.bounty ? 'Yes' : 'No');
    $('.js-cs-team').html(data.team ? 'Yes' : 'No');
    $('.js-cs-company').html(data.company ? 'Yes' : 'No');
    $('.js-cs-token-sale-type').html(data.tokenSaleType);
    $('.js-cs-has-ended').html(data.hasEnded ? 'Yes' : 'No');
    $('.js-cs-goal-reached').html(data.goalReached ? 'Yes' : 'No');
    $('.js-cs-get-profit-percent').html(data.getProfitPercent.toNumber());

    $('.js-cs-bonuses').empty();

    $.each(data.bonuses, function (k, b) {
      let html = '<tr>';
      html += '<td>' + b[0].toNumber() / 10**18 + '</td>';
      html += '<td>' + b[1].toNumber() + '%</td>';
      html += '<td>' + b[2].toNumber() + ' secs (' + b[2].toNumber() / 60 / 60 / 24 + ' days)</td>';
      html += '</tr>';

      $('.js-cs-bonuses').append(html);
    });
  },


  refreshBalance: async function() {
    const crowdsale = await TossCrowdsale.deployed();
    const tokenAddress = await crowdsale.token();
    const toss = web3.eth.contract(TossToken.abi).at(tokenAddress);

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
