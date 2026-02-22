# 🚀 Axobase 真实环境启动指南

## 快速启动（推荐）

### 方法一：双击启动（Windows）

1. 打开文件夹 `C:\Users\PC\axobase-mvp`
2. **双击 `START_REAL.bat`**
3. 等待几秒钟，浏览器会自动打开 http://localhost:3000

### 方法二：命令行启动

```bash
# 1. 进入项目目录
cd C:\Users\PC\axobase-mvp

# 2. 安装依赖（首次需要）
npm install
cd web && npm install && cd ..

# 3. 启动后端
npm run dev

# 4. 在另一个命令行窗口启动前端
cd C:\Users\PC\axobase-mvp\web
npm run dev

# 5. 浏览器打开 http://localhost:3000
```

---

## 启动模式对比

| 模式 | 命令 | 说明 |
|------|------|------|
| **真实模拟** | `npm run dev` | 启动完整 Agent 模拟（会调用 LLM API） |
| **前端演示** | `cd web && npm run dev` | 仅显示模拟数据（不消耗 API） |
| **Docker** | `docker-compose up` | 容器化部署 |

---

## ⚙️ 配置说明

### 环境变量（.env 文件）

项目已预配置以下设置：

```bash
# === 链配置 ===
CHAIN=base-sepolia          # 使用 Base 测试网
BASE_RPC_URL=https://sepolia.base.org

# === Agent 配置 ===
INITIAL_AGENT_COUNT=5       # 初始 5 个 Agent
INITIAL_USDC_PER_AGENT=10   # 每个 Agent 10 USDC
TICK_INTERVAL_MS=600000     # 每 10 分钟一个 Tick

# === LLM 配置 ===
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=qwen/qwen-2.5-7b-instruct
```

### 如需真实链交互（可选）

添加以下到 `.env` 文件：

```bash
MASTER_WALLET_PRIVATE_KEY=0x你的私钥
```

⚠️ **警告**：使用测试网，不要放真实资金！

---

## 📊 真实模拟 vs 演示模式

### 真实模拟（后端启动）
- ✅ Agent 真实决策（调用 Qwen LLM）
- ✅ 基因进化逻辑
- ✅ 繁殖/死亡事件
- ✅ 余额变化计算
- ⚠️ 消耗 API 额度（约 $0.01-0.05/决策）

### 演示模式（仅前端）
- ✅ 界面展示
- ✅ 模拟数据动画
- ❌ 无真实 Agent 逻辑
- ❌ 不消耗 API

---

## 🐳 Docker 一键启动

```bash
# 确保已安装 Docker

# 启动所有服务
docker-compose up --build

# 后台运行
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

---

## 🔍 验证启动成功

### 后端启动标志
```
🧬 Axobase MVP Starting...
📊 Initial agents: 5
⏱️  Tick interval: 600s
🔗 Chain: base-sepolia
✅ Population initialized
🚀 Running... Press Ctrl+C to stop
```

### 前端启动标志
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### 浏览器显示
- 打开 http://localhost:3000
- 看到 "🧬 Axobase 数字生命观测台"
- 控制面板显示 "状态: 运行中"
- Agent 列表显示 5 个 Agent

---

## 🛑 停止服务

### 方法 1：关闭命令行窗口
直接关闭后端和前端的命令行窗口

### 方法 2：Ctrl + C
在命令行窗口按 `Ctrl + C`，然后按 `Y` 确认

### 方法 3：停止脚本
运行 `STOP.bat`（如果创建）

---

## 💰 API 费用估算

使用 Qwen 2.5 7B via OpenRouter：

| 操作 | 费用 |
|------|------|
| 单次决策 | ~$0.01-0.02 |
| 5 Agent × 10 Ticks | ~$0.50-1.00 |
| 运行 1 小时 | ~$0.30-0.60 |
| 运行 24 小时 | ~$7-15 |

**控制成本的方法**：
1. 减少 Agent 数量（修改 `.env`）
2. 延长 Tick 间隔（如改为 1 小时）
3. 使用演示模式（不消耗 API）

---

## 🆘 常见问题

### Q1: 启动报错 "Cannot find module"
**解决**：先运行 `npm install`

### Q2: 前端显示 "无法连接"
**解决**：确保后端已启动（端口默认无冲突）

### Q3: API Key 无效
**解决**：检查 `.env` 中的 `OPENROUTER_API_KEY`

### Q4: 如何重置模拟？
**解决**：删除 `snapshots/` 文件夹，重新启动

---

## 📁 相关文件

- `START_REAL.bat` - Windows 一键启动脚本
- `LAUNCH.bat` - 交互式启动菜单
- `web/` - 前端代码
- `src/index.ts` - 后端入口
- `.env.example` - 环境变量模板
