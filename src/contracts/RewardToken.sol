// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin-contracts/token/ERC20/ERC20.sol";

/**
 * @title RewardToken
 * @notice A simple ERC20 token that supports minting and auto-minting on
 * transfer.
 */
contract RewardToken is ERC20 {
    // Set who can mint tokens.
    address public minter;

    constructor(address minter_) ERC20("RewardToken", "RT") {
        if (minter_ == address(0)) {
            minter = msg.sender;
        } else {
            minter = minter_;
        }
    }

    // Update who can mint tokens.
    function setMinter(address minter_) external {
        require(msg.sender == minter, "Only the minter can set a new minter");
        minter = minter_;
    }

    // Mint tokens.
    function mint(address to, uint256 amount) public {
        require(msg.sender == minter, "Only the minter can mint tokens");
        _mint(to, amount);
    }

    // If trying to transfer from the minter but not enough balance, mint more.
    // This lets the reward distributor auto-mint on reward claim.
    function transfer(
        address to,
        uint256 value
    ) public virtual override returns (bool) {
        if (msg.sender == minter && balanceOf(msg.sender) < value) {
            mint(msg.sender, value - balanceOf(msg.sender));
        }
        return super.transfer(to, value);
    }
}
