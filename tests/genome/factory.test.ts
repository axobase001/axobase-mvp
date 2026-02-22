import { describe, it, expect } from 'vitest';
import { createFounderGenome } from '../../src/genome/factory.js';
import { FOUNDER_GENE_COUNT } from '../../src/genome/defaults.js';

describe('Genome Factory', () => {
  it('should create genome with 63 genes', () => {
    const genome = createFounderGenome();
    expect(genome.meta.totalGenes).toBe(FOUNDER_GENE_COUNT);
  });

  it('should create genomes with different values', () => {
    const g1 = createFounderGenome();
    const g2 = createFounderGenome();
    
    const v1 = g1.chromosomes[0].genes[0].value;
    const v2 = g2.chromosomes[0].genes[0].value;
    
    expect(v1).not.toBe(v2);
  });

  it('should keep gene values in [0,1] range', () => {
    const genome = createFounderGenome();
    const allValues = genome.chromosomes.flatMap(c => c.genes.map(g => g.value));
    
    for (const v of allValues) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('should generate unique genome hashes', () => {
    const g1 = createFounderGenome();
    const g2 = createFounderGenome();
    
    expect(g1.meta.genomeHash).not.toBe(g2.meta.genomeHash);
    expect(g1.meta.genomeHash.length).toBe(64);
  });
});
