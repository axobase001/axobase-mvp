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

// Mock private keys for MVP (no real funds, for simulation only)
const MOCK_PRIVATE_KEYS = [
  '0x1111111111111111111111111111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222222222222222222222222222',
  '0x3333333333333333333333333333333333333333333333333333333333333333',
  '0x4444444444444444444444444444444444444444444444444444444444444444',
  '0x5555555555555555555555555555555555555555555555555555555555555555',
  '0x6666666666666666666666666666666666666666666666666666666666666666',
  '0x7777777777777777777777777777777777777777777777777777777777777777',
  '0x8888888888888888888888888888888888888888888888888888888888888888',
  '0x9999999999999999999999999999999999999999999999999999999999999999',
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
] as const;

export const createHDWallet = (index: number, seed?: string): Wallet => {
  // Use configured key if available, otherwise use mock key
  const privateKey = seed || process.env.MASTER_WALLET_PRIVATE_KEY || MOCK_PRIVATE_KEYS[index % MOCK_PRIVATE_KEYS.length];
  
  // Ensure proper hex format
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  const account = privateKeyToAccount(formattedKey as `0x${string}`);
  
  return {
    address: account.address,
    privateKey: formattedKey,
    index,
  };
};

export const getUSDCBalance = async (address: string): Promise<number> => {
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
