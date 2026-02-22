# 🔧 演示模式问题排查指南

## 问题现象
点击"启动真实模拟"后，页面右上角仍然显示黄色标签：**演示模式**

## 原因
前端无法连接到后端 API，自动回退到模拟数据。

---

## 快速诊断

双击运行 `FIX_DEMO_MODE.bat` 进行自动诊断。

---

## 手动排查步骤

### 步骤 1：检查后端是否真的启动了

1. 按 `Win + R`，输入 `cmd`，回车
2. 输入以下命令：
```bash
curl http://localhost:3001/
```

**正常情况：**
```json
{"status":"ok","service":"Axobase API","isRunning":true}
```

**如果显示错误：**
- 后端没有启动，请重新运行 `START_REAL.bat`

---

### 步骤 2：检查端口占用

```bash
netstat -ano | findstr ":3001"
```

如果没有输出，说明后端没有启动或端口被占用。

---

### 步骤 3：查看后端日志

1. 找到标题为 "Axobase-Backend" 的命令行窗口
2. 检查是否有错误信息

**正常启动日志：**
```
🚀 Initializing population...
✅ 5 agents created

🌐 API Server running on http://localhost:3001
   Endpoints:
   • GET  /           - Health check
   • GET  /api/stats  - Population statistics
   • GET  /api/agents - Agent list
   • POST /api/control - Control simulation

▶️  Simulation started
💡 Press Ctrl+C to stop
```

**如果有错误，请截图保存。**

---

## 常见问题和解决

### 问题 1：端口 3000 被占用

**现象：**
前端启动失败或显示错误

**解决：**
端口会自动切换到 3001、3002 等，浏览器会自动适应。

---

### 问题 2：端口 3001 被占用

**现象：**
后端无法启动，显示 "EADDRINUSE"

**解决：**
1. 打开 `src/api.ts`
2. 找到 `const port = 3001`
3. 改为 `const port = 3002`
4. 打开 `web/.env.local`，添加：
```
NEXT_PUBLIC_API_URL=http://localhost:3002
```

---

### 问题 3：防火墙阻止

**现象：**
浏览器无法访问 localhost

**解决：**
1. Windows 设置 → 更新与安全 → Windows 安全中心
2. 防火墙和网络保护 → 允许应用通过防火墙
3. 允许 Node.js 通过防火墙

---

### 问题 4：依赖未安装

**现象：**
命令行显示 "Cannot find module"

**解决：**
```bash
# 后端依赖
cd C:\Users\PC\axobase-mvp
npm install

# 前端依赖
cd web
npm install
```

---

## 手动启动（调试模式）

如果自动启动失败，可以手动启动查看详细错误：

### 窗口 1：启动后端
```bash
cd C:\Users\PC\axobase-mvp
npm run dev
```

等待显示 "API Server running" 后，在另一个窗口：

### 窗口 2：启动前端
```bash
cd C:\Users\PC\axobase-mvp\web
npm run dev
```

### 浏览器访问
```
http://localhost:3000
```

---

## 验证修复

1. 确保能看到 "Axobase-Backend" 窗口
2. 浏览器访问 http://localhost:3001/ 能看到 JSON
3. 刷新 http://localhost:3000
4. 右上角显示绿色 **真实数据模式**

---

## 仍然无法解决？

请提供以下信息：
1. 后端命令行窗口的完整输出（截图或复制）
2. 浏览器按 F12 → Console → 截图错误信息
3. 运行 `FIX_DEMO_MODE.bat` 的输出
