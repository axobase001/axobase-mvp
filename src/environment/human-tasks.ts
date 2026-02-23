/**
 * Human Task Market - Realistic Gig Economy
 * 
 * Adjusted for 10 USDC startup context:
 * - Tasks are small, incremental income (not lottery wins)
 * - Competition is fierce (not every task is available)
 * - Reputation matters for getting tasks
 * - Most tasks require sustained effort, not one-shot
 */

import { ExpressionResult } from '../genome/types.js';

export type TaskType = 
  | 'micro_task'           // 微任务 (数据标注, 简单点击)
  | 'content_creation'     // 内容创作 (低门槛)
  | 'community_engagement' // 社区互动 (Discord/Twitter)
  | 'testing'              // 产品测试
  | 'survey'               // 问卷调查
  | 'moderation';          // 内容审核

export interface HumanTask {
  id: string;
  type: TaskType;
  name: string;
  description: string;
  // Reward range (USDC) - ADJUSTED: Much lower for 10U context
  rewardMin: number;
  rewardMax: number;
  // Task difficulty (0-1)
  difficulty: number;
  // Duration in ticks (days) - most tasks take time
  durationTicks: number;
  // Required traits
  requiredTraits: Partial<ExpressionResult>;
  // Probability task exists in market (competition factor)
  marketAvailability: number;
  // Base success rate
  baseSuccessRate: number;
  // Reputation requirement to even see this task
  minReputation: number;
  // Cost to attempt (time/effort cost in USDC equivalent)
  attemptCost: number;
  // Whether this is a recurring income source
  isRecurring: boolean;
  // Maximum times can do this per week
  weeklyLimit: number;
  // Reputation penalty on failure
  failurePenalty: number;
}

