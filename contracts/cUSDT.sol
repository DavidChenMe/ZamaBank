// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ConfidentialFungibleToken} from "new-confidential-contracts/token/ConfidentialFungibleToken.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract cUSDT is ConfidentialFungibleToken, SepoliaConfig {
    constructor() ConfidentialFungibleToken("cUSDT", "cUSDT", "") {}

    // Faucet mint: anyone can mint confidential tokens to themselves.
    // The amount is provided as an external encrypted input to preserve privacy.
    function faucetMint(externalEuint64 encryptedAmount, bytes calldata inputProof) external returns (euint64) {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        // Mint to caller
        euint64 minted = _mint(msg.sender, amount);
        return minted;
    }

    function mint(uint64 amount) external returns (euint64) {
        euint64 eamount = FHE.asEuint64(amount);
        // Mint to caller
        euint64 minted = _mint(msg.sender, eamount);
        return minted;
    }
}
