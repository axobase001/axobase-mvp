@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo      🧬 Axobase MVP 启动器
echo ==========================================
echo.

:MENU
echo 请选择操作:
echo.
echo  [1] 启动后端 (Node.js)
echo  [2] 启动前端 (Next.js)
echo  [3] 启动前后端 (同时)
echo  [4] 运行测试
echo  [5] 退出
echo.
set /p choice="输入数字 (1-5): "

if "%choice%"=="1" goto START_BACKEND
if "%choice%"=="2" goto START_FRONTEND
if "%choice%"=="3" goto START_BOTH
if "%choice%"=="4" goto RUN_TESTS
if "%choice%"=="5" goto EXIT
goto MENU

:START_BACKEND
echo.
echo 正在启动后端...
start "Axobase Backend" cmd /k "cd /d %~dp0 && npm run dev"
goto MENU

:START_FRONTEND
echo.
echo 正在启动前端...
start "Axobase Web" cmd /k "cd /d %~dp0\web && npm run dev"
echo.
echo 等待启动完成...
timeout /t 5 >nul
start http://localhost:3000
goto MENU

:START_BOTH
echo.
echo 正在启动后端...
start "Axobase Backend" cmd /k "cd /d %~dp0 && npm run dev"
echo.
echo 等待后端启动...
timeout /t 3 >nul
echo 正在启动前端...
start "Axobase Web" cmd /k "cd /d %~dp0\web && npm run dev"
echo.
echo 等待前端启动...
timeout /t 5 >nul
start http://localhost:3000
goto MENU

:RUN_TESTS
echo.
echo 正在运行测试...
cd /d %~dp0
npm test
goto MENU

:EXIT
echo.
echo 再见!
timeout /t 2 >nul
exit
