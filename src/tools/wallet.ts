/**
 * Wallet Tools
 * USDC and ETH balance management
 */

import { createWalletClient, http, publicActions, formatUnits, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getActiveChain, getUSDCAddress } from '../config/chains.js';

const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export interface Wallet {
  address: string;
  privateKey: string;
  index: number;
}

/**
 * Generate a deterministic unique private key per agent index.
 * Uses (index + 1) as the raw private key value, zero-padded to 32 bytes.
 * Valid secp256k1 private keys must be in [1, group_order-1]; small integers are valid.
 * Supports up to 2^32 - 1 unique agents.
 */
const indexToPrivateKey = (index: number): `0x${string}` => {
  const n = BigInt(index + 1); // +1 to avoid 0x000...0000 which is invalid
  return `0x${n.toString(16).padStart(64, '0')}` as `0x${string}`;
};

export const createHDWallet = (index: number, seed?: string): Wallet => {
  const privateKey: `0x${string}` = seed
    ? (seed.startsWith('0x') ? seed as `0x${string}` : `0x${seed}` as `0x${string}`)
    : (process.env.MASTER_WALLET_PRIVATE_KEY
        ? (process.env.MASTER_WALLET_PRIVATE_KEY.startsWith('0x')
            ? process.env.MASTER_WALLET_PRIVATE_KEY as `0x${string}`
            : `0x${process.env.MASTER_WALLET_PRIVATE_KEY}` as `0x${string}`)
        : indexToPrivateKey(index));

  const account = privateKeyToAccount(privateKey);

  return {
    address: account.address,
    privateKey,
    index,
  };
};

// In-memory balance store for simulation mode (when real blockchain is not available)
const simulatedBalances = new Map<string, number>();

export const setSimulatedBalance = (address: string, balance: number): void => {
  simulatedBalances.set(address.toLowerCase(), balance);
};

export const getSimulatedBalance = (address: string): number | undefined => {
  return simulatedBalances.get(address.toLowerCase());
};

export const getUSDCBalance = async (address: string): Promise<number> => {
  // First check if we have a simulated balance (for MVP simulation mode)
  const simulatedBalance = getSimulatedBalance(address);
  if (simulatedBalance !== undefined) {
    return simulatedBalance;
  }
  
  // Otherwise try to read from real blockchain
  const chain = getActiveChain();
  const usdcAddress = getUSDCAddress() as `0x${string}`;
  
  const client = createWalletClient({
    chain,
    transport: http(),
  }).extend(publicActions);
  
  try {
    const balance = await client.readContract({
      address: usdcAddress,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });
    
    return parseFloat(formatUnits(balance, 6));
  } catch {
    // If blockchain call fails and no simulated balance, return 0
    return 0;
  }
};

export const getETHBalance = async (address: string): Promise<number> => {
  const chain = getActiveChain();
  
  const client = createWalletClient({
    chain,
    transport: http(),
  }).extend(publicActions);
  
  try {
    const balance = await client.getBalance({ address: address as `0x${string}` });
    return parseFloat(formatUnits(balance, 18));
  } catch {
    return 0;
  }
};

export const transferUSDC = async (
  from: Wallet,
  to: string,
  amount: number
): Promise<string> => {
  const chain = getActiveChain();
  const usdcAddress = getUSDCAddress() as `0x${string}`;
  
  const account = privateKeyToAccount(from.privateKey as `0x${string}`);
  const client = createWalletClient({
    account,
    chain,
    transport: http(),
  });
  
  const amountUnits = parseUnits(amount.toString(), 6);
  
  const hash = await client.writeContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: 'transfer',
    args: [to as `0x${string}`, amountUnits],
  });
  
  return hash;
};
