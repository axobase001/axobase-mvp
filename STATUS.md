# Axobase MVP - Development Status

## ✅ Completed

### Backend Core (23 tests passing)
- ✅ Genome Engine (63 genes, 8 chromosomes)
- ✅ Decision Engine (LLM integration)
- ✅ Lifecycle Management (birth/death/breeding)
- ✅ Population Management
- ✅ HTTP API Server

### Frontend Dashboard
- ✅ Real-time statistics display
- ✅ Agent list with status
- ✅ Gene expression visualization
- ✅ Event log
- ✅ Control panel (start/stop/reset)
- ✅ Auto-detect backend connection

### Quick Start Tools
- ✅ `START_REAL.bat` - One-click launch
- ✅ `LAUNCH.bat` - Interactive menu
- ✅ Docker Compose config

---

## 🚀 How to Start Real Simulation

### Option 1: Double-Click (Easiest)
```
1. Open folder: C:\Users\PC\axobase-mvp
2. Double-click: START_REAL.bat
3. Wait 10 seconds
4. Browser opens automatically
```

### Option 2: Docker
```bash
docker-compose up --build
```

### Option 3: Manual
```bash
# Terminal 1 - Backend
cd C:\Users\PC\axobase-mvp
npm run dev

# Terminal 2 - Frontend
cd C:\Users\PC\axobase-mvp\web
npm run dev

# Open http://localhost:3000
```

---

## 📊 What You'll See

### Dashboard Components
1. **Status Badge** - Shows "真实数据模式" or "演示模式"
2. **Statistics Panel** - Live population metrics
3. **Agent List** - Each agent's balance, age, strategy
4. **Gene Chart** - Gene expression distribution
5. **Event Log** - System events
6. **Controls** - Start/Stop/Reset buttons

### API Endpoints (Port 3001)
- `GET /api/stats` - Population statistics
- `GET /api/agents` - Agent list
- `POST /api/control` - Control simulation

---

## 💰 Cost Warning

**Real simulation consumes API credits:**
- Each agent decision: ~$0.01-0.02
- 5 agents × 6 ticks/hour: ~$0.60-1.20/hour
- 24 hours: ~$15-30

**To reduce costs:**
1. Reduce `INITIAL_AGENT_COUNT` in `.env`
2. Increase `TICK_INTERVAL_MS` (e.g., to 1 hour)
3. Use demo mode (frontend only, no API calls)

---

## 📁 Key Files

```
axobase-mvp/
├── START_REAL.bat      ← Launch real simulation ⭐
├── EASY_START.md       ← Detailed guide
├── src/
│   ├── index.ts        ← Backend entry
│   └── api.ts          ← HTTP API server
├── web/
│   ├── app/page.tsx    ← Dashboard
│   └── lib/api.ts      ← API client
└── docker-compose.yml  ← Docker config
```

---

## 🔗 Repository
https://github.com/axobase001/axobase-mvp

---
*Last updated: 2024*
*TypeScript strict mode | 23 tests | ~3000 lines*
