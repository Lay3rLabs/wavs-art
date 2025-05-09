// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC721} from "@openzeppelin-contracts/token/ERC721/ERC721.sol";

contract RewardSourceERC721 is ERC721 {
    // Mapping to track if an address is a holder
    mapping(address => bool) public isHolder;
    // Array to store all unique holders
    address[] private holders;

    constructor() ERC721("RewardSource", "RSNFT") {}

    // Let anyone mint an NFT.
    function mint(address to, uint256 tokenId) external {
        _safeMint(to, tokenId);
        // Add to holders if not already tracked
        if (!isHolder[to]) {
            isHolder[to] = true;
            holders.push(to);
        }
    }

    // Override _safeTransfer to track holders when NFTs are transferred
    function _safeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal virtual override {
        super._safeTransfer(from, to, tokenId, data);
        
        // Add new holder if not already tracked
        if (!isHolder[to]) {
            isHolder[to] = true;
            holders.push(to);
        }
    }

    // Override transferFrom to track holders when NFTs are transferred
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        super.transferFrom(from, to, tokenId);
        
        // Add new holder if not already tracked
        if (!isHolder[to]) {
            isHolder[to] = true;
            holders.push(to);
        }
    }

    // Function to get all holders
    function getAllHolders() external view returns (address[] memory) {
        return holders;
    }

    // Function to get the number of holders
    function getHolderCount() external view returns (uint256) {
        return holders.length;
    }
}
