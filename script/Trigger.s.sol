// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {console} from "forge-std/console.sol";

import {Common} from "script/Common.s.sol";

import {RewardDistributor} from "contracts/RewardDistributor.sol";
import {ITypes} from "interfaces/ITypes.sol";

/// @dev Script to add a new trigger
contract TriggerScript is Common {
    function run(
        string calldata rewardDistributorAddr,
        string calldata rewardTokenAddr,
        string calldata rewardSourceNftAddr
    ) public {
        vm.startBroadcast(_privateKey);
        RewardDistributor rewardDistributor = RewardDistributor(
            vm.parseAddress(rewardDistributorAddr)
        );

        rewardDistributor.addTrigger(
            vm.parseAddress(rewardTokenAddr),
            vm.parseAddress(rewardSourceNftAddr)
        );
        ITypes.TriggerId triggerId = rewardDistributor.nextTriggerId();
        console.log("TriggerId", ITypes.TriggerId.unwrap(triggerId));
        vm.stopBroadcast();
    }
}
