@echo off
cd /d "%~dp0"
call npm install
if errorlevel 1 exit /b 1
call npm run test:dance-v1.38
if errorlevel 1 exit /b 1
call npm run deploy
if errorlevel 1 exit /b 1
echo Deployment completed. Refresh once to load the V1.38 mobile assets.
pause

