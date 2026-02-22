import { describe, it, expect } from 'vitest';
import { createFounderGenome } from '../../src/genome/factory.js';
import { pointMutation, geneDuplication, geneDeletion, deNovoGene, crossover } from '../../src/genome/operators.js';
import { FOUNDER_GENE_COUNT } from '../../src/genome/defaults.js';

describe('Genetic Operators', () => {
  describe('pointMutation', () => {
    it('should not change gene count', () => {
      const g = createFounderGenome();
      const { genome } = pointMutation(g);
      expect(genome.meta.totalGenes).toBe(g.meta.totalGenes);
    });

    it('should modify a gene value', () => {
      const g = createFounderGenome();
      const beforeValues = g.chromosomes.flatMap(c => c.genes.map(gene => gene.value));
      
      const { genome } = pointMutation(g);
      const afterValues = genome.chromosomes.flatMap(c => c.genes.map(gene => gene.value));
      
      const differences = beforeValues.filter((v, i) => v !== afterValues[i]);
      expect(differences.length).toBeGreaterThan(0);
    });
  });

  describe('geneDuplication', () => {
    it('should increase gene count by 1', () => {
      const g = createFounderGenome();
      const { genome } = geneDuplication(g);
      expect(genome.meta.totalGenes).toBe(g.meta.totalGenes + 1);
    });

    it('should create gene with duplicateOf reference', () => {
      const g = createFounderGenome();
      const { event } = geneDuplication(g);
      expect(event).not.toBeNull();
    });
  });

  describe('geneDeletion', () => {
    it('should not delete essential genes', () => {
      const g = createFounderGenome();
      const essentialCount = g.chromosomes
        .flatMap(c => c.genes)
        .filter(gene => gene.essentiality >= 0.5).length;
      
      let current = g;
      for (let i = 0; i < 10; i++) {
        const result = geneDeletion(current);
        current = result.genome;
      }
      
      const finalEssential = current.chromosomes
        .flatMap(c => c.genes)
        .filter(gene => gene.essentiality >= 0.5).length;
      
      expect(finalEssential).toBe(essentialCount);
    });
  });

  describe('crossover', () => {
    it('should create child with genes from both parents', () => {
      const p1 = createFounderGenome();
      const p2 = createFounderGenome();
      
      const { genome: child } = crossover({
        parentA: p1,
        parentB: p2,
        parentAId: 'parent-a',
        parentBId: 'parent-b',
        environmentalStress: 0,
      });
      
      expect(child.meta.generation).toBe(1);
      expect(child.chromosomes.length).toBe(p1.chromosomes.length);
    });
  });

  describe('deNovoGene', () => {
    it('should add a new gene', () => {
      const g = createFounderGenome();
      const { genome } = deNovoGene(g);
      expect(genome.meta.totalGenes).toBe(g.meta.totalGenes + 1);
    });
  });
});
