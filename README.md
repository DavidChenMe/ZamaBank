# ZamaBank - Privacy-First Banking with Fully Homomorphic Encryption

[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![Zama](https://img.shields.io/badge/Built%20with-Zama%20FHE-brightgreen)](https://zama.ai)
[![Sepolia](https://img.shields.io/badge/Network-Sepolia%20Testnet-orange)](https://sepolia.etherscan.io)

> **The world's first privacy-preserving decentralized bank powered by Fully Homomorphic Encryption (FHE)**

ZamaBank revolutionizes traditional banking by enabling users to store, manage, and earn interest on their cUSDT deposits while maintaining complete privacy. Using Zama's cutting-edge FHE technology, all deposit amounts, balances, and transactions remain encrypted on-chain, ensuring that no one—not even the blockchain validators—can see your financial data.

## 🎯 Project Vision

ZamaBank addresses the fundamental privacy gap in traditional DeFi protocols where transaction amounts and balances are visible to everyone. Our mission is to create a banking experience that combines the transparency and decentralization of blockchain technology with the privacy guarantees that users deserve and expect from traditional financial institutions.

## ✨ Key Features

### 🔐 Complete Privacy
- **Encrypted Deposits**: All deposit amounts are encrypted using FHE, invisible to external observers
- **Private Balances**: User balances remain confidential while still being verifiable on-chain
- **Confidential Transactions**: Deposit and withdrawal amounts are never revealed publicly
- **Interest Privacy**: Even interest calculations remain encrypted and private

### 💰 Automated Interest System
- **Daily Compounding**: Earn 0.1% daily interest (36.5% APY) on all deposits
- **Continuous Accrual**: Interest accrues every second, not just daily
- **Auto-Claim**: Interest is automatically claimed when depositing or withdrawing
- **Manual Claim**: Users can claim accumulated interest at any time

### 🛡️ Security & Trust
- **No Custodial Risk**: Smart contracts handle all funds without centralized control
- **Mathematically Secure**: FHE provides cryptographic guarantees of data privacy
- **Auditable Code**: Open-source smart contracts deployed on Ethereum Sepolia testnet
- **Zama Integration**: Built on battle-tested FHE infrastructure

### 🚀 User Experience
- **One-Click Operations**: Simple deposit, withdraw, and claim interfaces
- **Real-Time Updates**: Live interest calculation displays updated every second
- **Web3 Wallet Integration**: Seamless connection with MetaMask and other wallets
- **Responsive Design**: Optimized for desktop and mobile devices

## 🏗️ Technology Stack

### Blockchain & Smart Contracts
- **Solidity 0.8.24+**: Latest Ethereum smart contract development
- **Hardhat Framework**: Professional development, testing, and deployment tools
- **Zama FHEVM**: Fully Homomorphic Encryption Virtual Machine integration
- **OpenZeppelin**: Security-audited contract libraries for safety

### Frontend Development
- **React 18**: Modern, component-based user interface framework
- **TypeScript**: Type-safe development for reduced bugs and better maintainability
- **Vite**: Lightning-fast build tool and development server
- **Viem**: Lightweight, performant Ethereum library for reading blockchain data
- **Ethers.js**: Robust library for blockchain write operations and wallet integration

### Web3 Integration
- **RainbowKit**: Beautiful, customizable wallet connection interface
- **Wagmi**: React hooks for Ethereum, simplifying Web3 development
- **TanStack Query**: Powerful data synchronization for Web3 applications

### Privacy & Encryption
- **Zama Relayer SDK**: Client-side encryption and decryption capabilities
- **FHE Cryptography**: Mathematical proofs ensuring computational privacy
- **Zero-Knowledge Proofs**: Cryptographic verification without data exposure

### Development Tools
- **ESLint & Prettier**: Code quality and formatting standards
- **TypeChain**: Type-safe smart contract interactions
- **Hardhat Deploy**: Automated, reproducible smart contract deployments

## 🔧 Technical Architecture

### Smart Contract Layer

#### ZamaBank.sol
The core banking contract implementing:
- **Encrypted State Management**: User deposits stored as `euint64` encrypted integers
- **Interest Calculation**: Continuous per-second interest accrual algorithm
- **Access Control**: Zama ACL system ensuring only authorized access to encrypted data
- **Safe Mathematics**: Overflow-protected arithmetic operations on encrypted values

#### cUSDT.sol
Confidential token contract featuring:
- **ERC20 Compatibility**: Standard token interface with encryption extensions
- **Faucet Functionality**: Test token minting for development and testing
- **Operator System**: Delegated transfer permissions for banking operations

### Frontend Architecture

#### React Component Structure
```
src/
├── components/
│   ├── BankApp.tsx          # Main banking interface
│   └── Header.tsx           # Navigation and wallet connection
├── hooks/
│   ├── useZamaInstance.ts   # FHE encryption service management
│   └── useEthersSigner.ts   # Wallet integration utilities
├── config/
│   ├── wagmi.ts            # Web3 connection configuration
│   └── contracts.ts        # Smart contract addresses and ABIs
└── styles/
    └── Bank.css            # UI styling and responsive design
```

#### Data Flow
1. **User Input**: Form data captured and validated client-side
2. **FHE Encryption**: Sensitive data encrypted using Zama instance before sending
3. **Smart Contract**: Encrypted operations performed on-chain without decryption
4. **Result Handling**: Encrypted responses processed and displayed to user
5. **Decryption**: User can decrypt their own data using private keys when needed

### Encryption Workflow

#### Deposit Process
1. User enters deposit amount in plain text
2. Frontend encrypts amount using Zama FHE
3. Encrypted amount sent to smart contract
4. Contract performs encrypted addition to user's balance
5. Balance remains encrypted on-chain

#### Interest Calculation
1. Contract reads encrypted principal balance
2. Calculates elapsed time since last accrual
3. Performs encrypted multiplication: `interest = principal × time × rate`
4. Updates user's accrued interest without revealing amounts

#### Withdrawal Process
1. User requests withdrawal amount (encrypted)
2. Contract verifies sufficient balance using encrypted comparison
3. Performs encrypted subtraction from balance
4. Transfers encrypted amount if sufficient funds available

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 20.0.0
- **npm** ≥ 7.0.0
- **Git** for version control
- **MetaMask** or compatible Web3 wallet
- **Sepolia ETH** for transaction fees

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/ZamaBank.git
   cd ZamaBank
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   PRIVATE_KEY=your_private_key_here
   INFURA_API_KEY=your_infura_api_key
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

4. **Compile Smart Contracts**
   ```bash
   npm run compile
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

### Development

#### Local Development
```bash
# Start local Hardhat network
npx hardhat node

# Deploy contracts to local network
npm run deploy

# Start frontend development server
cd home
npm install
npm run dev
```

#### Sepolia Testnet Deployment
```bash
# Deploy to Sepolia testnet
npm run deploy:sepolia

# Verify contracts on Etherscan
npx hardhat verify --network sepolia <contract-address>
```

### Frontend Development

1. **Navigate to Frontend Directory**
   ```bash
   cd home
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## 📖 Usage Guide

### Getting Started

1. **Connect Your Wallet**
   - Click "Connect Wallet" in the top-right corner
   - Select your preferred wallet (MetaMask recommended)
   - Ensure you're connected to Sepolia testnet

2. **Get Test Tokens**
   - Click "Get Test Tokens" to mint cUSDT to your wallet
   - Enter the amount you want to mint (default: 100 cUSDT)
   - Confirm the transaction in your wallet

3. **Approve Token Operations**
   - Click "Approve cUSDT" to allow the bank to manage your tokens
   - This approval is required for deposits and lasts 30 days
   - Confirm the approval transaction

### Banking Operations

#### Making a Deposit
1. Enter the amount you want to deposit in the "Deposit Amount" field
2. Click "Deposit" and confirm the transaction
3. Your encrypted balance will be updated (decrypt to view)
4. Interest begins accruing immediately

#### Withdrawing Funds
1. Enter the amount you want to withdraw in the "Withdraw Amount" field
2. Click "Withdraw" and confirm the transaction
3. Any accrued interest is automatically claimed first
4. Funds are transferred to your wallet

#### Claiming Interest
1. Click "Claim Interest" to collect your accrued interest
2. Interest is calculated based on elapsed time since last claim
3. Claimed interest is transferred to your wallet
4. Interest calculation resets for the next period

#### Viewing Balances
1. Click "Decrypt Balance" to view your bank deposit
2. Click "Decrypt Wallet" to view your cUSDT wallet balance
3. Decryption requires signing a message with your wallet
4. Balances are displayed in clear text after decryption

## 🔍 How It Works

### The Privacy Problem in Traditional DeFi

Traditional DeFi protocols operate with complete transparency, meaning:
- All transaction amounts are publicly visible
- Account balances can be tracked by anyone
- Financial patterns and behaviors are exposed
- Privacy is non-existent for users

### ZamaBank's FHE Solution

**Fully Homomorphic Encryption (FHE)** allows computations to be performed on encrypted data without ever decrypting it. This means:

1. **Data Encryption**: All sensitive financial data is encrypted before being stored on-chain
2. **Encrypted Computation**: Mathematical operations (addition, subtraction, multiplication) are performed directly on encrypted values
3. **Result Privacy**: Computation results remain encrypted until the authorized user chooses to decrypt them
4. **Selective Disclosure**: Users can prove computations were performed correctly without revealing the underlying data

### Interest Calculation Algorithm

```solidity
// Simplified interest calculation
uint256 elapsedSeconds = block.timestamp - lastAccruedAt[user];
euint64 principal = deposits[user];
euint64 interest = (principal * elapsedSeconds) / RATE_DENOMINATOR;
```

- **Rate**: 0.1% per day = 1/1000 per day = 1/(1000 × 86400) per second
- **Continuous Accrual**: Interest compounds every second, not just daily
- **Encrypted Operations**: All calculations performed on encrypted values
- **Precision**: Uses 6-decimal precision for accurate micro-interest calculations

### Security Model

#### Cryptographic Security
- **FHE Guarantees**: Computationally impossible to decrypt without private keys
- **Semantic Security**: Identical plaintexts produce different ciphertexts
- **Circuit Privacy**: Computation patterns don't leak information about inputs

#### Smart Contract Security
- **Access Control Lists (ACL)**: Zama's ACL system controls data access permissions
- **Overflow Protection**: SafeMath libraries prevent arithmetic vulnerabilities
- **Reentrancy Guards**: Protection against recursive call attacks
- **Input Validation**: All user inputs validated before processing

#### Operational Security
- **Decentralized Infrastructure**: No single point of failure
- **Open Source**: All code publicly auditable
- **Immutable Contracts**: Deployed contracts cannot be modified maliciously
- **Testnet Deployment**: Reduced risk for experimental features

## 🎯 Advantages Over Traditional Solutions

### Versus Traditional Banks
| Feature | Traditional Banks | ZamaBank |
|---------|------------------|----------|
| **Privacy** | Internal privacy only | Cryptographic privacy |
| **Transparency** | Opaque operations | Auditable smart contracts |
| **Access** | Geographic/regulatory limits | Global, permissionless |
| **Censorship** | Possible account freezing | Censorship resistant |
| **Interest Rates** | 0.01-2% annually | 36.5% APY (testnet) |
| **Operating Hours** | Business hours only | 24/7/365 availability |

### Versus Traditional DeFi
| Feature | Traditional DeFi | ZamaBank |
|---------|-----------------|----------|
| **Privacy** | All transactions public | All amounts encrypted |
| **MEV Protection** | Vulnerable to front-running | Encrypted amounts prevent MEV |
| **Regulatory Compliance** | Difficult with transparency | Privacy enables compliance |
| **User Experience** | Complex privacy tools needed | Built-in privacy by default |
| **Institutional Adoption** | Limited by transparency | Enterprise-ready privacy |

### Versus Privacy Coins
| Feature | Privacy Coins | ZamaBank |
|---------|---------------|----------|
| **Programmability** | Limited smart contracts | Full smart contract capabilities |
| **Ecosystem** | Isolated networks | Ethereum ecosystem access |
| **Auditability** | Difficult compliance | Selective disclosure possible |
| **Development** | Specialized knowledge required | Standard Solidity development |

## 🛣️ Future Roadmap

### Phase 1: Foundation (Current)
- ✅ Core FHE banking functionality
- ✅ Basic interest calculation system
- ✅ Sepolia testnet deployment
- ✅ Web interface with wallet integration
- ✅ Encrypted balance management

### Phase 2: Enhanced Features (Q2 2024)
- 🔄 **Variable Interest Rates**: Market-driven interest rate mechanisms
- 🔄 **Loan System**: Confidential lending and borrowing protocols
- 🔄 **Multi-Token Support**: Support for additional encrypted assets
- 🔄 **Mobile Application**: Native iOS and Android applications
- 🔄 **Advanced Analytics**: Private portfolio tracking and insights

### Phase 3: DeFi Integration (Q3 2024)
- 📋 **DEX Integration**: Privacy-preserving decentralized exchange features
- 📋 **Yield Farming**: Confidential liquidity mining programs
- 📋 **Insurance Products**: Encrypted insurance and risk management
- 📋 **Cross-Chain Bridge**: Multi-chain encrypted asset transfers
- 📋 **DAO Governance**: Privacy-preserving voting mechanisms

### Phase 4: Institutional (Q4 2024)
- 📋 **Mainnet Deployment**: Production-ready Ethereum mainnet launch
- 📋 **Regulatory Compliance**: KYC/AML integration with privacy preservation
- 📋 **Enterprise API**: Business-grade integration capabilities
- 📋 **Audit & Security**: Professional security audits and bug bounties
- 📋 **Institutional Partnerships**: Banking and fintech integrations

### Phase 5: Advanced Privacy (2025)
- 📋 **Zero-Knowledge Proofs**: ZK-SNARK integration for enhanced privacy
- 📋 **Quantum Resistance**: Post-quantum cryptographic upgrades
- 📋 **Layer 2 Integration**: Scaling solutions with privacy preservation
- 📋 **AI-Powered Features**: Encrypted machine learning for financial insights
- 📋 **Global Expansion**: Multi-jurisdiction regulatory compliance

## 🤝 Contributing

We welcome contributions from developers, researchers, and privacy advocates! Here's how you can get involved:

### Development Contributions
1. **Fork the Repository** and create a feature branch
2. **Follow Coding Standards** using ESLint and Prettier configurations
3. **Write Tests** for all new functionality
4. **Submit Pull Requests** with detailed descriptions of changes
5. **Code Review** participate in community code reviews

### Bug Reports & Feature Requests
1. **Check Existing Issues** to avoid duplicates
2. **Provide Detailed Information** including reproduction steps
3. **Use Issue Templates** for consistent reporting
4. **Label Appropriately** to help with organization

### Documentation Improvements
1. **Update README** for new features or changes
2. **Improve Code Comments** for better understanding
3. **Create Tutorials** for common use cases
4. **Translate Documentation** for international users

### Research & Development
1. **FHE Optimization** improving encryption performance
2. **Security Analysis** identifying potential vulnerabilities
3. **Privacy Research** advancing confidential computing
4. **Cryptographic Improvements** enhancing security models

## 📄 License

This project is licensed under the **BSD 3-Clause Clear License**. See the [LICENSE](LICENSE) file for details.

The BSD 3-Clause Clear License is chosen to:
- Promote open source development and collaboration
- Allow commercial use while maintaining attribution
- Provide legal clarity for enterprise adoption
- Ensure compatibility with other open source projects

## 🔗 Links & Resources

### Project Links
- **Website**: [Coming Soon]
- **Documentation**: [GitHub Wiki](https://github.com/your-username/ZamaBank/wiki)
- **Issue Tracker**: [GitHub Issues](https://github.com/your-username/ZamaBank/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/ZamaBank/discussions)

### Zama Ecosystem
- **Zama**: [https://zama.ai](https://zama.ai)
- **FHEVM Documentation**: [https://docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)
- **Zama Community**: [https://community.zama.ai](https://community.zama.ai)
- **Zama Discord**: [Discord Server](https://discord.com/invite/fhe-org)

### Technical Resources
- **Ethereum Sepolia**: [https://sepolia.etherscan.io](https://sepolia.etherscan.io)
- **Hardhat Framework**: [https://hardhat.org](https://hardhat.org)
- **React Documentation**: [https://react.dev](https://react.dev)
- **Viem Library**: [https://viem.sh](https://viem.sh)

## 🏆 Acknowledgments

### Technology Partners
- **Zama**: For providing the revolutionary FHE technology that makes confidential smart contracts possible
- **Ethereum Foundation**: For creating the robust blockchain infrastructure that powers ZamaBank
- **OpenZeppelin**: For security-audited smart contract libraries and best practices

### Development Tools
- **Hardhat Team**: For the comprehensive development framework
- **Wagmi Contributors**: For excellent Web3 React hooks and utilities
- **RainbowKit Team**: For beautiful wallet connection interfaces
- **Viem Developers**: For performant and type-safe Ethereum interactions

### Community
- **Early Testers**: Community members who provided valuable feedback during development
- **Privacy Advocates**: Researchers and activists pushing for financial privacy rights
- **Open Source Contributors**: Developers who contribute code, documentation, and improvements

---

**ZamaBank** - Where Privacy Meets DeFi 🏦🔐

*Built with ❤️ for a more private financial future*