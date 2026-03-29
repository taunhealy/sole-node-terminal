@echo off
cd /d "%~dp0"
echo Starting SoleSeek Fleet Commander UI...
python solenode_gui.py


if %errorlevel% neq 0 (
    echo.
    echo [!] GUI crashed or failed to start.
    echo Check the crash_log.txt in this folder.
    pause
)
