import { useState, useEffect, useMemo } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { BrowserProvider, Contract } from 'ethers';

import { Header } from './Header';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { BANK_ADDRESS, BANK_ABI, CUSDT_ADDRESS, CUSDT_ABI } from '../config/contracts';

import '../styles/Bank.css';

function formatAmount(n: bigint | number) {
  const v = typeof n === 'bigint' ? Number(n) : n;
  return (v / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export function BankApp() {
  const { address } = useAccount();
  const { instance } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [now, setNow] = useState<number>(Math.floor(Date.now() / 1000));
  const [depositClear, setDepositClear] = useState<bigint | null>(null);
  const [dailyRate] = useState<number>(0.001); // 0.1%
  const [depositInput, setDepositInput] = useState<string>('');
  const [withdrawInput, setWithdrawInput] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Reads
  const { data: encDeposit } = useReadContract({
    address: BANK_ADDRESS,
    abi: BANK_ABI,
    functionName: 'getDeposit',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: lastAccrued } = useReadContract({
    address: BANK_ADDRESS,
    abi: BANK_ABI,
    functionName: 'getLastAccruedAt',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Decrypt principal when encDeposit changes
  useEffect(() => {
    const run = async () => {
      if (!instance || !address || !encDeposit) return setDepositClear(null);
      try {
        const keypair = instance.generateKeypair();
        const handleContractPairs = [{ handle: encDeposit as string, contractAddress: BANK_ADDRESS }];

        const startTimeStamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = '10';
        const contractAddresses = [BANK_ADDRESS];
        const signer = await signerPromise;
        if (!signer) return;

        const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
        const signature = await signer.signTypedData(
          eip712.domain,
          { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
          eip712.message,
        );

        const result = await instance.userDecrypt(
          handleContractPairs,
          keypair.privateKey,
          keypair.publicKey,
          signature.replace('0x', ''),
          contractAddresses,
          await signer.getAddress(),
          startTimeStamp,
          durationDays,
        );
        const clear = result[encDeposit as string];
        setDepositClear(BigInt(clear));
      } catch (e) {
        console.error('decrypt deposit failed', e);
        setDepositClear(null);
      }
    };
    run();
  }, [instance, address, encDeposit, signerPromise]);

  const daysAccrued = useMemo(() => {
    if (!lastAccrued) return 0;
    const last = Number(lastAccrued as bigint);
    return Math.floor((now - last) / (24 * 60 * 60));
  }, [lastAccrued, now]);

  const interestPreview = useMemo(() => {
    if (!depositClear || daysAccrued <= 0) return 0;
    // interest = principal * 0.001 * days
    const principal = Number(depositClear) / 1_000_000;
    return principal * dailyRate * daysAccrued;
  }, [depositClear, dailyRate, daysAccrued]);

  const deposit = async () => {
    if (!address || !instance) return alert('Connect wallet');
    if (!depositInput) return;
    const amountDec = Number(depositInput);
    if (!Number.isFinite(amountDec) || amountDec <= 0) return alert('Invalid amount');
    try {
      setBusy(true);
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer');
      const cusdt = new Contract(CUSDT_ADDRESS, CUSDT_ABI, signer);

      // Encrypt amount for token contract (6 decimals)
      const value = BigInt(Math.floor(amountDec * 1_000_000));
      const input = instance.createEncryptedInput(CUSDT_ADDRESS, await signer.getAddress());
      input.add64(value);
      const encrypted = await input.encrypt();

      const tx = await cusdt.confidentialTransferAndCall(
        BANK_ADDRESS,
        encrypted.handles[0],
        encrypted.inputProof,
        '0x'
      );
      await tx.wait();
      setDepositInput('');
    } catch (e) {
      console.error('deposit failed', e);
      alert('Deposit failed');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!address || !instance) return alert('Connect wallet');
    if (!withdrawInput) return;
    const amountDec = Number(withdrawInput);
    if (!Number.isFinite(amountDec) || amountDec <= 0) return alert('Invalid amount');
    try {
      setBusy(true);
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer');
      const bank = new Contract(BANK_ADDRESS, BANK_ABI, signer);

      // Encrypt amount for bank contract (6 decimals)
      const value = BigInt(Math.floor(amountDec * 1_000_000));
      const input = instance.createEncryptedInput(BANK_ADDRESS, await signer.getAddress());
      input.add64(value);
      const encrypted = await input.encrypt();

      const tx = await bank.withdraw(encrypted.handles[0], encrypted.inputProof);
      await tx.wait();
      setWithdrawInput('');
    } catch (e) {
      console.error('withdraw failed', e);
      alert('Withdraw failed');
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    try {
      setBusy(true);
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer');
      const bank = new Contract(BANK_ADDRESS, BANK_ABI, signer);
      const tx = await bank.claimInterest();
      await tx.wait();
    } catch (e) {
      console.error('claim failed', e);
      alert('Claim failed');
    } finally {
      setBusy(false);
    }
  };

  const faucet = async () => {
    if (!instance) return alert('Init relayer first');
    const amt = prompt('Mint amount (cUSDT, 6 decimals implied):', '100');
    if (!amt) return;
    const amountDec = Number(amt);
    if (!Number.isFinite(amountDec) || amountDec <= 0) return alert('Invalid amount');
    try {
      setBusy(true);
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer');
      const cusdt = new Contract(CUSDT_ADDRESS, CUSDT_ABI, signer);
      const value = BigInt(Math.floor(amountDec * 1_000_000));
      const input = instance.createEncryptedInput(CUSDT_ADDRESS, await signer.getAddress());
      input.add64(value);
      const encrypted = await input.encrypt();
      const tx = await cusdt.faucetMint(encrypted.handles[0], encrypted.inputProof);
      await tx.wait();
      alert('Minted!');
    } catch (e) {
      console.error('faucet failed', e);
      alert('Faucet failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bank-app">

      <main className="main-content">
        <div className="card">
          <div className="card-header">
            <h2>ZamaBank</h2>
            <ConnectButton />
          </div>
          <div className="grid-2">
            <div>
              <div className="stat">
                <div className="label">Your Deposit</div>
                <div className="value">{depositClear !== null ? `${formatAmount(depositClear)} cUSDT` : '-'}</div>
              </div>
              <div className="stat">
                <div className="label">Accrued Interest (full days)</div>
                <div className="value">{depositClear !== null ? `${interestPreview.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} cUSDT` : '-'}</div>
                <div className="sub">Days since last accrual: {daysAccrued}</div>
              </div>
              <button className="primary" onClick={claim} disabled={busy || !address}>Claim Interest</button>
              <button className="secondary" onClick={faucet} disabled={busy || !address}>Faucet Mint cUSDT</button>
            </div>
            <div>
              <div className="form">
                <label>Deposit Amount</label>
                <input value={depositInput} onChange={(e) => setDepositInput(e.target.value)} placeholder="100.0" />
                <button className="primary" onClick={deposit} disabled={busy || !address || !depositInput}>Deposit</button>
              </div>
              <div className="form">
                <label>Withdraw Amount</label>
                <input value={withdrawInput} onChange={(e) => setWithdrawInput(e.target.value)} placeholder="50.0" />
                <button className="primary" onClick={withdraw} disabled={busy || !address || !withdrawInput}>Withdraw</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

