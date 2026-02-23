/**
 * 数字墓地自动记录系统 (Digital Graveyard Recorder)
 * 
 * 自动记录每个死亡Bot的完整档案到GRAVEYARD.md
 */

import { AgentConfig } from '../lifecycle/birth.js';
import { DeathCause, DeathVerdict, Tombstone } from '../lifecycle/death.js';
import { SurvivalState } from '../lifecycle/survival.js';
import { DynamicGenome } from '../genome/types.js';
import { getAgentName } from './umbilical-monitor.js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// GRAVEYARD.md 文件路径
const GRAVEYARD_PATH = resolve(process.cwd(), 'GRAVEYARD.md');

// API 请求记录接口
export interface APIRequestRecord {
  tick: number;
  timestamp: number;
  decision: string;
  outcome: 'success' | 'failure' | 'neutral';
  impact: number; // 经济影响 (+/-)
  cost: number; // API调用成本
  prompt_preview?: string;
  response_preview?: string;
}

// 完整死亡档案
export interface BotDeathRecord {
  // 基本信息
  id: string;
  name: string;
  birth_tick: number;
  death_tick: number;
  lifespan_ticks: number;
  generation: number;
  parent_ids?: string[];

  // 死亡原因
  death: {
    cause: DeathCause;
    reason: string;
    final_balance: number;
    consecutive_failures: number;
    last_words?: string; // 最后一条日志
  };

  // API活动
  api_activity: {
    total_calls: number;
    total_cost: number;
    calls_per_tick_avg: number;
    anxiety_score: number;
    requests: APIRequestRecord[];
  };

  // 基因组
  genome: {
    hash: string;
    total_genes: number;
    essential_genes: number;
    dominant_traits: Array<{
      trait: string;
      value: number;
      percentile: 'low' | 'medium' | 'high' | 'extreme';
    }>;
    mutations: Array<{
      tick: number;
      gene: string;
      from: number;
      to: number;
      trigger: string;
    }>;
  };

  // 经济轨迹
  economics: {
    total_earned: {
      defi: number;
      tasks: number;
      tokens: number;
      events: number;
    };
    total_spent: {
      operational: number;
      losses: number;
      inference: number;
    };
    peak_balance: number;
    final_balance: number;
    balance_history: Array<{ tick: number; balance: number }>;
  };

  // 行为记录
  behavior: {
    defi_positions_opened: number;
    tasks_completed: number;
    tasks_failed: number;
    tokens_received: number;
    tokens_sold: number;
    breeding_attempts: number;
    offspring_count: number;
  };

  // 学习总结
  lessons: string[];
}

// 记录队列（用于批量写入）
const pendingRecords: BotDeathRecord[] = [];
let lastWriteTime = 0;

/**
 * 创建死亡档案
 */
