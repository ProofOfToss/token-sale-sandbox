pragma solidity ^0.4.21;

import "../TokenSale/TokenSale/Crowdsale/AllocationQueue.sol";
import "../TokenSale/TokenSale/Token/ERC20Basic.sol";
import "../TokenSale/TokenSale/SafeMath.sol";

contract TestAllocationQueue is AllocationQueue {
    uint256 public datePositiveOffset = 0;
    uint256 public dateNegativeOffset = 0;

    constructor(ERC20Basic _token) public AllocationQueue(_token) { }

    function setDateOffset(int256 _dateOffset) external {
        if (_dateOffset < 0) {
            datePositiveOffset = 0;
            dateNegativeOffset = uint256(_dateOffset);
        } else {
            dateNegativeOffset = 0;
            datePositiveOffset = uint256(_dateOffset);
        }
    }

    function groupDates(uint256 _date) internal view returns (uint256) {
        return super.groupDates(_date.add(datePositiveOffset).sub(dateNegativeOffset));
    }
}
