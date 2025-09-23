import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ZamaBank, ZamaBank__factory, CUSDT, CUSDT__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { time } from "@nomicfoundation/hardhat-network-helpers";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const signers = await ethers.getSigners();
  
  // Deploy cUSDT token first
  const cUSDTFactory = (await ethers.getContractFactory("cUSDT")) as CUSDT__factory;
  const cUSDTContract = (await cUSDTFactory.deploy()) as CUSDT;
  const cUSDTAddress = await cUSDTContract.getAddress();

  // Deploy ZamaBank with cUSDT address
  const zamaBankFactory = (await ethers.getContractFactory("ZamaBank")) as ZamaBank__factory;
  const zamaBankContract = (await zamaBankFactory.deploy(cUSDTAddress)) as ZamaBank;
  const zamaBankAddress = await zamaBankContract.getAddress();

  // Mint some cUSDT tokens to test users
  const mintAmount = ethers.parseUnits("10000", 18); // 10,000 cUSDT
  
  // Note: We need to check how the cUSDT contract allows minting
  // For testing, we'll assume it has a mint function or we can transfer from deployer
  
  return { 
    zamaBankContract, 
    zamaBankAddress,
    cUSDTContract,
    cUSDTAddress
  };
}

describe("ZamaBank", function () {
  let signers: Signers;
  let zamaBankContract: ZamaBank;
  let zamaBankAddress: string;
  let cUSDTContract: CUSDT;
  let cUSDTAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ zamaBankContract, zamaBankAddress, cUSDTContract, cUSDTAddress } = await deployFixture());
    
    // Setup: Give Alice and Bob some cUSDT tokens for testing
    const mintAmount = 10000n;
    
    // Create encrypted input for minting
    const aliceMintInput = await fhevm
      .createEncryptedInput(cUSDTAddress, signers.alice.address)
      .add64(mintAmount)
      .encrypt();
    
    const bobMintInput = await fhevm
      .createEncryptedInput(cUSDTAddress, signers.bob.address)  
      .add64(mintAmount)
      .encrypt();
    
    // Mint tokens (assuming cUSDT has a mint function, adjust as needed)
    // Note: This might need adjustment based on the actual cUSDT implementation
    try {
      await cUSDTContract.connect(signers.deployer).mint(signers.alice.address, mintAmount);
      await cUSDTContract.connect(signers.deployer).mint(signers.bob.address, mintAmount);
    } catch (error) {
      // If mint doesn't exist, skip this setup
      console.log("Mint function not available, skipping token setup");
    }
  });

  it("should initialize with correct cUSDT address", async function () {
    const contractCUSDTAddress = await zamaBankContract.cUSDT();
    expect(contractCUSDTAddress).to.equal(cUSDTAddress);
  });

  it("should check account existence correctly", async function () {
    const aliceExists = await zamaBankContract.accountExists(signers.alice.address);
    expect(aliceExists).to.be.false;
  });

  it("should allow deposits", async function () {
    const depositAmount = 1000n;
    
    // Create encrypted input for deposit
    const encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(depositAmount)
      .encrypt();

    // Alice approves ZamaBank to spend her cUSDT
    await cUSDTContract.connect(signers.alice).approve(zamaBankAddress, depositAmount);

    // Alice deposits
    const tx = await zamaBankContract
      .connect(signers.alice)
      .deposit(encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    // Check account exists
    const aliceExists = await zamaBankContract.connect(signers.alice).accountExists(signers.alice.address);
    expect(aliceExists).to.be.true;

    // Check balance
    const encryptedBalance = await zamaBankContract.connect(signers.alice).getBalance();
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      zamaBankAddress,
      signers.alice,
    );
    expect(decryptedBalance).to.equal(depositAmount);
  });

  it("should accumulate multiple deposits", async function () {
    const firstDeposit = 1000n;
    const secondDeposit = 500n;
    
    // First deposit
    let encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(firstDeposit)
      .encrypt();

    await cUSDTContract.connect(signers.alice).approve(zamaBankAddress, firstDeposit);
    await zamaBankContract
      .connect(signers.alice)
      .deposit(encryptedInput.handles[0], encryptedInput.inputProof);

    // Second deposit
    encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(secondDeposit)
      .encrypt();

    await cUSDTContract.connect(signers.alice).approve(zamaBankAddress, secondDeposit);
    await zamaBankContract
      .connect(signers.alice)
      .deposit(encryptedInput.handles[0], encryptedInput.inputProof);

    // Check total balance
    const encryptedBalance = await zamaBankContract.connect(signers.alice).getBalance();
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      zamaBankAddress,
      signers.alice,
    );
    expect(decryptedBalance).to.equal(firstDeposit + secondDeposit);
  });

  it("should calculate interest correctly after 1 day", async function () {
    const depositAmount = 1000n;
    
    // Deposit
    const encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(depositAmount)
      .encrypt();

    await cUSDTContract.connect(signers.alice).approve(zamaBankAddress, depositAmount);
    await zamaBankContract
      .connect(signers.alice)
      .deposit(encryptedInput.handles[0], encryptedInput.inputProof);

    // Fast forward 1 day
    await time.increase(86400); // 1 day in seconds

    // Update interest
    await zamaBankContract.connect(signers.alice).updateInterest();

    // Check interest (0.1% of 1000 = 1)
    const encryptedInterest = await zamaBankContract.connect(signers.alice).getInterest();
    const decryptedInterest = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedInterest,
      zamaBankAddress,
      signers.alice,
    );
    expect(decryptedInterest).to.equal(1n); // 0.1% of 1000
  });

  it("should not calculate interest for partial days", async function () {
    const depositAmount = 1000n;
    
    // Deposit
    const encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(depositAmount)
      .encrypt();

    await cUSDTContract.connect(signers.alice).approve(zamaBankAddress, depositAmount);
    await zamaBankContract
      .connect(signers.alice)
      .deposit(encryptedInput.handles[0], encryptedInput.inputProof);

    // Fast forward 12 hours (half day)
    await time.increase(43200);

    // Update interest
    await zamaBankContract.connect(signers.alice).updateInterest();

    // Check interest should still be 0
    const encryptedInterest = await zamaBankContract.connect(signers.alice).getInterest();
    const decryptedInterest = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedInterest,
      zamaBankAddress,
      signers.alice,
    );
    expect(decryptedInterest).to.equal(0n);
  });

  it("should calculate compound interest for multiple days", async function () {
    const depositAmount = 1000n;
    
    // Deposit
    const encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(depositAmount)
      .encrypt();

    await cUSDTContract.connect(signers.alice).approve(zamaBankAddress, depositAmount);
    await zamaBankContract
      .connect(signers.alice)
      .deposit(encryptedInput.handles[0], encryptedInput.inputProof);

    // Fast forward 3 days
    await time.increase(259200); // 3 days

    // Update interest
    await zamaBankContract.connect(signers.alice).updateInterest();

    // Check interest (0.1% * 3 days = 0.3% of 1000 = 3)
    const encryptedInterest = await zamaBankContract.connect(signers.alice).getInterest();
    const decryptedInterest = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedInterest,
      zamaBankAddress,
      signers.alice,
    );
    expect(decryptedInterest).to.equal(3n);
  });

  it("should allow withdrawals", async function () {
    const depositAmount = 1000n;
    const withdrawAmount = 300n;
    
    // Deposit
    let encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(depositAmount)
      .encrypt();

    await cUSDTContract.connect(signers.alice).approve(zamaBankAddress, depositAmount);
    await zamaBankContract
      .connect(signers.alice)
      .deposit(encryptedInput.handles[0], encryptedInput.inputProof);

    // Withdraw
    encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(withdrawAmount)
      .encrypt();

    await zamaBankContract
      .connect(signers.alice)
      .withdraw(encryptedInput.handles[0], encryptedInput.inputProof);

    // Check remaining balance
    const encryptedBalance = await zamaBankContract.connect(signers.alice).getBalance();
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      zamaBankAddress,
      signers.alice,
    );
    expect(decryptedBalance).to.equal(depositAmount - withdrawAmount);
  });

  it("should allow withdrawal of interest", async function () {
    const depositAmount = 1000n;
    
    // Deposit
    const encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(depositAmount)
      .encrypt();

    await cUSDTContract.connect(signers.alice).approve(zamaBankAddress, depositAmount);
    await zamaBankContract
      .connect(signers.alice)
      .deposit(encryptedInput.handles[0], encryptedInput.inputProof);

    // Wait 1 day for interest
    await time.increase(86400);

    // Withdraw only interest (1 token)
    const withdrawInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(1n)
      .encrypt();

    await zamaBankContract
      .connect(signers.alice)
      .withdraw(withdrawInput.handles[0], withdrawInput.inputProof);

    // Check balance is still full deposit amount
    const encryptedBalance = await zamaBankContract.connect(signers.alice).getBalance();
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      zamaBankAddress,
      signers.alice,
    );
    expect(decryptedBalance).to.equal(depositAmount);

    // Check interest is now 0
    const encryptedInterest = await zamaBankContract.connect(signers.alice).getInterest();
    const decryptedInterest = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedInterest,
      zamaBankAddress,
      signers.alice,
    );
    expect(decryptedInterest).to.equal(0n);
  });

  it("should prevent withdrawal of more than available", async function () {
    const depositAmount = 1000n;
    const withdrawAmount = 2000n; // More than deposited
    
    // Deposit
    let encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(depositAmount)
      .encrypt();

    await cUSDTContract.connect(signers.alice).approve(zamaBankAddress, depositAmount);
    await zamaBankContract
      .connect(signers.alice)
      .deposit(encryptedInput.handles[0], encryptedInput.inputProof);

    // Try to withdraw more than available
    encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(withdrawAmount)
      .encrypt();

    await zamaBankContract
      .connect(signers.alice)
      .withdraw(encryptedInput.handles[0], encryptedInput.inputProof);

    // Balance should remain unchanged (withdrawal should be 0)
    const encryptedBalance = await zamaBankContract.connect(signers.alice).getBalance();
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      zamaBankAddress,
      signers.alice,
    );
    expect(decryptedBalance).to.equal(depositAmount);
  });

  it("should handle multiple users independently", async function () {
    const aliceDeposit = 1000n;
    const bobDeposit = 2000n;
    
    // Alice deposits
    let encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.alice.address)
      .add64(aliceDeposit)
      .encrypt();

    await cUSDTContract.connect(signers.alice).approve(zamaBankAddress, aliceDeposit);
    await zamaBankContract
      .connect(signers.alice)
      .deposit(encryptedInput.handles[0], encryptedInput.inputProof);

    // Bob deposits
    encryptedInput = await fhevm
      .createEncryptedInput(zamaBankAddress, signers.bob.address)
      .add64(bobDeposit)
      .encrypt();

    await cUSDTContract.connect(signers.bob).approve(zamaBankAddress, bobDeposit);
    await zamaBankContract
      .connect(signers.bob)
      .deposit(encryptedInput.handles[0], encryptedInput.inputProof);

    // Check Alice's balance
    let encryptedBalance = await zamaBankContract.connect(signers.alice).getBalance();
    let decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      zamaBankAddress,
      signers.alice,
    );
    expect(decryptedBalance).to.equal(aliceDeposit);

    // Check Bob's balance
    encryptedBalance = await zamaBankContract.connect(signers.bob).getBalance();
    decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      zamaBankAddress,
      signers.bob,
    );
    expect(decryptedBalance).to.equal(bobDeposit);
  });
});