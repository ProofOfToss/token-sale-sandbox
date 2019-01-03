pragma solidity ^0.4.21;

import './TestAllocationQueue.sol';
import './TestPeriodicAllocation.sol';
import '../TokenSale/TokenSale/Crowdsale/Creator.sol';
import '../TokenSale/TokenSale/Token/Token.sol';

contract TestCreator is Creator {
    function createAllocationQueue(Token _token) external returns (AllocationQueue) {
        TestAllocationQueue allocation = new TestAllocationQueue(_token);
        allocation.transferOwnership(msg.sender);
        return AllocationQueue(address(allocation));
    }

    function createPeriodicAllocation(Token _token) external returns (PeriodicAllocation) {
        PeriodicAllocation allocation = new TestPeriodicAllocation(_token);
        allocation.transferOwnership(msg.sender);
        return allocation;
    }
}
