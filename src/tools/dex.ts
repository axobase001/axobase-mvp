/**
 * DEX Tools
 * Token swaps via Aerodrome
 */

import { createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getActiveChain, AERODROME_ROUTER } from '../config/chains.js';
import { Wallet } from './wallet.js';

const ROUTER_ABI = [
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

export interface SwapParams {
  wallet: Wallet;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  slippage: number;
}

export interface SwapResult {
  success: boolean;
  txHash?: string;
  amountOut?: bigint;
  error?: string;
}

export const swapExactInput = async (params: SwapParams): Promise<SwapResult> => {
  const { wallet, tokenIn, tokenOut, amountIn, slippage } = params;
  const chain = getActiveChain();
  
  const account = privateKeyToAccount(wallet.privateKey as `0x${string}`);
  const client = createWalletClient({
    account,
    chain,
    transport: http(),
  });
  
  const amountOutMin = (amountIn * BigInt(Math.floor((1 - slippage) * 10000))) / 10000n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
  
  try {
    const hash = await client.writeContract({
      address: AERODROME_ROUTER as `0x${string}`,
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [
        amountIn,
        amountOutMin,
        [tokenIn as `0x${string}`, tokenOut as `0x${string}`],
        wallet.address as `0x${string}`,
        deadline,
      ],
    });
    
    return { success: true, txHash: hash };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};
