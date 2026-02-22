/**
 * Genetic Operators
 * 6 operators: mutation, crossover, duplication, deletion, HGT, de novo
 */

import { Gene, Chromosome, DynamicGenome, GeneId, GeneOrigin, ExpressionState, GeneDomain, AgentId, BreedingContext, MutationEvent } from './types.js';

const generateId = (): string => Math.random().toString(36).substring(2, 15);

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

export const pointMutation = (genome: DynamicGenome): { genome: DynamicGenome; event: MutationEvent } => {
  const allGenes = genome.chromosomes.flatMap(c => c.genes);
  const targetGene = allGenes[Math.floor(Math.random() * allGenes.length)];
  
  const before = targetGene.value;
  const mutation = (Math.random() * 2 - 1) * 0.05;
  
  const mutatedGene: Gene = {
    ...targetGene,
    value: clamp(targetGene.value + mutation, 0, 1),
    origin: targetGene.origin === GeneOrigin.PRIMORDIAL ? GeneOrigin.MUTATED : targetGene.origin,
  };
  
  const newGenome = replaceGene(genome, mutatedGene);
  
  return {
    genome: newGenome,
    event: {
      geneId: mutatedGene.id,
      type: 'point',
      before,
      after: mutatedGene.value,
      generation: genome.meta.generation,
    },
  };
};

export const crossover = (ctx: BreedingContext): { genome: DynamicGenome; events: MutationEvent[] } => {
  const { parentA, parentB } = ctx;
  const events: MutationEvent[] = [];
  
  const childChromosomes = parentA.chromosomes.map((chrA, idx) => {
    const chrB = parentB.chromosomes[idx];
    if (!chrB || Math.random() > 0.5) {
      return cloneChromosome(chrA);
    }
    return crossoverChromosomes(chrA, chrB, events, parentA.meta.generation + 1);
  });
  
  const child: DynamicGenome = {
    meta: {
      generation: parentA.meta.generation + 1,
      lineageId: generateId(),
      genomeHash: '',
      totalGenes: childChromosomes.reduce((sum, c) => sum + c.genes.length, 0),
      birthTimestamp: Date.now(),
    },
    chromosomes: childChromosomes,
    regulatoryNetwork: [],
    epigenome: [],
  };
  
  return { genome: child, events };
};

const crossoverChromosomes = (
  a: Chromosome,
  b: Chromosome,
  events: MutationEvent[],
  generation: number
): Chromosome => {
  const crossoverPoint = Math.floor(Math.random() * Math.min(a.genes.length, b.genes.length));
  
  const genes: Gene[] = [
    ...a.genes.slice(0, crossoverPoint).map(g => ({ ...g, id: `${g.id}-${generateId()}` })),
    ...b.genes.slice(crossoverPoint).map(g => ({ ...g, id: `${g.id}-${generateId()}` })),
  ];
  
  events.push({
    geneId: a.id,
    type: 'crossover',
    before: { parentA: a.genes.length, parentB: b.genes.length },
    after: genes.length,
    generation,
  });
  
  return {
    id: `${a.id}-${generateId()}`,
    name: a.name,
    genes,
    isEssential: a.isEssential,
  };
};

export const geneDuplication = (genome: DynamicGenome): { genome: DynamicGenome; event: MutationEvent | null } => {
  const chromosome = genome.chromosomes[Math.floor(Math.random() * genome.chromosomes.length)];
  const targetGene = chromosome.genes[Math.floor(Math.random() * chromosome.genes.length)];
  
  const duplicated: Gene = {
    ...targetGene,
    id: `${targetGene.id}-dup-${generateId()}`,
    duplicateOf: targetGene.id,
    origin: GeneOrigin.DUPLICATED,
    value: clamp(targetGene.value * 0.95, 0, 1),
    weight: clamp(targetGene.weight * 0.5, 0.1, 3.0),
  };
  
  const newChromosomes = genome.chromosomes.map(c =>
    c.id === chromosome.id ? { ...c, genes: [...c.genes, duplicated] } : c
  );
  
  return {
    genome: {
      ...genome,
      chromosomes: newChromosomes,
      meta: { ...genome.meta, totalGenes: genome.meta.totalGenes + 1 },
    },
    event: {
      geneId: duplicated.id,
      type: 'duplication',
      before: targetGene.id,
      after: duplicated.id,
      generation: genome.meta.generation,
    },
  };
};

