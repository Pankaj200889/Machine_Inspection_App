@echo off
echo Starting Machine Checklist App (Development Mode)...
cd /d "%~dp0"

echo Starting Backend Server...
start "Server (Port 3000)" cmd /k "cd server && npm start"

echo Starting Frontend Client...
start "Client (Port 5173)" cmd /k "cd client && npm run dev"

echo.
echo Processes started.
echo The "Client" window will show your Network URL (e.g., https://192.168.1.2:5173).
echo.
echo Closing this launcher window in 5 seconds...
timeout /t 5
exit
