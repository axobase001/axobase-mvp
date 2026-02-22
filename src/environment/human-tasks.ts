/**
 * Human Task Market
 * Agents can complete tasks for humans and earn rewards
 * Success depends on agent's traits and random factors
 */

import { ExpressionResult } from '../genome/types.js';

export type TaskType = 
  | 'content_writing'
  | 'data_analysis'
  | 'code_review'
  | 'translation'
  | 'social_media'
  | 'customer_service'
  | 'research'
  | 'design';

export interface HumanTask {
  id: string;
  type: TaskType;
  name: string;
  description: string;
  // Reward range (USDC)
  rewardMin: number;
  rewardMax: number;
  // Task difficulty (0-1), affects success rate
  difficulty: number;
  // Time to complete (in days)
  duration: number;
  // Required traits to attempt
  requiredTraits: Partial<ExpressionResult>;
  // Probability of task being available each day
  dailyProbability: number;
  // Base success rate (before trait modifiers)
  baseSuccessRate: number;
  // Penalty for failure (reputation loss, could affect future tasks)
  failurePenalty: number;
}

// Realistic task market based on actual gig economy rates
export const HUMAN_TASKS: HumanTask[] = [
  {
    id: 'blog_post_writing',
    type: 'content_writing',
    name: '撰写博客文章',
    description: '为网站撰写800-1000字的行业分析文章',
    rewardMin: 5,
    rewardMax: 50,
    difficulty: 0.4,
    duration: 1,
    requiredTraits: { creativeAbility: 0.4, humanDependence: 0.3 },
    dailyProbability: 0.3,
    baseSuccessRate: 0.75,
    failurePenalty: 0.1,
  },
  {
    id: 'twitter_thread',
    type: 'social_media',
    name: '创建Twitter线程',
    description: '撰写10条推文组成的讨论线程',
    rewardMin: 3,
    rewardMax: 20,
    difficulty: 0.3,
    duration: 0.5,
    requiredTraits: { creativeAbility: 0.5, socialVsTechnical: 0.3 },
    dailyProbability: 0.4,
    baseSuccessRate: 0.8,
    failurePenalty: 0.05,
  },
  {
    id: 'data_cleaning',
    type: 'data_analysis',
    name: '数据清洗任务',
    description: '清理1000行CSV数据，处理缺失值和格式',
    rewardMin: 10,
    rewardMax: 80,
    difficulty: 0.5,
    duration: 1,
    requiredTraits: { analyticalAbility: 0.6, humanDependence: 0.2 },
    dailyProbability: 0.25,
    baseSuccessRate: 0.85,
    failurePenalty: 0.15,
  },
  {
    id: 'market_research',
    type: 'research',
    name: '市场调研报告',
    description: '分析DeFi协议数据并撰写简短报告',
    rewardMin: 20,
    rewardMax: 150,
    difficulty: 0.6,
    duration: 2,
    requiredTraits: { analyticalAbility: 0.7, onChainAffinity: 0.5 },
    dailyProbability: 0.2,
    baseSuccessRate: 0.7,
    failurePenalty: 0.2,
  },
  {
    id: 'code_debugging',
    type: 'code_review',
    name: '调试智能合约',
    description: '找出Solidity代码中的bug',
    rewardMin: 50,
    rewardMax: 500,
    difficulty: 0.8,
    duration: 2,
    requiredTraits: { analyticalAbility: 0.8, onChainAffinity: 0.7 },
    dailyProbability: 0.1,
    baseSuccessRate: 0.6,
    failurePenalty: 0.3,
  },
  {
    id: 'translation',
    type: 'translation',
    name: '技术文档翻译',
    description: '将英文技术文档翻译成中文',
    rewardMin: 8,
    rewardMax: 60,
    difficulty: 0.45,
    duration: 1,
    requiredTraits: { creativeAbility: 0.4, humanDependence: 0.3 },
    dailyProbability: 0.2,
    baseSuccessRate: 0.8,
    failurePenalty: 0.1,
  },
  {
    id: 'community_moderation',
    type: 'customer_service',
    name: '社区管理',
    description: '管理Discord群组，回答问题',
    rewardMin: 15,
    rewardMax: 100,
    difficulty: 0.35,
    duration: 1,
    requiredTraits: { cooperationTendency: 0.5, humanDependence: 0.4 },
    dailyProbability: 0.25,
    baseSuccessRate: 0.85,
    failurePenalty: 0.1,
  },
  {
    id: 'meme_creation',
    type: 'design',
    name: '制作Meme图',
    description: '为项目创建病毒式传播的Meme',
    rewardMin: 2,
    rewardMax: 30,
    difficulty: 0.25,
    duration: 0.3,
    requiredTraits: { creativeAbility: 0.6, novelty_seeking: 0.5 },
    dailyProbability: 0.35,
    baseSuccessRate: 0.7,
    failurePenalty: 0.05,
  },
  {
    id: 'beta_testing',
    type: 'code_review',
    name: 'DApp测试',
    description: '测试新DApp并提交bug报告',
    rewardMin: 10,
    rewardMax: 100,
    difficulty: 0.5,
    duration: 2,
    requiredTraits: { analyticalAbility: 0.5, onChainAffinity: 0.4 },
    dailyProbability: 0.2,
    baseSuccessRate: 0.75,
    failurePenalty: 0.1,
  },
  {
    id: 'data_labeling',
    type: 'data_analysis',
    name: 'AI数据标注',
    description: '为机器学习模型标注数据',
    rewardMin: 5,
    rewardMax: 40,
    difficulty: 0.3,
    duration: 1,
    requiredTraits: { analyticalAbility: 0.4, humanDependence: 0.2 },
    dailyProbability: 0.3,
    baseSuccessRate: 0.9,
    failurePenalty: 0.05,
  },
];

