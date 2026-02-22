import { describe, it, expect } from 'vitest';
import { filterStrategies, isEmergencyMode } from '../../src/decision/framework.js';
import { ExpressionResult } from '../../src/genome/types.js';

const mockExpression = (overrides: Partial<ExpressionResult> = {}): ExpressionResult => ({
  riskAppetite: 0.5,
  onChainAffinity: 0.5,
  cooperationTendency: 0.5,
  savingsRate: 0.5,
  inferenceQuality: 0.5,
  creativeAbility: 0.5,
  analyticalAbility: 0.5,
  humanDependence: 0.5,
  adaptationSpeed: 0.5,
  stressResponse: 0.5,
  learningRate: 0.5,
  planningHorizon: 0.5,
  metabolicCost: 0.01,
  maxLifespan: 500,
  cycleSpeed: 0.5,
  globalMutationRate: 0.02,
  crossoverRate: 0.5,
  ...overrides,
});

describe('Strategy Framework', () => {
  describe('filterStrategies', () => {
    it('should filter strategies by balance', () => {
      const expr = mockExpression();
      const strategies = filterStrategies(expr, 0.5);
      
      const expensiveStrategy = strategies.find(s => s.id === 'dex_arbitrage');
      expect(expensiveStrategy).toBeUndefined();
    });

    it('should allow idle_conservation with low balance', () => {
      const expr = mockExpression();
      const strategies = filterStrategies(expr, 0.5);
      
      const idle = strategies.find(s => s.id === 'idle_conservation');
      expect(idle).toBeDefined();
    });

    it('should filter by risk appetite', () => {
      const lowRisk = mockExpression({ riskAppetite: 0.2 });
      const strategies = filterStrategies(lowRisk, 10);
      
      const highRiskStrat = strategies.find(s => s.riskLevel > 0.5);
      expect(highRiskStrat).toBeUndefined();
    });

    it('should include high risk strategies for risk-takers', () => {
      const highRisk = mockExpression({ riskAppetite: 0.8 });
      const strategies = filterStrategies(highRisk, 10);
      
      const arbitrage = strategies.find(s => s.id === 'dex_arbitrage');
      expect(arbitrage).toBeDefined();
    });

    it('should return different strategies for different genomes', () => {
      const riskTaker = mockExpression({ riskAppetite: 0.8, onChainAffinity: 0.8 });
      const conservative = mockExpression({ riskAppetite: 0.2, onChainAffinity: 0.2 });
      
      const riskStrategies = filterStrategies(riskTaker, 10);
      const safeStrategies = filterStrategies(conservative, 10);
      
      expect(riskStrategies).not.toEqual(safeStrategies);
    });
  });

  describe('isEmergencyMode', () => {
    it('should return true for balance < 2', () => {
      expect(isEmergencyMode(1.5)).toBe(true);
      expect(isEmergencyMode(0.5)).toBe(true);
    });

    it('should return false for balance >= 2', () => {
      expect(isEmergencyMode(2)).toBe(false);
      expect(isEmergencyMode(5)).toBe(false);
    });
  });
});
