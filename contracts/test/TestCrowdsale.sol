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
            0x95ced938f7991cd0dfcb48f0a06a40fa1af46ebc, // Bounty
            0x3e5e9111ae8eb78fe1cc3bb8915d5d461f3ef9a9, // Advisers
            0x28a8746e75304c0780e011bed21c72cd78cd535e, // Team
            0xaca94ef8bd5ffee41947b4585a84bda5a3d3da6e, // Founders
            0x1df62f291b2e969fb0849d99d9ce41e2f137006e, // Fund
            0xffcf8fdee72ac11b5c542428b35eef5769c409f0, // Fees
            0x991A1d6ff0aBc0bd0a3ecb1617c71143E4691A6f, // Players and investors
            0x050178b27d28907A535b6B256B301955Ad1c3b43, // Airdrop
            0xb4b559bB0ce9119948C04548b9FDD6967453491F  // Referrals
        ];

        startTime = now;
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

    function setSoftCap(uint256 _softCap) public {
        softCap = _softCap;
    }

    function setHardCap(uint256 _hardCap) public {
        hardCap = _hardCap;
    }

    function setStopTime(uint256 _stopTime) public {
        stopTime = _stopTime;
    }

    function setBonuses(uint256[] _value, uint256[] _procent) public {
        require(_value.length == _procent.length);
        bonuses.length = _value.length;
        for(uint256 i = 0; i < _value.length; i++){
            bonuses[i] = Bonus(_value[i],_procent[i]);
        }
    }

    function setProfits(uint256[] _duration, uint256[] _procent) public {
        require(_duration.length == _procent.length);
        profits.length = _duration.length;
        for(uint256 i = 0; i < _duration.length; i++){
            profits[i] = Profit(_procent[i],_duration[i]);
        }
    }

    function changeRate(uint256 _rate, uint256 _overLimit, uint256 _minPay, uint256 _maxAllProfit) public {
        require(_rate > 0);

        rate = _rate;
        overLimit = _overLimit;
        minPay = _minPay;
        maxAllProfit = _maxAllProfit;
    }

    function getBonusesLength() public view returns (uint256) {
        return bonuses.length;
    }

    function getProfitsLength() public view returns (uint256) {
        return profits.length;
    }

    function setAllocationUnlockStart(uint256 _unlockStart) public {
        allocation.setUnlockStart(_unlockStart);
    }
}
