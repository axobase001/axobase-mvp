/**
 * Chain Configuration
 * Base L2 network settings
 */

import { defineChain } from 'viem';

export const BASE_SEPOLIA = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
});

export const BASE_MAINNET = defineChain({
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
    public: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org' },
  },
});

export const USDC_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
export const USDC_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const AERODROME_ROUTER = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43';

export const getActiveChain = () => {
  const chain = process.env.CHAIN || 'base-sepolia';
  return chain === 'base-mainnet' ? BASE_MAINNET : BASE_SEPOLIA;
};

export const getUSDCAddress = () => {
  const chain = process.env.CHAIN || 'base-sepolia';
  return chain === 'base-mainnet' ? USDC_MAINNET : USDC_SEPOLIA;
};
