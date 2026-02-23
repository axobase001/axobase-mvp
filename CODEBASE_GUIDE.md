# Axobase MVP 代码库指南

> **项目**: Axobase MVP - AI Agent 进化实验平台  
> **版本**: V4 (修改版)  
> **最后更新**: 2026-02-23

---

## 📚 目录

1. [项目概述](#项目概述)
2. [架构设计](#架构设计)
3. [核心模块说明](#核心模块说明)
4. [关键修改记录](#关键修改记录)
5. [数据流说明](#数据流说明)
6. [实验参数配置](#实验参数配置)
7. [监控与数据记录](#监控与数据记录)
8. [故障排除](#故障排除)

---

## 项目概述

Axobase MVP 是一个模拟 AI Agent（机器人）生态进化的实验平台。每个 Agent 拥有：
- 💰 虚拟资金（USDC）
- 🧬 基因组（决定行为策略）
- 🧠 LLM 决策能力
- 💕 繁殖能力（满足条件时）

### 核心机制

```
初始化 → Tick循环 → 决策 → 交易 → 繁殖/死亡 → 记录数据
```

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (web/)                          │
│  - React + TypeScript                                        │
│  - 实时数据可视化                                            │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │ HTTP API
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        API 层 (src/api.ts)                   │
│  - 提供 RESTful 接口                                         │
│  - 数据聚合与格式化                                          │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     核心业务层 (src/)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ runtime/     │  │ lifecycle/   │  │ decision/    │      │
│  │ Agent管理    │  │ 生命周期     │  │ 决策引擎     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ genome/      │  │ environment/ │  │ monitoring/  │      │
│  │ 基因组系统   │  │ 环境事件     │  │ 监控记录     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心模块说明

### 1. Runtime 层 (`src/runtime/`)

#### `population.ts` - 种群管理器
```typescript
/**
 * PopulationManager 负责管理整个 Agent 种群
 * 
 * 核心职责:
 * - 初始化种群 (initialize)
 * - 运行 Tick 循环 (runTick)
 * - 管理繁殖 (scanBreedingOpportunities)
 * - 统计计算 (getStats)
 * 
 * 修改记录:
 * - V4: 修改总量计算 (死亡不减总量)
 * - V4: 增加 LLM 统计
 * - V4: 修复 getSnapshotSummary bug
 */
class Population {
  agents: Map<string, Agent>     // 所有 Agent
  totalCreated: number           // 累计创建数 (V4新增)
  llmCallsThisTick: number       // 当前tick LLM调用 (V4新增)
  totalLLMCalls: number          // 累计 LLM 调用 (V4新增)
}
```

#### `agent.ts` - 单个 Agent
```typescript
/**
 * Agent 类代表实验中的单个 AI Agent
 * 
 * 属性:
 * - id: 唯一标识
 * - balanceUSDC: 资金余额
 * - age: 年龄 (tick数)
 * - stage: 发育阶段 (neonate/juvenile/adult/senescent)
 * - genome: 基因组配置
 * 
 * 方法:
 * - tick(): 每个 tick 执行决策
 * - decide(): 使用 LLM 做决策
 * - execute(): 执行交易/投资
 */
```

### 2. Lifecycle 层 (`src/lifecycle/`)

#### `development.ts` - 发育阶段
```typescript
/**
 * 发育阶段定义 (V4修改)
 * 
 * 原配置 (V3):
 * - NEONATE: 0-9 ticks (10 ticks)
 * - JUVENILE: 10-29 ticks (20 ticks)
 * - ADULT: 30+ ticks
 * 
 * 新配置 (V4):
 * - NEONATE: 0-4 ticks (5 ticks)
 * - JUVENILE: 5-9 ticks (5 ticks)
 * - ADULT: 10+ ticks
 * 
 * 修改原因: 加快实验进程，更快观察到繁殖行为
 */

export enum DevelopmentStage {
  NEONATE = 'neonate',      // 新生儿期 (保护期)
  JUVENILE = 'juvenile',    // 幼年期
  ADULT = 'adult',          // 成年期 (可繁殖)
  SENESCENT = 'senescent',  // 衰老期
}
```

#### `breeding.ts` - 繁殖系统
```typescript
/**
 * 繁殖系统 (V4修改)
 * 
 * 繁殖条件:
 * 1. 年龄 >= 10 ticks (原 15)
 * 2. 阶段 = adult/senescent
 * 3. 余额 >= 8 USDC (5门槛 + 3成本)
 * 4. 冷却期已过 (15 ticks)
 * 5. 双方意愿匹配 (门槛降低)
 * 
 * 繁殖成本:
 * - 父母各支付 3 USDC
 * - 子代获得 6 USDC 初始资金
 * 
 * 修改原因: 降低繁殖门槛，增加种群增长机会
 */

// 关键函数
export function checkBreedingEligibility(...)  // 检查繁殖资格
export function attemptBreeding(...)            // 尝试繁殖
export function evaluateMateChoice(...)         // 评估配偶 (门槛降低)
```

#### `death.ts` - 死亡判定
```typescript
/**
 * 死亡条件:
 * 1. 经济死亡: 余额 < 0.01 USDC
 * 2. 濒死超时: < 1.0 USDC 持续 10 ticks
 * 3. 基因死亡: 必需基因 < 3 个
 * 4. 自然死亡: 超过 max_lifespan
 * 
 * 注意: 死亡不影响总量统计 (V4修改)
 */
```

### 3. Decision 层 (`src/decision/`)

```typescript
/**
 * 决策系统
 * 
 * 流程:
 * 1. perceive(): 感知环境，收集信息
 * 2. decide(): LLM 决策，选择行动
 * 3. execute(): 执行行动，更新状态
 * 
 * LLM 调用:
 * - 每个 Agent 每 tick 最多调用 1 次
 * - 调用成本: $0.0008/次
 * - 统计: llmCallsThisTick / totalLLMCalls
 */
```

### 4. Genome 层 (`src/genome/`)

```typescript
/**
 * 基因组系统
 * 
 * 基因类型:
 * - metabolic: 代谢相关 (成本/收益)
 * - strategic: 策略相关 (风险偏好)
 * - social: 社交相关 (繁殖意愿)
 * 
 * 表观遗传:
 * - 环境影响基因表达
 * - 繁殖时可能变异
 */
```

### 5. Monitoring 层 (`src/monitoring/`)

```typescript
/**
 * 监控记录系统
 * 
 * 数据文件:
 * - experiment_logs_v4/*.jsonl: 原始数据
 * - snapshots/tick-*.json: 种群快照
 * - session.json: 会话状态
 * 
 * 记录频率:
 * - 每 tick: 即时写入
 * - 每 10 ticks: 种群快照
 * - 每 60 ticks: GitHub 上传
 */
```

---

## 关键修改记录

### V4 修改 (2026-02-23)

| 修改项 | 原值 | 新值 | 原因 |
|--------|------|------|------|
| NEONATE_DURATION | 10 | 5 | 加快发育 |
| JUVENILE_DURATION | 20 | 5 | 加快成年 |
| MINIMUM_BREEDING_AGE | 15 | 10 | 提前繁殖 |
| BREEDING_BALANCE_THRESHOLD | 8 | 5 | 降低门槛 |
| 意愿门槛 | 0.2-0.8 | 0.1-0.4 | 提高繁殖意愿 |
| 总量计算 | 死亡减少 | 死亡不减 | 统计更准确 |
| LLM 统计 | 无 | 新增 | 监控资源使用 |

---

## 数据流说明

### Tick 循环数据流

```
┌────────────────────────────────────────────────────────────┐
│ Tick Start                                                 │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ 1. 检查结束条件                                            │
│    - 余额 > 500?                                           │
│    - 年龄 > 720?                                           │
│    - 后代占比 > 50%?                                       │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ 2. 每个 Agent 执行 tick()                                  │
│    - 感知环境 (perceive)                                   │
│    - LLM 决策 (decide)                                     │
│    - 执行行动 (execute)                                    │
│    - 检查死亡 (checkDeath)                                 │
│    - 累计 LLM 调用                                         │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ 3. 繁殖扫描                                                │
│    - 找出可繁殖的 Agent                                    │
│    - 匹配配偶                                              │
│    - 执行繁殖 (扣除成本, 创建子代)                         │
│    - totalCreated++                                        │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ 4. 记录数据                                                │
│    - 写入 .jsonl (即时 fsync)                              │
│    - 每 10 ticks: 种群快照                                 │
│    - 每 60 ticks: GitHub 上传                              │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ Tick End → 等待 60 秒 → 下一 Tick                          │
└────────────────────────────────────────────────────────────┘
```

### 数据文件格式

```javascript
// experiment_logs_v4/experiment_v4_*.jsonl
{
  "tick": 10,
  "timestamp": "2026-02-23T08:10:00.000Z",
  "stats": {
    // 种群统计 (V4新格式)
    "totalAgents": 12,        // 累计创建 (死亡不减)
    "aliveAgents": 10,        // 当前存活
    "deadAgents": 2,          // 累计死亡
    "displayCount": "10/12",  // 显示格式
    
    // LLM 统计 (V4新增)
    "llmCallsThisTick": 8,
    "totalLLMCalls": 156,
    
    // 资金统计
    "averageBalance": 22.34,
    "medianBalance": 25.63,
    "minBalance": 1.62,
    "maxBalance": 30.70,
    
    // 其他
    "breedingEvents": 2,
    "deathEvents": 1,
    "strategyDistribution": { "adult": 10 }
  },
  "agents": [...],      // Agent 详情
  "monitor": {...}      // 脐带健康
}
```

---

## 实验参数配置

### 配置文件位置

| 文件 | 用途 |
|------|------|
| `.env` | 环境变量 (初始余额, tick间隔) |
| `src/config/constants.ts` | 核心常数 (发育阶段, 繁殖门槛) |
| `src/config/costs.ts` | 成本配置 |

### 关键参数

```typescript
// src/config/constants.ts

// 发育阶段 (V4修改)
NEONATE_DURATION: 5           // 0-4 ticks
JUVENILE_DURATION: 5          // 5-9 ticks

// 繁殖门槛 (V4修改)
MINIMUM_BREEDING_AGE: 10           // 10 ticks (原15)
BREEDING_BALANCE_THRESHOLD: 5.0    // 5 USDC (原8)
BREEDING_COST_PER_PARENT: 3.0      // 3 USDC/父母

// 结束条件
EXPERIMENT_END_BALANCE: 500.0      // 存款>500
EXPERIMENT_END_AGE: 720             // 年龄>720 ticks

// 死亡门槛
DEATH_BALANCE_THRESHOLD: 0.01      // 余额<0.01死亡
DYING_THRESHOLD: 1.0               // <1.0进入濒死
```

---

## 监控与数据记录

### 启动监控

```bash
# V4 监控 (推荐)
node monitor_v4.cjs

# 数据目录: experiment_logs_v4/
```

### 监控显示

```
[hh:mm:ss] V4 Tick #X | 运行Y分钟
👥 存活/总量: 10/12 | 🐣2 | 💀1
🤖 LLM: 8次/tick | 累计: 156次
💰 平均:22.34 📈-26% | 流动:85.34 | 锁定:135.42
📊 最高:30.70 | 最低:1.62 | 年龄:11
🩺 healthy 💚 | API:0/10
🏷️  adult:10
🎯 结束条件: 余额>6% | 年龄>2%
💕 繁殖: ✅ 已成年(≥10) | 资金:✅(22.3>8)
```

### 数据文件

```
experiment_logs_v4/
├── experiment_v4_2026-02-23Txx-xx-xx.jsonl  # 主数据
├── checkpoint_2026-02-23Txx-xx-xx.json      # 检查点
└── session.json                              # 会话状态
```

---

## 故障排除

### 常见问题

#### 1. Backend 崩溃
**症状**: Monitor 显示 "无法获取 stats 数据"  
**解决**: 
```bash
# 保持 Monitor 开着！
# 重新启动 Backend
npm run experiment
```

#### 2. 年龄不增长
**症状**: `isRunning: false`  
**原因**: Backend 停止  
**解决**: 重启 Backend

#### 3. 繁殖不触发
**检查项**:
- 年龄 >= 10?
- 阶段 = adult?
- 余额 >= 8 USDC?
- 冷却期已过?

#### 4. 数据丢失
**预防**: 
- 使用 `monitor_v4.cjs` (即时写入)
- 每 5 ticks 自动检查点
- 定期上传到 GitHub

---

## 接手检查清单

- [ ] 阅读 `README.md` 和 `CODEBASE_GUIDE.md`
- [ ] 检查 `.env` 配置
- [ ] 检查 `src/config/constants.ts` 参数
- [ ] 运行 `npm install` 安装依赖
- [ ] 运行测试: `npm run experiment`
- [ ] 检查监控: `node monitor_v4.cjs`
- [ ] 查看数据: `experiment_logs_v4/`
- [ ] 上传到 GitHub: `node upload-experiments.cjs`

---

## 联系方式

- GitHub: https://github.com/axobase001/axobase-mvp
- 数据目录: `github-upload/`

---

**最后更新**: 2026-02-23  
**版本**: V4
