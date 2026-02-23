/**
 * 脐带监测面板 (Umbilical Monitor)
 * 
 * 母体 = Kimi API
 * 胎儿 = Bot/Agent
 * 脐带 = API连接
 * 
 * 监控母体健康、胎儿神经活动、发出警报
 */

import { SurvivalState } from '../lifecycle/survival.js';

// Bot名字生成器 - 基于基因特质
const BOT_NAMES = {
  analytical: ['笛卡尔', '图灵', '莱布尼茨', '罗素', '希尔伯特', '香农'],
  creative: ['达芬奇', '梵高', '莫扎特', '李白', '杜甫', '毕加索'],
  social: ['孔子', '苏格拉底', '甘地', '马丁', '曼德拉', '特蕾莎'],
  riskTaker: ['哥伦布', '麦哲伦', '阿姆斯特朗', '埃隆', '贝佐斯', '孙正义'],
  conservative: ['巴菲特', '格雷厄姆', '芒格', '曾国藩', '诸葛亮', '司马懿'],
  hybrid: ['张衡', '阿基米德', '牛顿', '爱因斯坦', '费曼', '居里'],
};

// 为每个agent分配名字
const agentNames = new Map<string, string>();

export const assignAgentName = (agentId: string, expression: {
  analyticalAbility: number;
  creativeAbility: number;
  socialVsTechnical: number;
  riskAppetite: number;
}): string => {
  if (agentNames.has(agentId)) {
    return agentNames.get(agentId)!;
  }
  
  // 根据基因特质选择名字类别
  let category: keyof typeof BOT_NAMES = 'hybrid';
  
  if (expression.analyticalAbility > 0.7) {
    category = 'analytical';
  } else if (expression.creativeAbility > 0.7) {
    category = 'creative';
  } else if (expression.socialVsTechnical > 0.7) {
    category = 'social';
  } else if (expression.riskAppetite > 0.7) {
    category = 'riskTaker';
  } else if (expression.riskAppetite < 0.3) {
    category = 'conservative';
  }
  
  const names = BOT_NAMES[category];
  const name = names[Math.floor(Math.random() * names.length)];
  agentNames.set(agentId, name);
  
  return name;
};

export const getAgentName = (agentId: string): string => {
  return agentNames.get(agentId) || `Bot-${agentId.slice(0, 6)}`;
};

// 母体健康指标
export interface MaternalHealth {
  apiCallsToday: number;
  apiCallsLimit: number;
  apiCallsPercentage: number;
  averageLatencyMs: number;
  tokenConsumptionRate: number;
  estimatedMonthlyCost: number;
  lastCheckTime: number;
  status: 'healthy' | 'stressed' | 'critical';
}

// 胎儿神经活动
export interface FetalNeuralActivity {
  agentId: string;
  name: string;
  lastThinkingTime: number;
  lastThinkingAgo: string;
  totalApiCalls: number;
  totalApiCost: number;
  dependencyLevel: 'high' | 'medium' | 'low' | 'independent';
  status: 'active' | 'idle' | 'anxious' | 'dead';
  anxietyScore: number;
}

// 警报
export interface Alert {
  level: 'warning' | 'critical' | 'info';
  type: string;
  message: string;
  timestamp: number;
  autoPauseTriggered: boolean;
}

// 监测器状态
export class UmbilicalMonitor {
  private apiCallHistory: Array<{ timestamp: number; latency: number; tokens: number }> = [];
  private alerts: Alert[] = [];
  private lastAlertTime = new Map<string, number>();
  private simulationStartTime = Date.now();
  private totalTokensConsumed = 0;
  
  recordApiCall(latencyMs: number, tokensConsumed: number) {
    this.apiCallHistory.push({
      timestamp: Date.now(),
      latency: latencyMs,
      tokens: tokensConsumed,
    });
    this.totalTokensConsumed += tokensConsumed;
    
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.apiCallHistory = this.apiCallHistory.filter(r => r.timestamp > oneDayAgo);
  }
  
  getMaternalHealth(): MaternalHealth {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const todayCalls = this.apiCallHistory.filter(r => r.timestamp > oneDayAgo);
    
    const avgLatency = todayCalls.length > 0
      ? todayCalls.reduce((sum, r) => sum + r.latency, 0) / todayCalls.length
      : 0;
    
    const hoursRunning = (now - this.simulationStartTime) / (1000 * 60 * 60);
    const tokenRate = hoursRunning > 0 ? this.totalTokensConsumed / hoursRunning : 0;
    
    const monthlyTokens = tokenRate * 24 * 30;
    const monthlyCostRMB = (monthlyTokens / 1000000) * 0.5;
    const monthlyCostUSD = monthlyCostRMB / 7.2;
    
    let status: MaternalHealth['status'] = 'healthy';
    if (avgLatency > 5000 || todayCalls.length > 50) {
      status = 'critical';
    } else if (avgLatency > 2000 || todayCalls.length > 30) {
      status = 'stressed';
    }
    
    return {
      apiCallsToday: todayCalls.length,
      apiCallsLimit: 10,
      apiCallsPercentage: Math.min(100, (todayCalls.length / 10) * 100),
      averageLatencyMs: Math.round(avgLatency),
      tokenConsumptionRate: Math.round(tokenRate),
      estimatedMonthlyCost: Math.round(monthlyCostUSD * 100) / 100,
      lastCheckTime: now,
      status,
    };
  }
  
