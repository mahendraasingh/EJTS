@echo off
echo ========================================================
echo   Compiling Smart Search Engine with MSVC (Visual Studio)
echo ========================================================

REM Find and initialize Visual Studio build tools environment
if exist "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat" (
    call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
) else if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" (
    call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
) else if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat" (
    call "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
)

REM Build Main Web Server Application
cl.exe /nologo /std:c++17 /EHsc /O2 /Fe:smart_search_server.exe src\main.cpp src\Document.cpp src\Trie.cpp src\DocumentManager.cpp src\HistoryManager.cpp src\SearchEngine.cpp src\HttpServer.cpp ws2_32.lib

REM Build Console Application
cl.exe /nologo /std:c++17 /EHsc /O2 /Fe:smart_search_console.exe src\main_console.cpp src\Document.cpp src\Trie.cpp src\DocumentManager.cpp src\HistoryManager.cpp src\SearchEngine.cpp src\HttpServer.cpp ws2_32.lib

REM Build Test Suite
cl.exe /nologo /std:c++17 /EHsc /O2 /Fe:tests\test_search.exe tests\test_search.cpp src\Document.cpp src\Trie.cpp src\DocumentManager.cpp src\HistoryManager.cpp src\SearchEngine.cpp src\HttpServer.cpp ws2_32.lib

REM Clean intermediate object files
del /q *.obj 2>nul
del /q tests\*.obj 2>nul

echo.
echo Build completed successfully!
echo Executables created:
echo   - smart_search_server.exe   (Web Server on http://localhost:8080)
echo   - smart_search_console.exe  (Interactive Terminal CLI)
echo   - tests\test_search.exe     (Automated 11-case Test Suite)
echo.
