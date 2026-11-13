@echo off
echo ========================================================================
echo  Starting Online Quiz Platform with Real-Time Leaderboard
echo ========================================================================

echo.
echo [1/2] Launching Node.js Backend on http://localhost:5000 ...
start "Quiz Platform Backend" cmd /k "cd /d "%~dp0server" && npm run dev"

echo [2/2] Launching React Vite Frontend on http://localhost:5173 ...
start "Quiz Platform Frontend" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo ========================================================================
echo  🏆 QuizArena Platform is running on localhost!
echo.
echo  - Frontend Web UI:  http://localhost:5173
echo  - Backend REST API: http://localhost:5000
echo  - Socket.IO Server: ws://localhost:5000
echo  - Health Check:     http://localhost:5000/api/health
echo.
echo  Demo Credentials:
echo    - Administrator:  admin@quiz.com / password123
echo    - Student 1:      rahul@student.com / password123
echo    - Student 2:      priya@student.com / password123
echo ========================================================================
pause

