Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Smart Search Engine in PowerShell" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$serverPath = Join-Path $PSScriptRoot "smart_search_server.exe"

if (-not (Test-Path $serverPath)) {
    Write-Host "Building project binaries first using build_msvc.bat..." -ForegroundColor Yellow
    cmd.exe /c "build_msvc.bat"
}

if (Test-Path $serverPath) {
    Write-Host "Launching web browser to http://localhost:8080/..." -ForegroundColor Green
    Start-Process "http://localhost:8080/"
    Write-Host "Starting C++ Web Server on http://localhost:8080 (Press Ctrl+C to stop)..." -ForegroundColor Green
    & $serverPath
} else {
    Write-Host "[Error] Failed to build or find smart_search_server.exe" -ForegroundColor Red
}
