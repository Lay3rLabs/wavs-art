// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WavsNft} from "contracts/WavsNft.sol";
import {WavsMinter} from "contracts/WavsMinter.sol";
import {IWavsNftServiceTypes} from "interfaces/IWavsNftServiceTypes.sol";
import {Common} from "./Common.s.sol";
import {Strings} from "@openzeppelin-contracts/utils/Strings.sol";

/// @dev Script to show the NFT
contract ShowNft is Common {
    function run(address _nftAddr, address _minterAddr) public view {
        console.log(
            "Using NFT address:",
            Strings.toHexString(uint160(_nftAddr))
        );
        console.log(
            "Using minter address:",
            Strings.toHexString(uint160(_minterAddr))
        );

        WavsNft nft = WavsNft(_nftAddr);
        WavsMinter minter = WavsMinter(_minterAddr);

        // Display NFT information
        uint256 nextTokenId = nft.nextTokenId();
        if (nextTokenId == 0) {
            console.log("No NFTs minted yet");
        } else {
            uint256 lastTokenId = nextTokenId - 1;
            console.log("Last token ID:", lastTokenId);

            string memory dataURI = nft.tokenURI(lastTokenId);
            console.log("Token URI:", dataURI);

            // Extract base64 data for decoding, only if dataURI starts with "data:application/json;base64,"
            bytes memory dataURIBytes = bytes(dataURI);
            bytes memory base64Prefix = bytes("data:application/json;base64,");

            // Check if the dataURI starts with the expected prefix. Otherwise
            // it's probably an IPFS URI in plain text.
            bool hasPrefix = true;
            if (dataURIBytes.length < base64Prefix.length) {
                hasPrefix = false;
            } else {
                for (uint256 i = 0; i < base64Prefix.length; i++) {
                    if (dataURIBytes[i] != base64Prefix[i]) {
                        hasPrefix = false;
                        break;
                    }
                }
            }

            if (hasPrefix) {
                bytes memory data = new bytes(
                    dataURIBytes.length - base64Prefix.length
                );
                for (uint256 i = 0; i < data.length; i++) {
                    data[i] = dataURIBytes[base64Prefix.length + i];
                }
                console.log(
                    string.concat(
                        'Run `echo "',
                        string(data),
                        '" | base64 --decode` to view the data'
                    )
                );
            }
        }

        // Display minter receipts information
        IWavsNftServiceTypes.TriggerId nextTriggerId = minter.nextTriggerId();
        if (IWavsNftServiceTypes.TriggerId.unwrap(nextTriggerId) == 0) {
            console.log("No triggers created yet");
            return;
        }

        // Display information for all triggers
        for (
            uint64 i = 0;
            i < IWavsNftServiceTypes.TriggerId.unwrap(nextTriggerId);
            i++
        ) {
            IWavsNftServiceTypes.TriggerId triggerId = IWavsNftServiceTypes
                .TriggerId
                .wrap(i);
            WavsMinter.Receipt memory receipt = minter.getTrigger(triggerId);

            // Only display if there's a valid creator address
            if (receipt.creator != address(0)) {
                console.log("\n--- Trigger ID:", i, "---");
                console.log(
                    "Creator:",
                    Strings.toHexString(uint160(receipt.creator))
                );
                console.log("Prompt:", receipt.prompt);
                console.log("Type:", uint8(receipt.wavsTriggerType));
                console.log("Fulfilled:", receipt.fulfilled);
            }
        }
    }
}