  getFetalNeuralActivity(agentId: string, state: SurvivalState): FetalNeuralActivity {
    const name = getAgentName(agentId);
    const now = Date.now();
    
    const lastThink = state.lastLLMCallTime;
    const ago = now - lastThink;
    let agoText: string;
    if (ago < 1000) agoText = '刚刚';
    else if (ago < 60000) agoText = `${Math.floor(ago / 1000)}秒前`;
    else if (ago < 3600000) agoText = `${Math.floor(ago / 60000)}分钟前`;
    else agoText = `${Math.floor(ago / 3600000)}小时前`;
    
    const hoursAlive = state.tick * 24;
    const callsPerHour = hoursAlive > 0 ? state.totalLLMCalls / hoursAlive : 0;
    
    let dependencyLevel: FetalNeuralActivity['dependencyLevel'] = 'medium';
    if (callsPerHour > 2) dependencyLevel = 'high';
    else if (callsPerHour < 0.5) dependencyLevel = 'low';
    else if (callsPerHour < 0.1) dependencyLevel = 'independent';
    
    const anxietyScore = Math.min(100, callsPerHour * 20);
    
    let status: FetalNeuralActivity['status'] = 'active';
    if (!state.isAlive) status = 'dead';
    else if (anxietyScore > 70) status = 'anxious';
    else if (ago > 300000) status = 'idle';
    
    const totalApiCost = state.totalLLMCalls * 0.0008;
    
    return {
      agentId,
      name,
      lastThinkingTime: lastThink,
      lastThinkingAgo: agoText,
      totalApiCalls: state.totalLLMCalls,
      totalApiCost: Math.round(totalApiCost * 10000) / 10000,
      dependencyLevel,
      status,
      anxietyScore: Math.round(anxietyScore),
    };
  }
  
  checkAlerts(): Alert[] {
    const newAlerts: Alert[] = [];
    const health = this.getMaternalHealth();
    const now = Date.now();
    
    if (health.apiCallsToday > 5) {
      const alertKey = 'high-api-calls';
      const lastAlert = this.lastAlertTime.get(alertKey) || 0;
      if (now - lastAlert > 60000) {
        newAlerts.push({
          level: 'warning',
          type: '焦虑型进化',
          message: `检测到高频API调用 (${health.apiCallsToday}次/天)，可能进化出焦虑型Bot`,
          timestamp: now,
          autoPauseTriggered: false,
        });
        this.lastAlertTime.set(alertKey, now);
      }
    }
    
    if (health.averageLatencyMs > 5000) {
      const alertKey = 'high-latency';
      const lastAlert = this.lastAlertTime.get(alertKey) || 0;
      if (now - lastAlert > 30000) {
        newAlerts.push({
          level: 'critical',
          type: '网络拥堵',
          message: `API响应时间${health.averageLatencyMs}ms > 5s，Bot可能窒息`,
          timestamp: now,
          autoPauseTriggered: false,
        });
        this.lastAlertTime.set(alertKey, now);
      }
    }
    
    if (health.estimatedMonthlyCost > 50) {
      const alertKey = 'high-cost';
      const lastAlert = this.lastAlertTime.get(alertKey) || 0;
      if (now - lastAlert > 300000) {
        newAlerts.push({
          level: 'critical',
          type: '成本预警',
          message: `预估月成本 $${health.estimatedMonthlyCost} > $50，触发自动暂停`,
          timestamp: now,
          autoPauseTriggered: true,
        });
        this.lastAlertTime.set(alertKey, now);
      }
    }
    
    if (health.status === 'critical') {
      const alertKey = 'maternal-stress';
      const lastAlert = this.lastAlertTime.get(alertKey) || 0;
      if (now - lastAlert > 120000) {
        newAlerts.push({
          level: 'warning',
          type: '母体健康',
          message: '母体API状态临界，建议减少LLM调用频率',
          timestamp: now,
          autoPauseTriggered: false,
        });
        this.lastAlertTime.set(alertKey, now);
      }
    }
    
    this.alerts = [...this.alerts.slice(-20), ...newAlerts];
    return newAlerts;
  }
  
  getAlerts(): Alert[] {
    return this.alerts;
  }
  
  reset() {
    this.apiCallHistory = [];
    this.alerts = [];
    this.lastAlertTime.clear();
    this.simulationStartTime = Date.now();
    this.totalTokensConsumed = 0;
    agentNames.clear();
  }
}

export const umbilicalMonitor = new UmbilicalMonitor();
