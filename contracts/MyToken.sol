// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title MyToken
 * @dev ERC-20 token with burning, pausing, minting, and permit (gasless approvals) capabilities.
 *
 * Features:
 *  - Fixed initial supply minted to deployer
 *  - Owner can mint additional tokens (up to MAX_SUPPLY)
 *  - Owner can pause/unpause all transfers
 *  - Any holder can burn their own tokens
 *  - EIP-2612 permit support for gasless approvals
 */
contract MyToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ERC20Permit {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18; // 1 billion tokens

    event Minted(address indexed to, uint256 amount);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialOwner
    )
        ERC20(name, symbol)
        Ownable(initialOwner)
        ERC20Permit(name)
    {
        require(initialSupply <= MAX_SUPPLY, "MyToken: initial supply exceeds max supply");
        _mint(initialOwner, initialSupply);
    }

    /**
     * @dev Mint new tokens. Only callable by owner. Cannot exceed MAX_SUPPLY.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "MyToken: minting would exceed max supply");
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /**
     * @dev Pause all token transfers. Only callable by owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers. Only callable by owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // Required override: ERC20Pausable + ERC20 both define _update
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
