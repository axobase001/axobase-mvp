# 🤖 LLM 配置指南

## 当前配置

默认使用 **Kimi K2.5** via OpenRouter

```bash
OPENROUTER_MODEL=kimi/kimi-k2-5
```

## 为什么选择 Kimi？

| 特性 | Kimi K2.5 | Qwen 2.5 7B |
|------|-----------|-------------|
| **中文理解** | ⭐⭐⭐⭐⭐ 极佳 | ⭐⭐⭐ 良好 |
| **推理能力** | ⭐⭐⭐⭐⭐ 强 | ⭐⭐⭐ 中等 |
| **上下文长度** | 256K tokens | 32K tokens |
| **成本** | $0.50/百万tokens | $0.05/百万tokens |
| **响应速度** | 快 | 很快 |

**Kimi 的优势**：
- 更好的中文理解和生成
- 更长的上下文记忆（适合复杂决策）
- 更强的逻辑推理能力
- 更好的指令遵循

**成本对比**（每次决策约1,600 tokens）：
- Kimi: ~$0.0008 / 次
- Qwen: ~$0.00008 / 次
- **Kimi 贵 10 倍，但效果提升明显**

---

## 如何切换模型

### 方法 1: 修改 .env 文件（推荐）

打开 `.env` 文件，修改这一行：

```bash
# 使用 Kimi（默认）
OPENROUTER_MODEL=kimi/kimi-k2-5

# 或切换到其他模型
OPENROUTER_MODEL=qwen/qwen-2.5-7b-instruct     # 最便宜
OPENROUTER_MODEL=deepseek/deepseek-chat         # 推理强
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet    # 最强但贵
```

保存后**重启服务**生效。

---

### 方法 2: 环境变量覆盖

Windows PowerShell:
```powershell
$env:OPENROUTER_MODEL="kimi/kimi-k2-5"
npm run dev
```

Windows CMD:
```cmd
set OPENROUTER_MODEL=kimi/kimi-k2-5
npm run dev
```

---

## 支持的模型列表

### 已测试并支持

| 模型 | 模型ID | 成本(输入/输出) | 推荐场景 |
|------|--------|----------------|---------|
| **Kimi K2.5** | `kimi/kimi-k2-5` | $0.50/$0.50 | 默认推荐 |
| Qwen 2.5 7B | `qwen/qwen-2.5-7b-instruct` | $0.05/$0.05 | 低成本测试 |
| DeepSeek V3 | `deepseek/deepseek-chat` | $0.50/$0.50 | 数学/逻辑 |
| DeepSeek R1 | `deepseek/deepseek-r1` | $0.55/$2.19 | 复杂推理 |
| Claude 3.5 Sonnet | `anthropic/claude-3.5-sonnet` | $3.00/$15.00 | 高质量(贵) |

---

## 成本计算

### Kimi K2.5
```
单次决策成本:
  输入: ~1,300 tokens × $0.50/1M = $0.00065
  输出: ~300 tokens × $0.50/1M = $0.00015
  ──────────────────────────────────────
  单次: ~$0.0008
  
每天成本 (72次决策): ~$0.058
每天成本 (144次决策): ~$0.115
```

### Qwen 2.5 7B（对比）
```
单次决策成本:
  单次: ~$0.00008 (便宜10倍)
  
每天成本 (72次决策): ~$0.006
每天成本 (144次决策): ~$0.012
```

---

## 为不同 Agent 配置不同模型

如果你想让不同 Agent 使用不同模型（高级功能），可以修改 `src/decision/inference.ts`：

```typescript
// 根据 agent 特质选择模型
const selectModelForAgent = (expression: ExpressionResult): string => {
  // 高分析力的 Agent 使用更好的模型
  if (expression.inferenceQuality > 0.8) {
    return 'kimi/kimi-k2-5';
  }
  // 普通 Agent 使用便宜的模型
  return 'qwen/qwen-2.5-7b-instruct';
};
```

---

## 验证配置

启动后查看控制台输出：

```
🧬 Axobase MVP Starting...
📊 Initial agents: 5
🤖 LLM: kimi/kimi-k2-5    ← 确认这里显示正确
💰 Cost per inference: ~$0.0008
```

或在浏览器打开：
```
http://localhost:3001/api/costs
```

查看返回的 JSON 中的 `llmPricing` 部分。

---

## 故障排除

### 问题 1: 模型返回错误
**错误**: `Model not found` 或 `Invalid model`

**解决**: 检查模型ID是否正确，建议使用上面列表中的ID。

### 问题 2: 成本突然变高
**原因**: 可能不小心切换到了 Claude 等昂贵模型

**解决**: 检查 `.env` 文件，确保使用预期的模型

### 问题 3: 中文输出乱码
**原因**: 某些模型对中文支持不好

**解决**: 使用 Kimi 或 Qwen（中文优化）

---

## 推荐配置

### 开发测试阶段
```bash
OPENROUTER_MODEL=qwen/qwen-2.5-7b-instruct
# 便宜，快速，适合调试
```

### 正式实验阶段
```bash
OPENROUTER_MODEL=kimi/kimi-k2-5
# 更好的决策质量，值得额外成本
```

### 高质量分析
```bash
OPENROUTER_MODEL=deepseek/deepseek-r1
# 最强推理能力，适合关键决策
```
