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

export const createHDWallet = (index: number, seed?: string): Wallet => {
  const seedPhrase = seed || process.env.MASTER_WALLET_PRIVATE_KEY || '0x' + '1'.repeat(64);
  const privateKey = `${seedPhrase.substring(0, 64 - index.toString().length)}${index}` as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  
  return {
    address: account.address,
    privateKey: privateKey,
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