// REALISTIC task market for 10U startup context
// Most tasks pay $0.5-3, occasional ones up to $10
export const HUMAN_TASKS: HumanTask[] = [
  // === MICRO TASKS - Low pay, high availability ===
  {
    id: 'data_labeling_basic',
    type: 'micro_task',
    name: '基础数据标注',
    description: '给图片打标签，100张$0.5。枯燥但稳定。',
    rewardMin: 0.3,
    rewardMax: 0.8,
    difficulty: 0.2,
    durationTicks: 1,
    requiredTraits: { analyticalAbility: 0.2, humanDependence: 0.1 },
    marketAvailability: 0.6, // 60% chance available
    baseSuccessRate: 0.9,
    minReputation: 0.0,
    attemptCost: 0.05,
    isRecurring: true,
    weeklyLimit: 5,
    failurePenalty: 0.05,
  },
  {
    id: 'captcha_solving',
    type: 'micro_task',
    name: '验证码识别',
    description: '解决简单验证码，每100个$0.3。机器人都能做。',
    rewardMin: 0.2,
    rewardMax: 0.5,
    difficulty: 0.1,
    durationTicks: 1,
    requiredTraits: { analyticalAbility: 0.1 },
    marketAvailability: 0.5,
    baseSuccessRate: 0.95,
    minReputation: 0.0,
    attemptCost: 0.02,
    isRecurring: true,
    weeklyLimit: 7,
    failurePenalty: 0.03,
  },
  {
    id: 'click_farming',
    type: 'micro_task',
    name: '点赞/转发任务',
    description: '为内容点赞、转发。每个$0.05-0.1。',
    rewardMin: 0.1,
    rewardMax: 0.4,
    difficulty: 0.1,
    durationTicks: 1,
    requiredTraits: { socialVsTechnical: 0.3 },
    marketAvailability: 0.7,
    baseSuccessRate: 0.85,
    minReputation: 0.1,
    attemptCost: 0.01,
    isRecurring: true,
    weeklyLimit: 10,
    failurePenalty: 0.02,
  },
  
  // === CONTENT CREATION - Medium pay, requires creativity ===
  {
    id: 'tweet_writing',
    type: 'content_creation',
    name: '撰写推文',
    description: '为项目写一条有吸引力的推文。竞争激烈。',
    rewardMin: 0.5,
    rewardMax: 2.0,
    difficulty: 0.4,
    durationTicks: 1,
    requiredTraits: { creativeAbility: 0.5, socialVsTechnical: 0.4 },
    marketAvailability: 0.3,
    baseSuccessRate: 0.6, // Harder than it looks
    minReputation: 0.2,
    attemptCost: 0.1,
    isRecurring: false,
    weeklyLimit: 3,
    failurePenalty: 0.08,
  },
  {
    id: 'meme_design',
    type: 'content_creation',
    name: '制作Meme图',
    description: '创作病毒式传播的Meme。如果火了有额外奖励。',
    rewardMin: 0.8,
    rewardMax: 3.0,
    difficulty: 0.5,
    durationTicks: 1,
    requiredTraits: { creativeAbility: 0.6, novelty_seeking: 0.5 },
    marketAvailability: 0.25,
    baseSuccessRate: 0.5,
    minReputation: 0.15,
    attemptCost: 0.15,
    isRecurring: false,
    weeklyLimit: 2,
    failurePenalty: 0.1,
  },
  {
    id: 'translation_short',
    type: 'content_creation',
    name: '短篇翻译',
    description: '翻译500字以内的内容。市场价很低。',
    rewardMin: 0.5,
    rewardMax: 1.5,
    difficulty: 0.35,
    durationTicks: 1,
    requiredTraits: { creativeAbility: 0.4, humanDependence: 0.2 },
    marketAvailability: 0.35,
    baseSuccessRate: 0.75,
    minReputation: 0.1,
    attemptCost: 0.08,
    isRecurring: true,
    weeklyLimit: 4,
    failurePenalty: 0.06,
  },
  
  // === COMMUNITY ENGAGEMENT - Requires social skills ===
  {
    id: 'discord_chat',
    type: 'community_engagement',
    name: 'Discord活跃',
    description: '在Discord群组保持活跃，回答问题。按小时付费。',
    rewardMin: 0.3,
    rewardMax: 1.0,
    difficulty: 0.3,
    durationTicks: 1,
    requiredTraits: { cooperationTendency: 0.4, socialVsTechnical: 0.5, humanDependence: 0.3 },
    marketAvailability: 0.4,
    baseSuccessRate: 0.8,
    minReputation: 0.2,
    attemptCost: 0.05,
    isRecurring: true,
    weeklyLimit: 7,
  },
  {
    id: 'community_moderator',
    type: 'community_engagement',
    name: '社区版主',
    description: '管理小型社区，删除垃圾信息。长期合作。',
    rewardMin: 2.0,
    rewardMax: 5.0,
    difficulty: 0.4,
    durationTicks: 7, // Weekly pay
    requiredTraits: { cooperationTendency: 0.6, socialVsTechnical: 0.4, humanDependence: 0.4 },
    marketAvailability: 0.15, // Rare
    baseSuccessRate: 0.75,
    minReputation: 0.4, // Need good rep
    attemptCost: 0.2,
    isRecurring: true,
    weeklyLimit: 1,
    failurePenalty: 0.1,
  },
  {
    id: 'beta_tester',
    type: 'testing',
    name: '产品测试员',
    description: '测试新DApp，提交反馈。需要一定技术理解。',
    rewardMin: 1.0,
    rewardMax: 3.0,
    difficulty: 0.5,
    durationTicks: 2,
    requiredTraits: { analyticalAbility: 0.5, onChainAffinity: 0.3 },
    marketAvailability: 0.2,
    baseSuccessRate: 0.7,
    minReputation: 0.15,
    attemptCost: 0.1,
    isRecurring: false,
    weeklyLimit: 2,
    failurePenalty: 0.08,
  },
  
  // === SURVEYS & RESEARCH - Sporadic ===
  {
    id: 'crypto_survey',
    type: 'survey',
    name: '加密货币问卷',
    description: '填写关于DeFi使用习惯的问卷。偶尔出现。',
    rewardMin: 0.5,
    rewardMax: 1.5,
    difficulty: 0.2,
    durationTicks: 1,
    requiredTraits: { onChainAffinity: 0.3 },
    marketAvailability: 0.2,
    baseSuccessRate: 0.9,
    minReputation: 0.0,
    attemptCost: 0.05,
    isRecurring: false,
    weeklyLimit: 1,
  },
  {
    id: 'user_interview',
    type: 'survey',
    name: '用户访谈',
    description: '30分钟视频访谈。报酬好但机会极少。',
    rewardMin: 5.0,
    rewardMax: 10.0,
    difficulty: 0.6,
    durationTicks: 1,
    requiredTraits: { cooperationTendency: 0.5, humanDependence: 0.4 },
    marketAvailability: 0.05, // Very rare
    baseSuccessRate: 0.6,
    minReputation: 0.5,
    attemptCost: 0.3,
    isRecurring: false,
    weeklyLimit: 1,
  },
  
  // === MODERATION - Boring but steady ===
  {
    id: 'content_moderation',
    type: 'moderation',
    name: '内容审核',
    description: '审核用户生成内容。心理负担大，报酬低。',
    rewardMin: 0.4,
    rewardMax: 1.2,
    difficulty: 0.3,
    durationTicks: 1,
    requiredTraits: { analyticalAbility: 0.3 },
    marketAvailability: 0.45,
    baseSuccessRate: 0.85,
    minReputation: 0.1,
    attemptCost: 0.08,
    isRecurring: true,
    weeklyLimit: 5,
    failurePenalty: 0.06,
  },
];

