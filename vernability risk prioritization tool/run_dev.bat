@echo off
echo ========================================================
echo  Starting Vulnerability Risk Prioritization Tool (VRPT)
echo ========================================================

echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "VRPT Backend" cmd /k "cd /d "%~dp0backend" && python seed_data.py && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching React Vite Frontend on http://localhost:5173 ...
start "VRPT Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo  VRPT is running!
echo  - Frontend: http://localhost:5173
echo  - Backend API: http://127.0.0.1:8000
echo  - Interactive Swagger Docs: http://127.0.0.1:8000/docs
echo.
echo  Demo Credentials:
echo    - Admin:            admin / admin123
echo    - Security Analyst: analyst / analyst123
echo    - Viewer:           viewer / viewer123
echo ========================================================
pause
