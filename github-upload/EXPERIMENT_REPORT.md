# Axobase 实验数据汇总报告

> 生成时间: 2026-02-23T13:55:38.710Z

## 📊 实验版本统计

| 版本 | 目录 | JSONL文件 | 报告文件 | 总大小 | 状态 |
|------|------|-----------|----------|--------|------|
| V1 | experiment_logs/ | 3 | 6 | 144.88 KB | ✅ |
| V2 | experiment_logs_v2/ | 2 | 2 | 324.71 KB | ✅ |
| V3 | experiment_logs_v3/ | 1 | 2 | 326.14 KB | ✅ |
| V4 | experiment_logs_v4/ | 2 | 3 | 2311.32 KB | ✅ |

## 📁 详细文件清单

### V1 (experiment_logs/)

- `COMPLETE_EXPERIMENT_REPORT.json` (14.57 KB)
- `COMPLETE_EXPERIMENT_REPORT.md` (4.69 KB)
- `experiment_2026-02-23T04-20-49.jsonl` (72.12 KB)
- `experiment_2026-02-23T04-25-58.jsonl` (45.20 KB)
- `FINAL_REPORT.md` (5.54 KB)
- `final_report_2026-02-23T04-33-10.json` (7.00 KB)
- `long_experiment_2026-02-23T04-33-10.jsonl` (27.56 KB)
- `report_2026-02-23T04-20-49.json` (2.35 KB)
- `report_2026-02-23T04-25-58.json` (1.82 KB)

### V2 (experiment_logs_v2/)

- `ANALYSIS_REPORT.md` (5.89 KB)
- `experiment_v2_2026-02-23T07-25-33.jsonl` (178.79 KB)
- `experiment_v2_2026-02-23T07-28-47.jsonl` (145.92 KB)
- `V2_COMPARISON_REPORT.md` (5.05 KB)

### V3 (experiment_logs_v3/)

- `checkpoint_2026-02-23T08-10-51.json` (0.33 KB)
- `experiment_v3_2026-02-23T08-10-51.jsonl` (326.14 KB)
- `session.json` (0.44 KB)

### V4 (experiment_logs_v4/)

- `checkpoint_2026-02-23T08-59-54.json` (0.33 KB)
- `checkpoint_2026-02-23T09-16-40.json` (0.33 KB)
- `experiment_v4_2026-02-23T08-59-54.jsonl` (1219.26 KB)
- `experiment_v4_2026-02-23T09-16-40.jsonl` (1092.05 KB)
- `session.json` (0.45 KB)

## 🔬 实验配置

- **初始余额**: 30 USDC
- **Tick 间隔**: 60 秒
- **成年门槛**: 10 ticks
- **繁殖门槛**: 10 ticks
- **最小繁殖余额**: 8 USDC (5门槛 + 3成本)

## 📄 数据文件说明

| 文件类型 | 说明 |
|----------|------|
| `.jsonl` | 实验原始数据，每行一个 tick 的完整状态 |
| `.md` | 实验报告和分析文档 |
| `.json` | 结构化统计报告 |
| `checkpoint_*.json` | 检查点文件 |

## 📊 数据格式

### JSONL 文件结构

```json
{
  "tick": 1,
  "timestamp": "2026-02-23T08:00:00.000Z",
  "stats": {
    "totalAgents": 10,
    "aliveAgents": 10,
    "displayCount": "10/10",
    "averageBalance": 25.5,
    ...
  },
  "agents": [...],
  ...
}
```
