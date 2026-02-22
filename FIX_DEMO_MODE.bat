@echo off
chcp 65001 >nul
title Axobase 诊断工具
echo.
echo ==========================================
echo      🔧 诊断：为什么显示演示模式？
echo ==========================================
echo.

:: 检查是否有 Node 进程在运行
echo [1/5] 检查是否有服务在运行...
tasklist | findstr "node.exe" >nul
if errorlevel 1 (
    echo ❌ 没有发现 Node.js 进程在运行
    echo    原因：后端没有启动
    echo    解决：请先运行 START_REAL.bat
    pause
    exit /b 1
) else (
    echo ✅ 发现 Node.js 进程
)

echo.
echo [2/5] 检查端口占用...
netstat -ano | findstr ":3001" >nul
if errorlevel 1 (
    echo ❌ 端口 3001 未被占用（后端 API 端口）
    echo    原因：后端 API 服务器未启动
) else (
    echo ✅ 端口 3001 已被占用
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001"') do (
        echo    进程 PID: %%a
    )
)

echo.
echo [3/5] 测试后端连接...
curl -s http://localhost:3001/ >nul 2>&1
if errorlevel 1 (
    echo ❌ 无法连接到 http://localhost:3001
    echo    原因：后端可能没有正确启动
    echo.
    echo    尝试启动后端...
    cd /d %~dp0
    start "Axobase-Backend-FIX" cmd /k "npm run dev"
    echo    ✅ 已尝试启动后端
    echo    请等待 10 秒后刷新浏览器
) else (
    echo ✅ 后端连接正常
    curl -s http://localhost:3001/
)

echo.
echo [4/5] 检查前端配置...
if exist "web\.env.local" (
    echo ✅ 前端环境文件存在
    type web\.env.local
) else (
    echo ⚠️ 前端环境文件不存在，创建中...
    echo NEXT_PUBLIC_API_URL=http://localhost:3001 > web\.env.local
    echo ✅ 已创建 web/.env.local
)

echo.
echo [5/5] 检查 CORS 配置...
echo    后端 CORS 应该允许前端访问
echo    如果看到 "演示模式"，可能是跨域问题

echo.
echo ==========================================
echo      🔧 修复建议
@echo off
chcp 65001 >nul
echo ==========================================
echo.
echo 如果仍然显示演示模式，请尝试以下步骤：
echo.
echo 步骤 1：完全关闭所有窗口
echo   - 关闭所有命令行窗口
echo   - 关闭浏览器
echo.
echo 步骤 2：重新启动
echo   1. 双击 START_REAL.bat
echo   2. 等待显示 "API Server running"
echo   3. 再等待 5 秒
echo   4. 刷新浏览器
echo.
echo 步骤 3：手动检查
echo   1. 浏览器访问 http://localhost:3001/
echo   2. 如果显示 JSON 数据，说明后端正常
echo   3. 问题可能在前端，刷新页面
echo.
echo 步骤 4：修改端口号（如果 3001 被占用）
echo   编辑 src/api.ts，将端口 3001 改为其他端口
echo   编辑 web/.env.local，设置相同的端口
echo.
pause