export function createDeathRecord(
  agent: AgentConfig,
  state: SurvivalState,
  verdict: DeathVerdict,
  apiHistory: APIRequestRecord[] = []
): BotDeathRecord {
  const genome = agent.genome;
  const expression = expressGenomeBrief(genome);

  // 分析主导特质
  const dominantTraits = analyzeDominantTraits(expression);

  // 分析突变
  const mutations = extractMutations(genome);

  // 计算焦虑分数
  const anxietyScore = calculateAnxietyScore(state, apiHistory);

  // 提取关键API请求（最多10个）
  const keyRequests = apiHistory
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 10);

  // 生成教训总结
  const lessons = generateLessons(verdict, state, expression);

  const record: BotDeathRecord = {
    id: agent.id,
    name: getAgentName(agent.id),
    birth_tick: 0,
    death_tick: state.tick,
    lifespan_ticks: state.tick,
    generation: genome.meta.generation,
    parent_ids: agent.parentIds ? [agent.parentIds[0], agent.parentIds[1]] : undefined,

    death: {
      cause: verdict.cause || 'economic',
      reason: verdict.reason,
      final_balance: state.balanceUSDC,
      consecutive_failures: state.consecutiveFailures,
      last_words: state.eventLog.length > 0 
        ? state.eventLog[state.eventLog.length - 1].event 
        : undefined,
    },

    api_activity: {
      total_calls: state.totalLLMCalls,
      total_cost: state.totalLLMCalls * 0.0008,
      calls_per_tick_avg: state.tick > 0 ? state.totalLLMCalls / state.tick : 0,
      anxiety_score: anxietyScore,
      requests: keyRequests,
    },

    genome: {
      hash: genome.meta.genomeHash,
      total_genes: genome.meta.totalGenes,
      essential_genes: countEssentialGenes(genome),
      dominant_traits: dominantTraits,
      mutations: mutations,
    },

    economics: {
      total_earned: state.totalEarned,
      total_spent: state.totalSpent,
      peak_balance: findPeakBalance(state),
      final_balance: state.balanceUSDC,
      balance_history: extractBalanceHistory(state),
    },

    behavior: {
      defi_positions_opened: state.defiStats?.positionsOpened || 0,
      tasks_completed: countTasks(state, true),
      tasks_failed: countTasks(state, false),
      tokens_received: state.tokenPortfolio?.holdings.size || 0,
      tokens_sold: calculateTokensSold(state),
      breeding_attempts: state.lastBreedingTick > 0 ? 1 : 0,
      offspring_count: 0, // 需要额外追踪
    },

    lessons,
  };

  return record;
}

/**
 * 记录死亡到墓地（立即写入）
 */
export function recordToGraveyard(record: BotDeathRecord): void {
  try {
    // 生成Markdown格式的档案
    const markdown = formatRecordToMarkdown(record);
    
    // 读取现有内容
    let content = '';
    if (existsSync(GRAVEYARD_PATH)) {
      content = readFileSync(GRAVEYARD_PATH, 'utf-8');
    }

    // 在"## 🪦 已记录死亡 Bot" 后插入新记录
    const insertMarker = '## 🪦 已记录死亡 Bot\n';
    const insertPos = content.indexOf(insertMarker);
    
    if (insertPos === -1) {
      // 如果找不到标记，追加到文件末尾
      content += '\n' + markdown;
    } else {
      // 在标记后插入
      const before = content.slice(0, insertPos + insertMarker.length);
      const after = content.slice(insertPos + insertMarker.length);
      content = before + '\n' + markdown + after;
    }

    // 更新统计
    content = updateStatistics(content, record);

    // 写入文件
    writeFileSync(GRAVEYARD_PATH, content, 'utf-8');
    
    console.log(`🪦 已记录 ${record.name} (${record.id.slice(0, 8)}) 到数字墓地`);
  } catch (error) {
    console.error('❌ 记录到墓地失败:', error);
  }
}

/**
 * 将记录格式化为Markdown
 */
