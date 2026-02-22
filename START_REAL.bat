@echo off
chcp 65001 >nul
title Axobase 真实模拟启动器
echo.
echo ==========================================
echo      🧬 Axobase 真实环境启动器
echo ==========================================
echo.

:: 检查 Node.js
echo [1/5] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装！请先安装 Node.js 20+
    pause
    exit /b 1
)
echo ✅ Node.js 已安装

:: 安装后端依赖
echo.
echo [2/5] 检查后端依赖...
if not exist "node_modules" (
    echo 📦 安装后端依赖...（首次需要几分钟）
    npm install
    if errorlevel 1 (
        echo ❌ 后端依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo ✅ 后端依赖已安装
)

:: 安装前端依赖
echo.
echo [3/5] 检查前端依赖...
if not exist "web\node_modules" (
    echo 📦 安装前端依赖...（首次需要几分钟）
    cd web
    npm install
    if errorlevel 1 (
        echo ❌ 前端依赖安装失败
        pause
        exit /b 1
    )
    cd ..
) else (
    echo ✅ 前端依赖已安装
)

:: 创建必要目录
echo.
echo [4/5] 创建数据目录...
if not exist "logs" mkdir logs
if not exist "snapshots" mkdir snapshots
echo ✅ 目录就绪

:: 启动服务
echo.
echo [5/5] 启动服务...
echo.
echo 🚀 正在启动后端（Agent 模拟引擎）...
echo    窗口标题: Axobase-Backend
echo.
start "Axobase-Backend" cmd /k "cd /d %~dp0 && npm run dev"

echo 🚀 正在启动前端（观测台）...
echo    窗口标题: Axobase-Frontend
echo    访问地址: http://localhost:3000
echo.
start "Axobase-Frontend" cmd /k "cd /d %~dp0\web && npm run dev"

echo ⏳ 等待服务启动...
timeout /t 8 /nobreak >nul

echo.
echo ==========================================
echo      ✅ 启动完成！
echo ==========================================
echo.
echo 🌐 正在打开浏览器...
start http://localhost:3000

echo.
echo 📋 服务状态:
echo    • 后端: http://localhost:3001 (或下一个可用端口)
echo    • 前端: http://localhost:3000
echo.
echo 🎮 操作说明:
echo    • 查看控制台窗口了解运行状态
echo    • 关闭命令行窗口即可停止服务
echo    • 数据保存在 logs/ 和 snapshots/ 文件夹
echo.
echo 💡 提示:
echo    • 首次启动可能需要 10-20 秒初始化
echo    • 每 10 分钟 Agent 会执行一次决策
echo    • 按 Ctrl+C 可以停止单个服务
echo.
pause
