// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {console} from "forge-std/console.sol";

import {Common} from "script/Common.s.sol";

import {RewardDistributor} from "contracts/RewardDistributor.sol";
import {ITypes} from "interfaces/ITypes.sol";

/// @dev Script to add a new trigger
contract TriggerScript is Common {
    function run(string calldata rewardDistributorAddr) public {
        vm.startBroadcast(_privateKey);
        RewardDistributor rewardDistributor = RewardDistributor(
            payable(vm.parseAddress(rewardDistributorAddr))
        );

        rewardDistributor.addTrigger();
        ITypes.TriggerId triggerId = rewardDistributor.nextTriggerId();
        console.log("TriggerId", ITypes.TriggerId.unwrap(triggerId));
        vm.stopBroadcast();
    }
}
