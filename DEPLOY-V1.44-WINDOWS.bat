@echo off
cd /d "%~dp0"
call npm install
if errorlevel 1 exit /b 1
call npm run test:dance-v1.44
if errorlevel 1 exit /b 1
call npm run deploy
if errorlevel 1 exit /b 1
echo Deployment completed. Reload the dashboard once to load V1.44.
pause
