@echo off
chcp 65001 >nul
title Axobase 手动启动（调试用）
echo.
echo ==========================================
echo      🧬 Axobase 手动启动模式
echo ==========================================
echo.
echo 此模式会分别启动前后端，方便查看错误信息
echo.

:: 检查依赖
echo [检查] 检查依赖...
if not exist "node_modules" (
    echo [!] 后端依赖未安装，正在安装...
    npm install
)
if not exist "web\node_modules" (
    echo [!] 前端依赖未安装，正在安装...
    cd web
    npm install
    cd ..
)

:: 创建数据目录
if not exist "logs" mkdir logs
if not exist "snapshots" mkdir snapshots

echo.
echo ==========================================
echo  即将启动 3 个窗口：
echo    1. 后端服务（先启动这个，等待就绪）
echo    2. 前端服务（后端就绪后再启动）
echo    3. 浏览器
echo ==========================================
echo.
pause

:: 启动后端
echo.
echo [启动] 正在启动后端服务...
echo        窗口标题: Axobase-Backend
echo        等待显示 "API Server running" 后再启动前端
echo.
start "Axobase-Backend" cmd /k "cd /d %~dp0 && echo 正在启动后端... && npm run dev"

echo ⏳ 请等待后端启动（约 10-20 秒）...
timeout /t 10 /nobreak >nul

:: 检查后端是否启动
echo [检查] 测试后端连接...
curl -s http://localhost:3001/ >nul 2>&1
if errorlevel 1 (
    echo [!] 后端可能还没启动完成
    echo     请检查 "Axobase-Backend" 窗口的错误信息
    echo     确认正常后再继续
    echo.
    pause
) else (
    echo [OK] 后端连接正常
)

:: 启动前端
echo.
echo [启动] 正在启动前端服务...
echo        窗口标题: Axobase-Frontend
echo.
start "Axobase-Frontend" cmd /k "cd /d %~dp0\web && echo 正在启动前端... && npm run dev"

echo ⏳ 等待前端启动...
timeout /t 5 /nobreak >nul

:: 打开浏览器
echo.
echo [启动] 正在打开浏览器...
start http://localhost:3000

echo.
echo ==========================================
echo      ✅ 启动完成！
echo ==========================================
echo.
echo 📋 当前运行的服务：
echo    • 后端 API: http://localhost:3001
echo    • 前端界面: http://localhost:3000
echo.
echo 🎮 操作说明：
echo    • 查看 "Axobase-Backend" 窗口了解后端状态
echo    • 查看 "Axobase-Frontend" 窗口了解前端状态
echo    • 在浏览器中刷新页面如果显示演示模式
echo    • 关闭命令行窗口即可停止服务
echo.
echo 🔍 排查：如果显示演示模式
echo    1. 查看 Backend 窗口是否有错误
echo    2. 浏览器访问 http://localhost:3001/ 测试
echo    3. 刷新浏览器页面
echo.
pause
