// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {stdJson} from "forge-std/StdJson.sol";

import {Strings} from "@openzeppelin-contracts/utils/Strings.sol";
import {IWavsServiceManager} from "@wavs/interfaces/IWavsServiceManager.sol";

import {Common} from "script/Common.s.sol";

import {RewardDistributor} from "contracts/RewardDistributor.sol";
import {RewardToken} from "contracts/RewardToken.sol";
import {WavsNft} from "contracts/WavsNft.sol";
import {WavsMinter} from "contracts/WavsMinter.sol";

/// @dev Deployment script for RewardDistributor contract
contract DeployScript is Common {
    using stdJson for string;

    string public root = vm.projectRoot();
    string public script_output_path =
        string.concat(root, "/.docker/script_deploy.json");

    /**
     * @dev Deploys the RewardDistributor contract and writes the results to a JSON file
     * @param serviceManagerAddr The address of the service manager
     */
    function run(string calldata serviceManagerAddr) public {
        address serviceManager = vm.parseAddress(serviceManagerAddr);

        vm.startBroadcast(_privateKey);

        // Create the distributor which handles WAVS stuff.
        RewardDistributor rewardDistributor = new RewardDistributor(
            IWavsServiceManager(serviceManager)
        );

        // Mint reward tokens for the distributor.
        RewardToken rewardToken = new RewardToken();
        rewardToken.mint{value: 0.1 ether}(address(rewardDistributor));

        // Deploy the NFT contract
        WavsNft nft = new WavsNft(
            serviceManager,
            // Use rewards distributor as funds recipient
            address(rewardDistributor)
        );

        // Deploy the minter contract
        WavsMinter minter = new WavsMinter(
            serviceManager,
            // Use rewards distributor as funds recipient
            address(rewardDistributor)
        );

        vm.stopBroadcast();

        string memory _json = "json";
        _json.serialize(
            "reward_distributor",
            Strings.toChecksumHexString(address(rewardDistributor))
        );
        _json.serialize(
            "reward_token",
            Strings.toChecksumHexString(address(rewardToken))
        );
        _json.serialize("nft", Strings.toChecksumHexString(address(nft)));
        string memory finalJson = _json.serialize(
            "minter",
            Strings.toChecksumHexString(address(minter))
        );

        vm.writeFile(script_output_path, finalJson);
    }
}
