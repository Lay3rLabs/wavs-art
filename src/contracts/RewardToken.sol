// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin-contracts/token/ERC20/ERC20.sol";

/**
 * @title RewardToken
 * @notice A simple ERC20 token that wraps ETH.
 */
contract RewardToken is ERC20 {
    constructor() ERC20("RewardToken", "RT") {}

    // Let anyone mint tokens, paying for them with ETH.
    function mint(address to) external payable {
        require(msg.value > 0, "Must pay with ETH");
        _mint(to, msg.value);
    }

    // Let anyone burn tokens to get their ETH back.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
    }
}
