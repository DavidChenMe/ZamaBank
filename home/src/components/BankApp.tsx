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
  const { instance, isLoading: isZamaLoading, error: zamaError } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [now, setNow] = useState<number>(Math.floor(Date.now() / 1000));
  const [depositClear, setDepositClear] = useState<bigint | null>(null);
  const [dailyRate] = useState<number>(0.001); // 0.1%
  const [depositInput, setDepositInput] = useState<string>('');
  const [withdrawInput, setWithdrawInput] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isDecryptingToken, setIsDecryptingToken] = useState<boolean>(false);
  const [tokenBalanceClear, setTokenBalanceClear] = useState<bigint | null>(null);

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
  const { data: encTokenBalance } = useReadContract({
    address: CUSDT_ADDRESS,
    abi: CUSDT_ABI,
    functionName: 'confidentialBalanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: isOperator } = useReadContract({
    address: CUSDT_ADDRESS,
    abi: CUSDT_ABI,
    functionName: 'isOperator',
    args: address ? [address, BANK_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  // Reset clear value when account or on-chain handle changes
  useEffect(() => {
    setDepositClear(null);
  }, [address, encDeposit]);

  const decrypt = async () => {
    if (!address) return alert('Connect wallet');
    if (!instance) return alert('Encryption is initializing. Please retry shortly.');
    if (!encDeposit) return alert('Nothing to decrypt');
    try {
      setIsDecrypting(true);
      const handle = encDeposit as string;
      const zero = '0x0000000000000000000000000000000000000000000000000000000000000000';
      if (handle === zero) {
        setDepositClear(0n);
        return;
      }
      const keypair = instance.generateKeypair();
      const handleContractPairs = [{ handle, contractAddress: BANK_ADDRESS }];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [BANK_ADDRESS];
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer');

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
      const clear = result[handle];
      setDepositClear(BigInt(clear));
    } catch (e) {
      console.error('decrypt deposit failed', e);
      alert('Decrypt failed');
    } finally {
      setIsDecrypting(false);
    }
  };

  const daysAccrued = useMemo(() => {
    if (!lastAccrued) return 0;
    const last = Number(lastAccrued as bigint);
    return Math.floor((now - last) / (24 * 60 * 60));
  }, [lastAccrued, now]);

  const interestPreview = useMemo(() => {
    if (!depositClear || !lastAccrued) return 0;
    const last = Number(lastAccrued as bigint);
    const secs = Math.max(0, now - last);
    const principal = Number(depositClear) / 1_000_000;
    // per-second rate = 0.001 / 86400
    return principal * (dailyRate / 86400) * secs;
  }, [depositClear, dailyRate, lastAccrued, now]);

  const deposit = async () => {
    if (!address) return alert('Connect wallet');
    if (!instance) return alert('Encryption is initializing. Please retry shortly.');
    if (!isOperator) {
      alert('请先点击“Approve cUSDT”授权银行合约，然后再进行存款');
      return;
    }
    if (!depositInput) return;
    const amountDec = Number(depositInput);
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

      // Bank pulls tokens via confidentialTransferFrom. Requires operator approval.
      const tx = await bank.deposit(encrypted.handles[0], encrypted.inputProof);
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
    if (!address) return alert('Connect wallet');
    if (!instance) return alert('Encryption is initializing. Please retry shortly.');
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
    if (!instance) return alert('Encryption is initializing. Please retry shortly.');
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

  const approveOperator = async () => {
    try {
      setBusy(true);
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer');
      const cusdt = new Contract(CUSDT_ADDRESS, CUSDT_ABI, signer);
      const until = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
      const tx = await cusdt.setOperator(BANK_ADDRESS, until);
      await tx.wait();
      alert('Operator approved for 30 days');
    } catch (e) {
      console.error('approve operator failed', e);
      alert('Approve operator failed');
    } finally {
      setBusy(false);
    }
  };

  const decryptTokenBalance = async () => {
    if (!address) return alert('Connect wallet');
    if (!instance) return alert('Encryption is initializing. Please retry shortly.');
    if (!encTokenBalance) return alert('Nothing to decrypt');
    try {
      setIsDecryptingToken(true);
      const handle = encTokenBalance as string;
      const zero = '0x0000000000000000000000000000000000000000000000000000000000000000';
      if (handle === zero) {
        setTokenBalanceClear(0n);
        return;
      }
      const keypair = instance.generateKeypair();
      const handleContractPairs = [{ handle, contractAddress: CUSDT_ADDRESS }];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [CUSDT_ADDRESS];
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer');

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
      const clear = result[handle];
      setTokenBalanceClear(BigInt(clear));
    } catch (e) {
      console.error('decrypt token balance failed', e);
      alert('Decrypt failed');
    } finally {
      setIsDecryptingToken(false);
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
                <div className="value">{depositClear !== null ? `${formatAmount(depositClear)} cUSDT` : '***'}</div>
                <div className="sub">
                  <button className="secondary" onClick={decrypt} disabled={!address || !encDeposit || isDecrypting || isZamaLoading}>
                    {isDecrypting ? 'Decrypting...' : 'Decrypt Balance'}
                  </button>
                  {zamaError && <span style={{marginLeft: 8, color: '#ef4444'}}>Init error</span>}
                </div>
              </div>
              <div className="stat">
                <div className="label">Your cUSDT Balance</div>
                <div className="value">{tokenBalanceClear !== null ? `${formatAmount(tokenBalanceClear)} cUSDT` : '***'}</div>
                <div className="sub">
                  <button className="secondary" onClick={decryptTokenBalance} disabled={!address || !encTokenBalance || isDecryptingToken || isZamaLoading}>
                    {isDecryptingToken ? 'Decrypting...' : 'Decrypt cUSDT'}
                  </button>
                </div>
              </div>
              <div className="stat">
                <div className="label">Accrued Interest (full days)</div>
                <div className="value">{depositClear !== null ? `${interestPreview.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} cUSDT` : '***'}</div>
                <div className="sub">Last accrual: {lastAccrued ? new Date(Number(lastAccrued as bigint)*1000).toLocaleString() : '-'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="primary" onClick={claim} disabled={busy || !address}>Claim Interest</button>
                <button className="secondary" onClick={approveOperator} disabled={busy || !address || (isOperator as boolean|undefined)}>Approve cUSDT</button>
                <button className="secondary" onClick={faucet} disabled={busy || !address}>Faucet Mint cUSDT</button>
              </div>
            </div>
            <div>
              <div className="form">
                <label>Deposit Amount</label>
                <input value={depositInput} onChange={(e) => setDepositInput(e.target.value)} placeholder="100.0" />
                <button className="primary" onClick={deposit} disabled={busy || !address || !depositInput || isZamaLoading}>Deposit</button>
              </div>
              <div className="form">
                <label>Withdraw Amount</label>
                <input value={withdrawInput} onChange={(e) => setWithdrawInput(e.target.value)} placeholder="50.0" />
                <button className="primary" onClick={withdraw} disabled={busy || !address || !withdrawInput || isZamaLoading}>Withdraw</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
