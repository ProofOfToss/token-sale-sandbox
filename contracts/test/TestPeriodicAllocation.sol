pragma solidity ^0.4.21;

import "../TokenSale/TokenSale/Crowdsale/PeriodicAllocation.sol";

contract TestPeriodicAllocation is PeriodicAllocation {
    constructor(ERC20Basic _token) public PeriodicAllocation(_token) { }

    function setUnlockStart(uint256 _unlockStart) onlyOwner external {
        unlockStart = _unlockStart;
    }
}
