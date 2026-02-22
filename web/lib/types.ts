export interface PopulationStats {
  timestamp: number;
  totalAgents: number;
  aliveAgents: number;
  deadAgents: number;
  averageBalance: number;
  medianBalance: number;
  minBalance: number;
  maxBalance: number;
  averageAge: number;
  oldestAgent: number;
  breedingEvents: number;
  deathEvents: number;
  strategyDistribution: Record<string, number>;
}

export interface Agent {
  id: string;
  balance: number;
  age: number;
  stage: 'neonate' | 'juvenile' | 'adult' | 'senescent';
  status: 'alive' | 'critical' | 'dead';
  strategy: string;
  genome?: {
    riskAppetite: number;
    onChainAffinity: number;
    cooperationTendency: number;
  };
}
