@echo off
setlocal

for %%I in ("%~dp0.") do set "LIVE_DESKTOP_ROOT=%%~fI"
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%LIVE_DESKTOP_ROOT%\scripts\project-lifecycle.ps1" -Action restart -WorkspaceRoot "%LIVE_DESKTOP_ROOT%"

if errorlevel 1 (
    echo Live Desktop could not start. Check the error above and the project log files.
    exit /b 1
)

echo Live Desktop is starting in the background.
echo Dashboard: http://localhost:4173
exit /b 0
