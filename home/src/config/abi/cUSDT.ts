// Minimal cUSDT ABI subset used by the frontend
export default [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'confidentialBalanceOf',
    outputs: [{ internalType: 'euint64', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'operator', type: 'address' },
      { internalType: 'uint48', name: 'until', type: 'uint48' },
    ],
    name: 'setOperator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'holder', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'isOperator',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'encryptedAmount', type: 'bytes32' },
      { internalType: 'bytes', name: 'inputProof', type: 'bytes' },
    ],
    name: 'faucetMint',
    outputs: [{ internalType: 'euint64', name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

