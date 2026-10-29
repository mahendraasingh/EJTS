@echo off
echo ========================================================
echo   Starting Smart Search Engine
echo ========================================================

if not exist "smart_search_server.exe" (
    echo Building project binaries first...
    call build_msvc.bat
)

if exist "smart_search_server.exe" (
    echo Launching Web Server...
    start http://localhost:8080/
    smart_search_server.exe
) else (
    echo [Error] Failed to build or find smart_search_server.exe.
    pause
)
