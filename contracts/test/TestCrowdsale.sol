pragma solidity ^0.4.21;

import "../TokenSale/TokenSale/Crowdsale/Crowdsale.sol";
import "../TokenSale/TokenSale/Crowdsale/Creator.sol";

contract TestCrowdsale is Crowdsale {
    constructor(Creator _creator) public Crowdsale(_creator) {
        wallets = [
            0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1, // Beneficiary
            0x22d491bde2303f2f43325b2108d26f1eaba1e32b, // Accountant
            0xe11ba2b4d45eaed5996cd0823791e0c93114882d, // Manager
            0xd03ea8624c8c5987235048901fb614fdca89b117, // Observer
            0x95ced938f7991cd0dfcb48f0a06a40fa1af46ebc, // Bounty - 7% tokens
            0x3e5e9111ae8eb78fe1cc3bb8915d5d461f3ef9a9, // Company, White list 1%
            0x28a8746e75304c0780e011bed21c72cd78cd535e, // Team, 6%, freeze 1+1 year
            0xaca94ef8bd5ffee41947b4585a84bda5a3d3da6e, // Founders, 10% freeze 1+1 year
            0x1df62f291b2e969fb0849d99d9ce41e2f137006e, // Fund, 6%
            0xffcf8fdee72ac11b5c542428b35eef5769c409f0  // Fees, 7% money
        ];

        startTime = now;
        endTime = now + 30 days;
    }

    function mint(address _to, uint256 _amount) public returns (bool) {
        return token.mint(_to, _amount);
    }

    function burn(address _beneficiary, uint256 _value) public {
        return token.burn(_beneficiary, _value);
    }

    function setStartTime(uint256 _startTime) public {
        startTime = _startTime;
    }
}
