@echo off
title Smart Billboard AI Analytics
echo =====================================================================
echo               SMART BILLBOARD AI ANALYTICS ENGINE
echo =====================================================================
echo.

cd /d "%~dp0"

IF NOT EXIST ".venv" (
    echo [INFO] Creating Python 3.11 virtual environment in .venv...
    py -3.11 -m venv .venv
    IF ERRORLEVEL 1 (
        echo [ERROR] Failed to create virtual environment with py -3.11. Trying python...
        python -m venv .venv
    )
)

echo [INFO] Activating virtual environment...
call .venv\Scripts\activate.bat

echo [INFO] Verifying core dependencies...
python -m pip install -r requirements.txt --quiet

echo [INFO] Initializing SQLite database schema and default settings...
python scripts\initialize_db.py

echo.
echo =====================================================================
echo   SMART BILLBOARD AI SERVER READY
echo   Dashboard URL: http://127.0.0.1:5000
echo   Billboard Kiosk URL: http://127.0.0.1:5000/billboard
echo   Press Ctrl+C to stop the server at any time.
echo =====================================================================
echo.

python app.py

pause