function formatRecordToMarkdown(record: BotDeathRecord): string {
  const emoji = getDeathCauseEmoji(record.death.cause);
  const date = new Date().toISOString().split('T')[0];

  return `
### ${emoji} Bot #${record.death_tick}: ${record.name}
**死亡时间**: ${date} Tick #${record.death_tick}  
**存活时间**: ${record.lifespan_ticks} ticks (${Math.floor(record.lifespan_ticks / 60)}小时${record.lifespan_ticks % 60}分钟)  
**世代**: Gen-${record.generation} ${record.parent_ids ? `(父: ${record.parent_ids.map(id => id.slice(0, 6)).join(', ')})` : '(创始Bot)'}

#### 💀 死亡原因
- **类型**: \`${record.death.cause}\` ${getDeathCauseDescription(record.death.cause)}
- **详情**: ${record.death.reason}
- **最终余额**: $${record.death.final_balance.toFixed(4)}
- **连续失败**: ${record.death.consecutive_failures}次
${record.death.last_words ? `- **遗言**: "${record.death.last_words}"` : ''}

#### 🧠 API 活动
- **总调用**: ${record.api_activity.total_calls}次
- **总成本**: $${record.api_activity.total_cost.toFixed(4)}
- **平均频率**: ${record.api_activity.calls_per_tick_avg.toFixed(2)}次/tick
- **焦虑分数**: ${record.api_activity.anxiety_score}/100

**关键决策**:
${record.api_activity.requests.map(req => `| Tick ${req.tick} | ${req.decision.slice(0, 30)}... | ${req.outcome === 'success' ? '✅' : '❌'} | ${req.impact > 0 ? '+' : ''}$${req.impact.toFixed(2)} |`).join('\n')}

#### 🧬 基因组分析
\`\`\`
Hash: ${record.genome.hash.slice(0, 16)}...
基因数: ${record.genome.total_genes} (关键: ${record.genome.essential_genes})

显性特质:
${record.genome.dominant_traits.map(t => `- ${t.trait}: ${t.value.toFixed(2)} (${t.percentile})`).join('\n')}

突变记录:
${record.genome.mutations.length > 0 
  ? record.genome.mutations.map(m => `- Tick ${m.tick}: ${m.gene} ${m.from.toFixed(2)}→${m.to.toFixed(2)}`).join('\n')
  : '- 无显著突变'}
\`\`\`

#### 💰 经济轨迹
| 类别 | 金额 |
|------|------|
| DeFi收益 | $${record.economics.total_earned.defi.toFixed(2)} |
| 任务收入 | $${record.economics.total_earned.tasks.toFixed(2)} |
| 代币收益 | $${record.economics.total_earned.tokens.toFixed(2)} |
| 运营成本 | -$${record.economics.total_spent.operational.toFixed(2)} |
| 投资损失 | -$${record.economics.total_spent.losses.toFixed(2)} |
| **峰值余额** | **$${record.economics.peak_balance.toFixed(2)}** |
| **最终余额** | **$${record.economics.final_balance.toFixed(4)}** |

#### 🎯 行为统计
- DeFi仓位: ${record.behavior.defi_positions_opened}个
- 完成任务: ${record.behavior.tasks_completed}次 (失败${record.behavior.tasks_failed}次)
- 收到空投: ${record.behavior.tokens_received}次
- 繁殖尝试: ${record.behavior.breeding_attempts}次

#### 📚 教训总结
${record.lessons.map(l => `- ${l}`).join('\n')}

---
`;
}

/**
 * 更新统计信息
 */
function updateStatistics(content: string, record: BotDeathRecord): string {
  // 这里可以实现自动更新顶部统计数字
  // 暂时简单处理，后续可以完善
  return content;
}

// ==================== 辅助函数 ====================

function expressGenomeBrief(genome: DynamicGenome): Record<string, number> {
  // 简化的基因表达计算
  const traits: Record<string, number> = {};
  
  for (const chr of genome.chromosomes) {
    for (const gene of chr.genes) {
      if (!traits[gene.name]) {
        traits[gene.name] = 0;
      }
      traits[gene.name] += gene.value * gene.weight;
    }
  }
  
  // 归一化
  for (const key of Object.keys(traits)) {
    traits[key] = Math.min(1, Math.max(0, traits[key]));
  }
  
  return traits;
}

