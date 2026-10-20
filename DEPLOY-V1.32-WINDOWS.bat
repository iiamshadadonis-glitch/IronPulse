@echo off
setlocal
cd /d "%~dp0"

echo DropBeat Dance Studio V1.32
echo 1/4 Installing dependencies...
call npm install || goto :failed
echo 2/4 Running the complete verification suite...
call npm run test:dance-v1.32 || goto :failed
echo 3/4 Applying the existing additive D1 migrations...
call npm run d1:migrate:remote || goto :failed
echo 4/4 Deploying the verified replacement...
call npm run deploy || goto :failed
echo Deployment completed. Open the public site and Admin in a private window and read START-HERE-V1.32.md.
pause
exit /b 0

:failed
echo Deployment stopped safely because the preceding step did not complete.
echo No database deletion or reset was attempted.
pause
exit /b 1
