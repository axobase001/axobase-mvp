@echo off
chcp 65001 >nul
title 修复环境变量
echo.
echo ==========================================
echo      🔧 修复：OPENROUTER_API_KEY 错误
echo ==========================================
echo.

cd /d %~dp0

if not exist ".env" (
    echo [!] 未找到 .env 文件，正在创建...
    (
        echo # === Chain Configuration ===
        echo CHAIN=base-sepolia
        echo BASE_RPC_URL=https://sepolia.base.org
        echo MASTER_WALLET_PRIVATE_KEY=
        echo.
        echo # === Agent Configuration ===
        echo INITIAL_AGENT_COUNT=5
        echo INITIAL_USDC_PER_AGENT=10
        echo TICK_INTERVAL_MS=600000
        echo.
        echo # === Inference ===
        echo OPENROUTER_API_KEY=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
        echo OPENROUTER_MODEL=qwen/qwen-2.5-7b-instruct
        echo.
        echo # === Arweave (optional) ===
        echo ENABLE_ARWEAVE=false
        echo IRYS_PRIVATE_KEY=
        echo.
        echo # === Logging ===
        echo LOG_LEVEL=info
        echo SNAPSHOT_INTERVAL_MS=3600000
    ) > .env
    echo [✓] .env 文件已创建
) else (
    echo [✓] .env 文件已存在
    
    echo [检查] 检查 API Key...
    findstr "OPENROUTER_API_KEY" .env >nul
    if errorlevel 1 (
        echo [!] API Key 未设置，正在添加...
        echo OPENROUTER_API_KEY=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 >> .env
        echo [✓] API Key 已添加
    ) else (
        echo [✓] API Key 已设置
    )
)

echo.
echo ==========================================
echo      ✅ 环境变量修复完成！
echo ==========================================
echo.
echo 现在请重新运行 START_REAL.bat
echo.
pause