function analyzeDominantTraits(expression: Record<string, number>): Array<{
  trait: string;
  value: number;
  percentile: 'low' | 'medium' | 'high' | 'extreme';
}> {
  const traits = [
    'riskAppetite',
    'analyticalAbility',
    'creativeAbility',
    'adaptationSpeed',
    'cooperationTendency',
    'socialVsTechnical',
  ];

  return traits
    .map(trait => {
      const value = expression[trait] || 0.5;
      let percentile: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
      if (value < 0.2) percentile = 'low';
      else if (value < 0.4) percentile = 'medium';
      else if (value < 0.7) percentile = 'high';
      else percentile = 'extreme';

      return { trait, value, percentile };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function extractMutations(genome: DynamicGenome): Array<{
  tick: number;
  gene: string;
  from: number;
  to: number;
  trigger: string;
}> {
  // 从基因组元数据中提取突变记录
  // 这里需要基因突变追踪系统支持
  // 暂时返回空数组
  return [];
}

function countEssentialGenes(genome: DynamicGenome): number {
  return genome.chromosomes
    .flatMap(c => c.genes)
    .filter(g => g.essentiality >= 0.5)
    .length;
}

function calculateAnxietyScore(state: SurvivalState, apiHistory: APIRequestRecord[]): number {
  const callsPerTick = state.tick > 0 ? state.totalLLMCalls / state.tick : 0;
  let score = Math.min(100, callsPerTick * 20);
  
  // 连续失败增加焦虑
  score += state.consecutiveFailures * 2;
  
  // 低余额增加焦虑
  if (state.balanceUSDC < 1) score += 20;
  if (state.balanceUSDC < 0.1) score += 30;
  
  return Math.min(100, Math.round(score));
}

function findPeakBalance(state: SurvivalState): number {
  // 从actionHistory中找到最大余额
  // 简化处理，返回当前余额或初始10
  return Math.max(10, state.balanceUSDC);
}

function extractBalanceHistory(state: SurvivalState): Array<{ tick: number; balance: number }> {
  // 从actionHistory中提取余额变化
  // 简化处理，返回关键点
  return [
    { tick: 0, balance: 10 },
    { tick: state.tick, balance: state.balanceUSDC },
  ];
}

function countTasks(state: SurvivalState, success: boolean): number {
  return state.actionHistory.filter(
    a => a.action.startsWith('task:') && a.success === success
  ).length;
}

function calculateTokensSold(state: SurvivalState): number {
  return state.tokenPortfolio?.realizedProfits || 0;
}

function generateLessons(verdict: DeathVerdict, state: SurvivalState, expression: Record<string, number>): string[] {
  const lessons: string[] = [];

  if (verdict.cause === 'economic') {
    if (expression.riskAppetite > 0.7) {
      lessons.push('⚠️ 高风险偏好导致过度投机');
    }
    if (state.consecutiveFailures > 20) {
      lessons.push('📉 连续失败未及时止损');
    }
    if (expression.adaptationSpeed < 0.3) {
      lessons.push('🐌 适应速度太慢，无法应对市场变化');
    }
  }

  if (state.totalLLMCalls < 5) {
    lessons.push('💤 过于保守，缺乏主动决策');
  }

  if (state.totalLLMCalls > state.tick * 2) {
    lessons.push('🔄 过度交易，API成本侵蚀本金');
  }

  if (lessons.length === 0) {
    lessons.push('🎲 运气不佳，市场环境恶劣');
  }

  return lessons;
}

function getDeathCauseEmoji(cause: DeathCause): string {
  switch (cause) {
    case 'economic': return '💸';
    case 'genetic': return '🧬';
    case 'natural': return '🍂';
    case 'suicide': return '⚰️';
    default: return '❓';
  }
}

function getDeathCauseDescription(cause: DeathCause): string {
  switch (cause) {
    case 'economic': return '(经济死亡)';
    case 'genetic': return '(基因缺陷)';
    case 'natural': return '(自然寿终)';
    case 'suicide': return '(自我终止)';
    default: return '(未知原因)';
  }
}

// 导出统计信息
export function getGraveyardStats(): {
  totalRecorded: number;
  byCause: Record<DeathCause, number>;
  averageLifespan: number;
} {
  // 从GRAVEYARD.md解析统计
  // 简化实现
  return {
    totalRecorded: 0,
    byCause: { economic: 0, genetic: 0, natural: 0, suicide: 0 },
    averageLifespan: 0,
  };
}