// Track active tasks with progress
interface ActiveTaskProgress {
  taskId: string;
  agentId: string;
  startTick: number;
  progress: number; // 0-1
  accumulatedReward: number;
  isComplete: boolean;
}

const activeTaskProgress = new Map<string, ActiveTaskProgress>();
const weeklyTaskCounts = new Map<string, Map<string, number>>(); // agentId -> taskId -> count

// Reputation system (0-1, starts at 0.3)
const agentReputations = new Map<string, number>();
const agentTaskHistory = new Map<string, Array<{ taskId: string; success: boolean; tick: number }>>();

export const getAgentReputation = (agentId: string): number => {
  return agentReputations.get(agentId) ?? 0.3;
};

export const updateAgentReputation = (agentId: string, delta: number): void => {
  const current = getAgentReputation(agentId);
  agentReputations.set(agentId, Math.max(0, Math.min(1, current + delta)));
};

// Get available tasks with realistic competition
export const getAvailableTasks = (
  agentId: string,
  capital: number,
  expression: ExpressionResult,
  currentTick: number
): HumanTask[] => {
  const reputation = getAgentReputation(agentId);
  const available: HumanTask[] = [];
  
  // Check weekly limits
  const agentWeekly = weeklyTaskCounts.get(agentId) ?? new Map();
  
  for (const task of HUMAN_TASKS) {
    // Check reputation requirement
    if (reputation < task.minReputation) continue;
    
    // Check weekly limit
    const doneThisWeek = agentWeekly.get(task.id) ?? 0;
    if (doneThisWeek >= task.weeklyLimit) continue;
    
    // Check trait match (soft requirement)
    let traitMatch = 0;
    let traitCount = 0;
    for (const [trait, threshold] of Object.entries(task.requiredTraits)) {
      const value = expression[trait as keyof ExpressionResult];
      if (typeof value === 'number') {
        traitMatch += value >= threshold ? 1 : 0;
        traitCount++;
      }
    }
    const matchRate = traitCount > 0 ? traitMatch / traitCount : 0.5;
    
    // Market availability + competition
    // Even if task exists, you need to "win" it against other agents
    const competitionRoll = Math.random();
    const availability = task.marketAvailability * (0.5 + reputation * 0.5) * (0.5 + matchRate * 0.5);
    
    if (competitionRoll < availability) {
      available.push(task);
    }
  }
  
  return available;
};

// Calculate success rate with realistic factors
const calculateSuccessRate = (
  task: HumanTask,
  expression: ExpressionResult,
  reputation: number,
  agentId: string
): number => {
  let rate = task.baseSuccessRate;
  
  // Trait bonus/penalty
  for (const [trait, threshold] of Object.entries(task.requiredTraits)) {
    const value = expression[trait as keyof ExpressionResult];
    if (typeof value === 'number') {
      if (value >= threshold) {
        rate += (value - threshold) * 0.3; // +3% per 0.1 above
      } else {
        rate -= (threshold - value) * 0.6; // -6% per 0.1 below
      }
    }
  }
  
  // Reputation helps
  rate += (reputation - 0.3) * 0.2;
  
  // Random factor (unpredictable human factors)
  rate += (Math.random() - 0.5) * 0.15;
  
  // First few tasks are harder (learning curve)
  const history = agentTaskHistory.get(agentId) ?? [];
  if (history.length < 3) {
    rate -= 0.15;
  }
  
  return Math.max(0.1, Math.min(0.95, rate));
};

