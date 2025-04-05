// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BasicToken is ERC20, Ownable {
    constructor(address initialOwner) 
        ERC20("BasicToken", "BTK") 
        Ownable(initialOwner)
    {
        // Mint 1 million tokens to the deployer
        // Since ERC20 uses 18 decimals, we multiply by 10^18
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // Function to mint new tokens (only owner can call)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // Function to burn tokens
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
} 