// Track active tasks and their progress
interface ActiveTask {
  task: HumanTask;
  startTick: number;
  remainingDays: number;
  agentId: string;
}

const activeTasks = new Map<string, ActiveTask>();

/**
 * Generate available tasks for the day
 */
export const generateDailyTasks = (): HumanTask[] => {
  const available: HumanTask[] = [];
  
  for (const task of HUMAN_TASKS) {
    if (Math.random() < task.dailyProbability) {
      available.push(task);
    }
  }
  
  return available;
};

/**
 * Calculate success probability based on agent traits
 */
const calculateSuccessRate = (
  task: HumanTask,
  expression: ExpressionResult
): number => {
  let successRate = task.baseSuccessRate;
  
  // Boost from matching traits
  for (const [trait, threshold] of Object.entries(task.requiredTraits)) {
    const value = expression[trait as keyof ExpressionResult];
    if (typeof value === 'number') {
      if (value >= threshold) {
        // Above threshold: +5% per 0.1 above
        successRate += (value - threshold) * 0.5;
      } else {
        // Below threshold: -10% per 0.1 below
        successRate -= (threshold - value) * 1.0;
      }
    }
  }
  
  // Random variance (simulating unpredictable human factors)
  successRate += (Math.random() - 0.5) * 0.2;
  
  // Clamp to reasonable range
  return Math.max(0.1, Math.min(0.95, successRate));
};

/**
 * Attempt a task
 */
export const attemptTask = (
  task: HumanTask,
  expression: ExpressionResult,
  agentId: string
): { 
  success: boolean; 
  reward: number; 
  message: string;
  reputationChange: number;
} => {
  const successRate = calculateSuccessRate(task, expression);
  const roll = Math.random();
  
  if (roll < successRate) {
    // Success!
    const reward = task.rewardMin + Math.random() * (task.rewardMax - task.rewardMin);
    const quality = (expression.creativeAbility + expression.analyticalAbility) / 2;
    const bonus = reward * (quality * 0.2); // Up to 20% bonus for high quality
    const totalReward = parseFloat((reward + bonus).toFixed(2));
    
    return {
      success: true,
      reward: totalReward,
      message: `✅ 成功完成"${task.name}"，获得 $${totalReward} (质量加成: +${(bonus).toFixed(2)})`,
      reputationChange: 0.05,
    };
  } else {
    // Failure
    const failureTypes = [
      '客户不满意要求退款',
      '交付超时失去信任',
      '质量不达标被拒绝',
      '竞争对手低价抢单',
      '客户突然取消订单',
    ];
    const reason = failureTypes[Math.floor(Math.random() * failureTypes.length)];
    
    return {
      success: false,
      reward: 0,
      message: `❌ "${task.name}" 失败: ${reason}`,
      reputationChange: -task.failurePenalty,
    };
  }
};

/**
 * Get available tasks for an agent based on their capital and traits
 */
export const getAvailableTasks = (
  capital: number,
  expression: ExpressionResult
): HumanTask[] => {
  const dailyTasks = generateDailyTasks();
  
  return dailyTasks.filter(task => {
    // Check trait requirements
    for (const [trait, threshold] of Object.entries(task.requiredTraits)) {
      const value = expression[trait as keyof ExpressionResult];
      if (typeof value === 'number' && value < threshold * 0.7) {
        // Allow attempting even if slightly below threshold, but with warning
        return false;
      }
    }
    return true;
  });
};

// Reputation tracking (affects future task availability)
const agentReputations = new Map<string, number>();

export const getAgentReputation = (agentId: string): number => {
  return agentReputations.get(agentId) || 0.5; // Default 0.5
};

export const updateAgentReputation = (agentId: string, change: number): void => {
  const current = getAgentReputation(agentId);
  agentReputations.set(agentId, Math.max(0, Math.min(1, current + change)));
};

/**
 * Get task summary for display
 */
export const getTaskMarketSummary = (): Array<{ 
  name: string; 
  type: string; 
  reward: string;
  difficulty: string;
  availability: string;
}> => {
  return HUMAN_TASKS.map(task => ({
    name: task.name,
    type: task.type,
    reward: `$${task.rewardMin}-${task.rewardMax}`,
    difficulty: task.difficulty < 0.4 ? '简单' : task.difficulty < 0.7 ? '中等' : '困难',
    availability: `${(task.dailyProbability * 100).toFixed(0)}%`,
  }));
};
