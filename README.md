# Proof of Toss token sale sandbox

## Requirements

* nodejs >= 6.11
* npm >= 3.10
* truffle >= 4
* solidity >= 4.0.18

## Description

Truffle-based sandbox for testing token sale contracts (TossCrowdsale and TossToken).

Sandbox consists of 2 pages:

* index.html - info page about crowdsale and token, also includes a list of token purchases
* controls.html - a page with HTML controls to manipulate TossCrowdsale contract (basically it allows to execute any public function)

WARNING! There is JS code smell and ugly HTML/CSS markup. We didn't have purpose to write clean, good and reusable code, because this is just a sandbox to test the contract.

## How to build and run

You need to have set up an Ethereum/RSK local node. For testing purposes you could get things done with [testrpc / ganache-cli](https://github.com/trufflesuite/ganache-cli).

If you are working with ganache-cli, then do not forget to change default gasLimit setting:

```bash
ganache-cli --gasLimit 46000000
```

Setup a truffle config (truffle.js):

```js
# add your preferred networks here
# do not forget to set gas: 46000000

module.exports = {
  networks: {
    test: {
      gas: 46000000,
      gasPrice: 0,
      host: 'localhost',
      port: 8545,
      network_id: '*' // Match any network id
    }
  }
};

```

Compile and deploy contracts:

```bash
cd contracts/TokenSale
git submodule init
git submodule update
cd ../
npm install
truffle compile
truffle migrate # add "--network test" for testing environment, "--reset" to reset all migrations
```

Now you could try the result:

```bash
npm run dev
```

Now you will be able to visit:

* http://localhost:8080 as index page with crowdsale info
* http://localhost:8080/controls.html as crowdsale controls

Keep in mind following things:

* crowdsale info is updated each second dynamically
* if you don't see expected behaviour after certain actions, try to refresh the page and only than report an error
* it is also better to refresh a page when an account in MetaMask is changed
