Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Vulnerability Risk Prioritization Tool (VRPT) " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

Write-Host "`n[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\backend'; python seed_data.py; uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "[2/2] Starting React Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\frontend'; npm run dev"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " VRPT Development Environment Active!" -ForegroundColor Green
Write-Host " Frontend: http://localhost:5173" -ForegroundColor White
Write-Host " Backend API: http://127.0.0.1:8000" -ForegroundColor White
Write-Host " Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "`n Demo Credentials:" -ForegroundColor Cyan
Write-Host "   Admin:            admin / admin123" -ForegroundColor White
Write-Host "   Security Analyst: analyst / analyst123" -ForegroundColor White
Write-Host "   Viewer:           viewer / viewer123" -ForegroundColor White
Write-Host "========================================================`n" -ForegroundColor Cyan
