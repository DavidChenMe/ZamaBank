// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IConfidentialERC20} from "@openzeppelin/confidential-contracts/token/IConfidentialERC20.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";

contract ZamaBank is SepoliaConfig {
    struct Account {
        euint64 balance;        // Encrypted balance
        euint64 lastInterest;   // Encrypted accumulated interest
        uint256 depositTime;   // Last deposit/withdrawal time for interest calculation
        bool exists;           // Whether account exists
    }
    
    mapping(address => Account) private accounts;
    
    IConfidentialERC20 public immutable cUSDT;
    
    // Interest rate: 0.1% daily = 1000 / 1000000 = 0.001
    uint256 public constant DAILY_INTEREST_RATE = 1000; // 0.1% = 1000/1000000
    uint256 public constant RATE_DENOMINATOR = 1000000;
    uint256 public constant SECONDS_PER_DAY = 86400;
    
    event Deposit(address indexed user, uint256 timestamp);
    event Withdrawal(address indexed user, uint256 timestamp);
    event InterestCalculated(address indexed user, uint256 timestamp);
    
    constructor(address _cUSDT) {
        cUSDT = IConfidentialERC20(_cUSDT);
    }
    
    function deposit(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        require(accounts[msg.sender].exists == false || accounts[msg.sender].depositTime > 0, "Invalid account state");
        
        // Convert external encrypted input to internal encrypted type
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Calculate interest before deposit if account exists
        if (accounts[msg.sender].exists) {
            _updateInterest(msg.sender);
        } else {
            // Initialize new account
            accounts[msg.sender] = Account({
                balance: FHE.asEuint64(0),
                lastInterest: FHE.asEuint64(0),
                depositTime: block.timestamp,
                exists: true
            });
        }
        
        // Add to balance
        accounts[msg.sender].balance = FHE.add(accounts[msg.sender].balance, amount);
        accounts[msg.sender].depositTime = block.timestamp;
        
        // Set ACL permissions
        FHE.allowThis(accounts[msg.sender].balance);
        FHE.allow(accounts[msg.sender].balance, msg.sender);
        FHE.allowThis(accounts[msg.sender].lastInterest);
        FHE.allow(accounts[msg.sender].lastInterest, msg.sender);
        
        // Transfer cUSDT from user to contract (confidential transfer)
        // Note: User needs to approve this contract first with encrypted amount
        FHE.allowTransient(amount, address(cUSDT));
        cUSDT.transferFrom(msg.sender, address(this), amount);
        
        emit Deposit(msg.sender, block.timestamp);
    }
    
    function withdraw(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        require(accounts[msg.sender].exists, "Account does not exist");
        
        euint64 withdrawAmount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Update interest before withdrawal
        _updateInterest(msg.sender);
        
        // Calculate total available (balance + interest)
        euint64 totalAvailable = FHE.add(accounts[msg.sender].balance, accounts[msg.sender].lastInterest);
        
        // Check if withdrawal amount is valid
        ebool canWithdraw = FHE.le(withdrawAmount, totalAvailable);
        
        // Conditional withdrawal using FHE.select
        euint64 actualWithdrawAmount = FHE.select(canWithdraw, withdrawAmount, FHE.asEuint64(0));
        
        // Subtract from available funds (balance first, then interest)
        euint64 remainingWithdraw = actualWithdrawAmount;
        
        // Subtract from balance first
        ebool balanceEnough = FHE.le(actualWithdrawAmount, accounts[msg.sender].balance);
        euint64 balanceDeduction = FHE.select(balanceEnough, actualWithdrawAmount, accounts[msg.sender].balance);
        accounts[msg.sender].balance = FHE.sub(accounts[msg.sender].balance, balanceDeduction);
        
        // If balance wasn't enough, subtract remainder from interest
        remainingWithdraw = FHE.sub(actualWithdrawAmount, balanceDeduction);
        accounts[msg.sender].lastInterest = FHE.sub(accounts[msg.sender].lastInterest, remainingWithdraw);
        
        // Update timestamp
        accounts[msg.sender].depositTime = block.timestamp;
        
        // Set ACL permissions
        FHE.allowThis(accounts[msg.sender].balance);
        FHE.allow(accounts[msg.sender].balance, msg.sender);
        FHE.allowThis(accounts[msg.sender].lastInterest);
        FHE.allow(accounts[msg.sender].lastInterest, msg.sender);
        
        // Transfer cUSDT to user (confidential transfer)
        FHE.allowTransient(actualWithdrawAmount, address(cUSDT));
        cUSDT.transfer(msg.sender, actualWithdrawAmount);
        
        emit Withdrawal(msg.sender, block.timestamp);
    }
    
    function updateInterest() external {
        require(accounts[msg.sender].exists, "Account does not exist");
        _updateInterest(msg.sender);
    }
    
    function _updateInterest(address user) internal {
        if (!accounts[user].exists || accounts[user].depositTime == 0) {
            return;
        }
        
        uint256 timeElapsed = block.timestamp - accounts[user].depositTime;
        uint256 fullDays = timeElapsed / SECONDS_PER_DAY;
        
        if (fullDays > 0) {
            // Calculate interest for full days only
            // Interest = balance * (DAILY_INTEREST_RATE / RATE_DENOMINATOR) * fullDays
            euint64 dailyInterest = FHE.mul(accounts[user].balance, DAILY_INTEREST_RATE);
            dailyInterest = FHE.div(dailyInterest, RATE_DENOMINATOR);
            euint64 totalNewInterest = FHE.mul(dailyInterest, uint64(fullDays));
            
            // Add to existing interest
            accounts[user].lastInterest = FHE.add(accounts[user].lastInterest, totalNewInterest);
            
            // Update deposit time to the start of the next incomplete day
            accounts[user].depositTime = accounts[user].depositTime + (fullDays * SECONDS_PER_DAY);
            
            emit InterestCalculated(user, block.timestamp);
        }
    }
    
    // View functions for encrypted balances
    function getBalance() external view returns (euint64) {
        require(accounts[msg.sender].exists, "Account does not exist");
        return accounts[msg.sender].balance;
    }
    
    function getInterest() external view returns (euint64) {
        require(accounts[msg.sender].exists, "Account does not exist");
        return accounts[msg.sender].lastInterest;
    }
    
    function getDepositTime() external view returns (uint256) {
        require(accounts[msg.sender].exists, "Account does not exist");
        return accounts[msg.sender].depositTime;
    }
    
    function accountExists(address user) external view returns (bool) {
        return accounts[user].exists;
    }
    
    // Helper function to get total balance (balance + interest)
    function getTotalBalance() external view returns (euint64) {
        require(accounts[msg.sender].exists, "Account does not exist");
        return FHE.add(accounts[msg.sender].balance, accounts[msg.sender].lastInterest);
    }
}