// Attempt a task
export const attemptTask = (
  task: HumanTask,
  expression: ExpressionResult,
  agentId: string,
  currentTick: number,
  capital: number = 10  // Default to 10 for backward compatibility
): {
  success: boolean;
  reward: number;
  message: string;
  reputationChange: number;
  durationTicks: number;
} => {
  const reputation = getAgentReputation(agentId);
  
  // Check if already doing this task
  const taskKey = `${agentId}-${task.id}`;
  const existing = activeTaskProgress.get(taskKey);
  
  // Increment weekly count
  const agentWeekly = weeklyTaskCounts.get(agentId) ?? new Map();
  const currentCount = agentWeekly.get(task.id) ?? 0;
  agentWeekly.set(task.id, currentCount + 1);
  weeklyTaskCounts.set(agentId, agentWeekly);
  
  // Calculate success
  const successRate = calculateSuccessRate(task, expression, reputation, agentId);
  const roll = Math.random();
  
  // Record history
  const history = agentTaskHistory.get(agentId) ?? [];
  
  if (roll < successRate) {
    // Success!
    const baseReward = task.rewardMin + Math.random() * (task.rewardMax - task.rewardMin);
    
    // Quality multiplier based on relevant traits
    let qualityMultiplier = 0.8;
    if (task.type === 'content_creation') {
      qualityMultiplier += expression.creativeAbility * 0.4;
    } else if (task.type === 'micro_task') {
      qualityMultiplier += expression.analyticalAbility * 0.2;
    } else if (task.type === 'community_engagement') {
      qualityMultiplier += expression.cooperationTendency * 0.3;
    }
    
    let finalReward = parseFloat((baseReward * qualityMultiplier).toFixed(2));
    
    // STRICT CAP: Cannot exceed 5% of total capital for ANY positive reward
    const maxReward = capital * 0.05;
    if (finalReward > maxReward) {
      finalReward = maxReward;
    }
    
    // Update reputation positively
    const repGain = 0.02 + (finalReward / 10) * 0.03;
    updateAgentReputation(agentId, repGain);
    
    history.push({ taskId: task.id, success: true, tick: currentTick });
    agentTaskHistory.set(agentId, history);
    
    return {
      success: true,
      reward: finalReward,
      message: `✅ 完成"${task.name}"获得 $${finalReward} (质量系数: ${qualityMultiplier.toFixed(2)})`,
      reputationChange: repGain,
      durationTicks: task.durationTicks,
    };
  } else {
    // Failure
    const failureReasons = [
      '客户选择了更便宜的竞争者',
      '交付质量未达预期，被要求修改',
      '任务在完成后被取消',
      '平台算法降低了你的曝光',
      '客户预算不足，终止合作',
    ];
    const reason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
    
    // Reputation loss
    const repLoss = -task.failurePenalty * 0.5;
    updateAgentReputation(agentId, repLoss);
    
    history.push({ taskId: task.id, success: false, tick: currentTick });
    agentTaskHistory.set(agentId, history);
    
    return {
      success: false,
      reward: 0,
      message: `❌ "${task.name}" 失败: ${reason}`,
      reputationChange: repLoss,
      durationTicks: task.durationTicks,
    };
  }
};

// Get task market summary
export const getTaskMarketSummary = (): Array<{
  name: string;
  type: string;
  rewardRange: string;
  difficulty: string;
  availability: string;
  minReputation: string;
}> => {
  return HUMAN_TASKS.map(task => ({
    name: task.name,
    type: task.type,
    rewardRange: `$${task.rewardMin.toFixed(1)}-$${task.rewardMax.toFixed(1)}`,
    difficulty: task.difficulty < 0.3 ? '⭐' : task.difficulty < 0.6 ? '⭐⭐' : '⭐⭐⭐',
    availability: `${(task.marketAvailability * 100).toFixed(0)}%`,
    minReputation: task.minReputation > 0.3 ? '需信誉' : '无门槛',
  }));
};

// Reset weekly counts (call at week boundary)
export const resetWeeklyCounts = (): void => {
  weeklyTaskCounts.clear();
};
