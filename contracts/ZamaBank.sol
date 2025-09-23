// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IConfidentialFungibleToken} from "new-confidential-contracts/interfaces/IConfidentialFungibleToken.sol";
import {IConfidentialFungibleTokenReceiver} from "new-confidential-contracts/interfaces/IConfidentialFungibleTokenReceiver.sol";
import {FHESafeMath} from "new-confidential-contracts/utils/FHESafeMath.sol";

/// @title ZamaBank - Confidential cUSDT bank with daily interest
/// @notice Users deposit confidential cUSDT and earn 0.1% daily interest (full days only).
///         Interest is funded by the owner by transferring cUSDT to this contract.
///         Interest is auto-claimed on deposit and withdraw, and can be claimed anytime.
contract ZamaBank is SepoliaConfig, IConfidentialFungibleTokenReceiver {
    using FHESafeMath for euint64;

    IConfidentialFungibleToken public immutable token; // cUSDT

    // Encrypted principal deposit per user
    mapping(address => euint64) private _deposits;
    // Last time interest was accrued (timestamp), remainder carried over
    mapping(address => uint256) private _lastAccruedAt;

    // 0.1% per day -> denominator 1000
    uint64 public constant DAILY_RATE_DENOM = 1000;

    event Deposited(address indexed user, euint64 amount, uint256 timestamp);
    event Withdrawn(address indexed user, euint64 amount, uint256 timestamp);
    event InterestClaimed(address indexed user, euint64 amount, uint256 daysAccrued);

    constructor(address token_) {
        require(token_ != address(0), "Invalid token");
        token = IConfidentialFungibleToken(token_);
    }

    // View: encrypted principal balance
    function getDeposit(address user) external view returns (euint64) {
        return _deposits[user];
    }

    // View: last accrued timestamp (used by frontend to compute interest off-chain)
    function getLastAccruedAt(address user) external view returns (uint256) {
        return _lastAccruedAt[user];
    }

    // User can claim accrued interest (full days only)
    function claimInterest() external {
        (euint64 interest, uint256 daysAccrued) = _computeInterest(msg.sender);
        if (daysAccrued == 0) {
            // nothing to do
            return;
        }

        // Advance accrual time by full days accrued
        _lastAccruedAt[msg.sender] += daysAccrued * 1 days;

        // Allow this contract to use the ciphertext and pay interest
        FHE.allowThis(interest);
        token.confidentialTransfer(msg.sender, interest);

        emit InterestClaimed(msg.sender, interest, daysAccrued);
    }

    // Withdraw principal. Auto-claims interest first.
    function withdraw(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        // Auto-claim interest
        _autoClaimInterest(msg.sender);

        // Requested amount
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Safely decrease user's encrypted deposit (no branch leakage)
        ( , euint64 updated) = FHESafeMath.tryDecrease(_deposits[msg.sender], amount);
        // Determine actually allowed withdrawal: if decrease failed, withdraw 0
        ebool canWithdraw = FHE.ge(_deposits[msg.sender], amount);
        euint64 toWithdraw = FHE.select(canWithdraw, amount, FHE.asEuint64(0));

        // Persist updated encrypted deposit
        FHE.allowThis(updated);
        FHE.allow(updated, msg.sender);
        _deposits[msg.sender] = updated;

        // Transfer confidential tokens from bank to user
        FHE.allowThis(toWithdraw);
        token.confidentialTransfer(msg.sender, toWithdraw);

        emit Withdrawn(msg.sender, toWithdraw, block.timestamp);
    }

    // Token callback on transferAndCall deposit
    function onConfidentialTransferReceived(
        address /* operator */, 
        address from, 
        euint64 amount, 
        bytes calldata /* data */
    ) external override returns (ebool) {
        require(msg.sender == address(token), "Invalid sender");

        // Auto-claim interest before updating principal
        _autoClaimInterest(from);

        // Increase encrypted principal
        ( , euint64 updated) = FHESafeMath.tryIncrease(_deposits[from], amount);
        FHE.allowThis(updated);
        FHE.allow(updated, from);
        _deposits[from] = updated;

        emit Deposited(from, amount, block.timestamp);
        return FHE.asEbool(true);
    }

    // Internal: compute interest for user based on full days and current principal
    function _computeInterest(address user) internal returns (euint64 interest, uint256 daysAccrued) {
        uint256 last = _lastAccruedAt[user];
        if (last == 0) {
            // Initialize accrual start at first interaction
            return (FHE.asEuint64(0), 0);
        }
        uint256 elapsed = block.timestamp - last;
        daysAccrued = elapsed / 1 days; // floor
        if (daysAccrued == 0) {
            return (FHE.asEuint64(0), 0);
        }

        // interest = principal * days / 1000
        euint64 principal = _deposits[user];
        euint64 d = FHE.asEuint64(uint64(daysAccrued));
        euint64 prod = FHE.mul(principal, d);
        interest = FHE.div(prod, DAILY_RATE_DENOM);
    }

    function _autoClaimInterest(address user) internal {
        // Initialize lastAccruedAt at first interaction
        if (_lastAccruedAt[user] == 0) {
            _lastAccruedAt[user] = block.timestamp;
            return;
        }

        (euint64 interest, uint256 daysAccrued) = _computeInterest(user);
        if (daysAccrued == 0) return;

        // Move forward by full days accrued
        _lastAccruedAt[user] += daysAccrued * 1 days;

        // Pay interest
        FHE.allowThis(interest);
        token.confidentialTransfer(user, interest);
        emit InterestClaimed(user, interest, daysAccrued);
    }
}
