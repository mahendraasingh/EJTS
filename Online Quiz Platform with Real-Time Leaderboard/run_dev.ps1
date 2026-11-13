Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host " Starting Online Quiz Platform with Real-Time Leaderboard " -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

Write-Host "`n[1/2] Starting Node.js Backend on http://localhost:5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\server'; npm run dev"

Write-Host "[2/2] Starting React Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\client'; npm run dev"

Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host " 🏆 QuizArena Platform is active on localhost!" -ForegroundColor Green
Write-Host " Frontend Web UI:  http://localhost:5173" -ForegroundColor White
Write-Host " Backend REST API: http://localhost:5000" -ForegroundColor White
Write-Host " Socket.IO Server: ws://localhost:5000" -ForegroundColor White
Write-Host " Health Check:     http://localhost:5000/api/health" -ForegroundColor White
Write-Host "`n Demo Credentials:" -ForegroundColor Cyan
Write-Host "   Administrator:  admin@quiz.com / password123" -ForegroundColor White
Write-Host "   Student 1:      rahul@student.com / password123" -ForegroundColor White
Write-Host "   Student 2:      priya@student.com / password123" -ForegroundColor White
Write-Host "========================================================================`n" -ForegroundColor Cyan

