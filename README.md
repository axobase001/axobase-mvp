# Axobase MVP - AI Agent 进化实验平台

> **版本**: V4 (修改版)  
> **状态**: 实验进行中  
> **最后更新**: 2026-02-23

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
# 复制 .env.example 到 .env，填入你的 API 密钥

# 3. 一键启动 V4 实验
START_REAL_V4.bat

# 4. 数据上传到 GitHub (完成后)
node upload-experiments.cjs
```

## 📁 项目结构

```
axobase-mvp/
├── README.md                 # 本文件 - 快速入门
├── CODEBASE_GUIDE.md         # 详细代码指南 - 必须阅读
├── EXPERIMENT_REPORT.md      # 实验数据报告
├── src/                      # 源代码
│   ├── runtime/             # 核心运行时
│   │   ├── population.ts    # 种群管理 (关键修改)
│   │   └── agent.ts         # Agent 类
│   ├── lifecycle/           # 生命周期
│   │   ├── development.ts   # 发育阶段 (V4修改)
│   │   ├── breeding.ts      # 繁殖系统 (V4修改)
│   │   └── death.ts         # 死亡判定
│   ├── decision/            # 决策系统
│   ├── genome/              # 基因组系统
│   ├── environment/         # 环境事件
│   ├── monitoring/          # 监控记录
│   └── api.ts               # REST API
├── web/                     # 前端
├── monitor_v4.cjs           # V4 数据监控 (推荐)
├── upload-experiments.cjs   # GitHub 上传工具
├── experiment_logs_v4/      # 实验数据 (V4)
└── github-upload/           # GitHub 备份
```

## 📝 关键修改 (V4)

| 修改项 | 原值 | 新值 | 影响 |
|--------|------|------|------|
| NEONATE_DURATION | 10 | 5 | 加快发育 |
| JUVENILE_DURATION | 20 | 5 | 更快成年 |
| MINIMUM_BREEDING_AGE | 15 | 10 | 提前繁殖 |
| BREEDING_BALANCE_THRESHOLD | 8 | 5 | 降低门槛 |
| 意愿门槛 | 0.2-0.8 | 0.1-0.4 | 提高繁殖意愿 |
| 总量计算 | 死亡减少 | 死亡不减 | 准确统计 |
| LLM 统计 | 无 | 有 | 监控成本 |

## 📊 数据格式

```javascript
// experiment_logs_v4/experiment_v4_*.jsonl
{
  "tick": 10,
  "timestamp": "2026-02-23T08:10:00.000Z",
  "stats": {
    "aliveAgents": 10,        // 存活数
    "totalAgents": 12,        // 总量 (死亡不减)
    "displayCount": "10/12",  // 显示格式
    "llmCallsThisTick": 8,    // 本tick调用
    "totalLLMCalls": 156,     // 累计调用
    "averageBalance": 22.34,
    "breedingEvents": 2,
    "deathEvents": 1
  },
  "agents": [...],
  "monitor": {...}
}
```

## 🔧 配置文件

### 环境变量 (.env)
```bash
INITIAL_USDC_PER_AGENT=30      # 初始余额
TICK_INTERVAL_MS=60000         # tick间隔(60秒)
OPENAI_API_KEY=sk-xxx          # OpenAI API密钥
```

### 核心常数 (src/config/constants.ts)
```typescript
// 发育阶段
NEONATE_DURATION: 5             // 0-4 ticks
JUVENILE_DURATION: 5            // 5-9 ticks
MINIMUM_BREEDING_AGE: 10        // 10 ticks成年

// 繁殖门槛
BREEDING_BALANCE_THRESHOLD: 5.0  // 5 USDC
BREEDING_COST_PER_PARENT: 3.0   // 3 USDC/父母

// 结束条件
EXPERIMENT_END_BALANCE: 500.0   // 存款>500
EXPERIMENT_END_AGE: 720         // 年龄>720 ticks
```

## 🐛 故障排除

### Backend 崩溃
**症状**: Monitor 显示 "无法获取 stats 数据"  
**解决**: 保持 Monitor 运行，重启 Backend
```bash
npm run experiment
```

### 年龄不增长
**症状**: `isRunning: false`  
**原因**: Backend 停止  
**解决**: 重启 Backend

### 繁殖不触发
**检查**: 
1. 年龄 >= 10?
2. 阶段 = adult?
3. 余额 >= 8 USDC?
4. 冷却期已过?

## 📖 详细文档

- **CODEBASE_GUIDE.md**: 完整的代码架构指南
- **EXPERIMENT_REPORT.md**: 实验数据统计
- **src/config/constants.ts**: 所有配置参数

## 📦 数据备份

```bash
# 一键上传到 GitHub
node upload-experiments.cjs

# 手动备份
# 复制 experiment_logs_v4/ 到 github-upload/
```

## 🔗 链接

- GitHub: https://github.com/axobase001/axobase-mvp
- 数据: `github-upload/` 目录

---

**维护**: Axobase Team  
**License**: MIT
