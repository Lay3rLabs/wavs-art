// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Test} from "forge-std/Test.sol";
import {RewardDistributor} from "contracts/RewardDistributor.sol";
import {ITypes} from "interfaces/ITypes.sol";
import {IWavsServiceManager} from "@wavs/interfaces/IWavsServiceManager.sol";

contract TriggerTest is Test {
    RewardDistributor public rewardDistributor;

    function setUp() public {
        rewardDistributor = new RewardDistributor(
            IWavsServiceManager(address(0))
        );
    }

    function testTrigger() public {
        rewardDistributor.addTrigger(address(0), address(1));

        ITypes.TriggerId triggerId = ITypes.TriggerId.wrap(1);
        ITypes.TriggerInfo memory trigger = rewardDistributor.getTrigger(
            triggerId
        );

        assertEq(trigger.creator, address(this));
        assertEq(trigger.data, abi.encodePacked(address(0), address(1)));
        assertEq(
            ITypes.TriggerId.unwrap(trigger.triggerId),
            ITypes.TriggerId.unwrap(triggerId)
        );
    }
}