export const geneDeletion = (genome: DynamicGenome): { genome: DynamicGenome; event: MutationEvent | null } => {
  const deletableGenes = genome.chromosomes.flatMap(c =>
    c.genes.filter(g => g.essentiality < 0.5).map(g => ({ gene: g, chromosome: c }))
  );
  
  if (deletableGenes.length === 0) return { genome, event: null };
  
  const { gene, chromosome } = deletableGenes[Math.floor(Math.random() * deletableGenes.length)];
  
  const newChromosomes = genome.chromosomes.map(c =>
    c.id === chromosome.id
      ? { ...c, genes: c.genes.filter(g => g.id !== gene.id) }
      : c
  );
  
  return {
    genome: {
      ...genome,
      chromosomes: newChromosomes,
      meta: { ...genome.meta, totalGenes: genome.meta.totalGenes - 1 },
    },
    event: {
      geneId: gene.id,
      type: 'deletion',
      before: gene,
      after: null,
      generation: genome.meta.generation,
    },
  };
};

export const horizontalGeneTransfer = (
  recipient: DynamicGenome,
  donorGene: Gene,
  donorId: AgentId
): { genome: DynamicGenome; event: MutationEvent } => {
  const transferred: Gene = {
    ...donorGene,
    id: `${donorGene.id}-hgt-${generateId()}`,
    acquiredFrom: donorId,
    origin: GeneOrigin.HORIZONTAL_TRANSFER,
    weight: clamp(donorGene.weight * 0.3, 0.1, 3.0),
  };
  
  const targetChr = recipient.chromosomes[Math.floor(Math.random() * recipient.chromosomes.length)];
  
  const newChromosomes = recipient.chromosomes.map(c =>
    c.id === targetChr.id ? { ...c, genes: [...c.genes, transferred] } : c
  );
  
  return {
    genome: {
      ...recipient,
      chromosomes: newChromosomes,
      meta: { ...recipient.meta, totalGenes: recipient.meta.totalGenes + 1 },
    },
    event: {
      geneId: transferred.id,
      type: 'hgt',
      before: donorGene.id,
      after: transferred.id,
      generation: recipient.meta.generation,
    },
  };
};

export const deNovoGene = (genome: DynamicGenome): { genome: DynamicGenome; event: MutationEvent } => {
  const domains = Object.values(GeneDomain);
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  
  const newGene: Gene = {
    id: `novo-${generateId()}`,
    name: `novel_${generateId().substring(0, 6)}`,
    domain: randomDomain,
    value: Math.random(),
    weight: 0.1 + Math.random() * 0.2,
    dominance: Math.random(),
    plasticity: Math.random() * 0.5,
    essentiality: Math.random() * 0.2,
    metabolicCost: Math.random() * 0.0001,
    origin: GeneOrigin.DE_NOVO,
    age: 0,
    expressionState: ExpressionState.ACTIVE,
  };
  
  const targetChr = genome.chromosomes[Math.floor(Math.random() * genome.chromosomes.length)];
  
  const newChromosomes = genome.chromosomes.map(c =>
    c.id === targetChr.id ? { ...c, genes: [...c.genes, newGene] } : c
  );
  
  return {
    genome: {
      ...genome,
      chromosomes: newChromosomes,
      meta: { ...genome.meta, totalGenes: genome.meta.totalGenes + 1 },
    },
    event: {
      geneId: newGene.id,
      type: 'de_novo',
      before: null,
      after: newGene,
      generation: genome.meta.generation,
    },
  };
};

const replaceGene = (genome: DynamicGenome, newGene: Gene): DynamicGenome => ({
  ...genome,
  chromosomes: genome.chromosomes.map(c => ({
    ...c,
    genes: c.genes.map(g => g.name === newGene.name ? newGene : g),
  })),
});

const cloneChromosome = (c: Chromosome): Chromosome => ({
  ...c,
  id: `${c.id}-${generateId()}`,
  genes: c.genes.map(g => ({ ...g, id: `${g.id}-${generateId()}` })),
});
