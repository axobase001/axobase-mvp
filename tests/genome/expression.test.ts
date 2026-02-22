import { describe, it, expect } from 'vitest';
import { createFounderGenome } from '../../src/genome/factory.js';
import { expressGenome } from '../../src/genome/expression.js';

describe('Genome Expression', () => {
  it('should return expression for all traits', () => {
    const g = createFounderGenome();
    const expr = expressGenome(g);
    
    expect(expr.riskAppetite).toBeDefined();
    expect(expr.onChainAffinity).toBeDefined();
    expect(expr.cooperationTendency).toBeDefined();
    expect(expr.savingsRate).toBeDefined();
  });

  it('should return values in [0,1] range', () => {
    const g = createFounderGenome();
    const expr = expressGenome(g);
    
    expect(expr.riskAppetite).toBeGreaterThanOrEqual(0);
    expect(expr.riskAppetite).toBeLessThanOrEqual(1);
    expect(expr.onChainAffinity).toBeGreaterThanOrEqual(0);
    expect(expr.onChainAffinity).toBeLessThanOrEqual(1);
  });

  it('should give consistent results for same genome', () => {
    const g = createFounderGenome();
    const e1 = expressGenome(g);
    const e2 = expressGenome(g);
    
    expect(e1.riskAppetite).toBe(e2.riskAppetite);
    expect(e1.onChainAffinity).toBe(e2.onChainAffinity);
  });

  it('should give different results for different genomes', () => {
    const g1 = createFounderGenome();
    const g2 = createFounderGenome();
    const e1 = expressGenome(g1);
    const e2 = expressGenome(g2);
    
    const allSame = Object.keys(e1).every(k => 
      (e1 as Record<string, number>)[k] === (e2 as Record<string, number>)[k]
    );
    expect(allSame).toBe(false);
  });

  it('should calculate metabolic cost', () => {
    const g = createFounderGenome();
    const expr = expressGenome(g);
    
    expect(expr.metabolicCost).toBeGreaterThan(0);
    expect(expr.maxLifespan).toBeGreaterThan(0);
  });
});
