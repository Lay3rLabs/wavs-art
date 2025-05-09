// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {stdJson} from "forge-std/StdJson.sol";

import {Strings} from "@openzeppelin-contracts/utils/Strings.sol";
import {IWavsServiceManager} from "@wavs/interfaces/IWavsServiceManager.sol";

import {Common} from "script/Common.s.sol";

import {RewardDistributor} from "contracts/RewardDistributor.sol";
import {RewardSourceERC721} from "contracts/RewardSourceERC721.sol";
import {RewardERC20} from "contracts/RewardERC20.sol";

/// @dev Deployment script for RewardDistributor contract
contract DeployScript is Common {
    using stdJson for string;

    string public root = vm.projectRoot();
    string public script_output_path =
        string.concat(root, "/.docker/script_deploy.json");

    /**
     * @dev Deploys the RewardDistributor contract and writes the results to a JSON file
     * @param rewardDistributorAddr The address of the reward distributor
     */
    function run(string calldata rewardDistributorAddr) public {
        vm.startBroadcast(_privateKey);

        // Create the distributor which handles WAVS stuff.
        RewardDistributor rewardDistributor = new RewardDistributor(
            IWavsServiceManager(vm.parseAddress(rewardDistributorAddr))
        );

        // Mint reward tokens for the distributor.
        RewardERC20 rewardERC20 = new RewardERC20();
        rewardERC20.mint(address(rewardDistributor), 1000e18);

        // Create NFT that is used as source of rewards calculation.
        RewardSourceERC721 rewardSourceERC721 = new RewardSourceERC721();
        // Mint 3 NFTs to the deployer.
        address deployer = vm.addr(_privateKey);
        rewardSourceERC721.mint(deployer, 1);
        rewardSourceERC721.mint(deployer, 2);
        rewardSourceERC721.mint(deployer, 3);

        vm.stopBroadcast();

        string memory _json = "json";
        _json.serialize(
            "reward_distributor",
            Strings.toHexString(address(rewardDistributor))
        );
        _json.serialize(
            "reward_token",
            Strings.toHexString(address(rewardERC20))
        );
        string memory _finalJson = _json.serialize(
            "reward_source_nft",
            Strings.toHexString(address(rewardSourceERC721))
        );
        vm.writeFile(script_output_path, _finalJson);
    }
}
