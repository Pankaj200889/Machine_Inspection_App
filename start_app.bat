@echo off
echo Starting Machine Checklist Application...
echo.
cd /d "%~dp0"
cd server
echo Starting Server...
echo Access the app at: http://localhost:3000
echo.
echo Opening browser in 3 seconds...
timeout /t 3
start http://localhost:3000
call npm.cmd start
pause
