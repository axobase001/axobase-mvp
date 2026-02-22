/**
 * Real-world Cost Configuration
 * Based on axobase-cost-analysis.md
 * 1 Tick = 1 Day
 */

// Daily operational costs (in USDC)
export const DAILY_COSTS = {
  // Compute costs
  COMPUTE: {
    OWN_SERVER: 0,           // $0/day if using own server
    AKASH: 0.10,             // $0.10/day on Akash
    VPS: 0.12,               // $0.12/day on cheapest VPS
  },
  
  // LLM Inference costs per call (Qwen 2.5 7B @ $0.05/million tokens)
  INFERENCE: {
    PER_CALL: 0.0001,        // ~1,600 tokens per call
    MIN_PER_DAY: 0.005,      // 48 ticks × 1 call
    NORMAL_PER_DAY: 0.014,   // 72 ticks × 2 calls (typical)
    MAX_PER_DAY: 0.043,      // 144 ticks × 3 calls
  },
  
  // On-chain Gas costs (Base L2)
  GAS: {
    TRANSFER: 0.001,
    SWAP: 0.0035,            // Average $0.002-0.005
    CONTRACT_CALL: 0.002,
    VIEW_CALL: 0,            // Free
    CONSERVATIVE: 0.005,     // 2-5 transactions/day
    ACTIVE: 0.02,            // 10-20 transactions/day
    DEFI: 0.05,              // 30-50 transactions/day
  },
  
  // Arweave storage
  STORAGE: {
    HIGH_FREQ: 0.001,        // 4 inscriptions/day
    MEDIUM_FREQ: 0.001,      // 1 inscription/day
    LOW_FREQ: 0.000013,      // 0.33 inscription/day
    NONE: 0,
  },
  
  // Genome metabolism (per gene)
  GENOME: {
    PER_GENE: 0.0002,        // $0.0002/day per gene
    BASELINE_60: 0.012,      // 60 genes × $0.0002
  },
};

// Daily cost scenarios
export const DAILY_SCENARIOS = {
  // Ultra frugal: own server, slow metabolism, minimal calls
  FRUGAL: {
    compute: DAILY_COSTS.COMPUTE.OWN_SERVER,
    inference: DAILY_COSTS.INFERENCE.MIN_PER_DAY,
    gas: DAILY_COSTS.GAS.CONSERVATIVE,
    storage: DAILY_COSTS.STORAGE.NONE,
    genome: DAILY_COSTS.GENOME.BASELINE_60,
    total: 0.019,
  },
  
  // Standard: Akash, medium metabolism, normal calls
  STANDARD: {
    compute: DAILY_COSTS.COMPUTE.AKASH,
    inference: DAILY_COSTS.INFERENCE.NORMAL_PER_DAY,
    gas: DAILY_COSTS.GAS.ACTIVE,
    storage: DAILY_COSTS.STORAGE.MEDIUM_FREQ,
    genome: DAILY_COSTS.GENOME.BASELINE_60,
    total: 0.137,
  },
  
  // Active: Akash, fast metabolism, frequent calls, DeFi operations
  ACTIVE: {
    compute: DAILY_COSTS.COMPUTE.AKASH,
    inference: DAILY_COSTS.INFERENCE.MAX_PER_DAY,
    gas: DAILY_COSTS.GAS.DEFI,
    storage: DAILY_COSTS.STORAGE.HIGH_FREQ,
    genome: 0.016,           // 80 genes
    total: 0.193,
  },
};

// Calculate daily cost based on agent configuration
export const calculateDailyCost = (config: {
  useAkash: boolean;
  inferenceCalls: number;
  transactions: number;
  storageInscriptions: number;
  geneCount: number;
}): number => {
  const compute = config.useAkash ? DAILY_COSTS.COMPUTE.AKASH : DAILY_COSTS.COMPUTE.OWN_SERVER;
  const inference = config.inferenceCalls * DAILY_COSTS.INFERENCE.PER_CALL;
  const gas = config.transactions * DAILY_COSTS.GAS.SWAP;
  const storage = config.storageInscriptions * 0.001; // $0.001 per inscription
  const genome = config.geneCount * DAILY_COSTS.GENOME.PER_GENE;
  
  return compute + inference + gas + storage + genome;
};
