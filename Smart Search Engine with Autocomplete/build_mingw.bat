@echo off
echo ========================================================
echo   Compiling Smart Search Engine with MinGW (g++)
echo ========================================================

REM Compile Web Server
g++ -std=c++17 -O2 -Iinclude -o smart_search_server.exe src/main.cpp src/Document.cpp src/Trie.cpp src/PhraseIndex.cpp src/DocumentManager.cpp src/HistoryManager.cpp src/SearchEngine.cpp src/HttpServer.cpp -lws2_32

REM Compile Console CLI
g++ -std=c++17 -O2 -Iinclude -o smart_search_console.exe src/main_console.cpp src/Document.cpp src/Trie.cpp src/PhraseIndex.cpp src/DocumentManager.cpp src/HistoryManager.cpp src/SearchEngine.cpp src/HttpServer.cpp -lws2_32

REM Compile Test Suite
g++ -std=c++17 -O2 -Iinclude -o tests/test_search.exe tests/test_search.cpp src/Document.cpp src/Trie.cpp src/PhraseIndex.cpp src/DocumentManager.cpp src/HistoryManager.cpp src/SearchEngine.cpp src/HttpServer.cpp -lws2_32

echo.
echo MinGW build completed successfully!
echo Executables created:
echo   - smart_search_server.exe
echo   - smart_search_console.exe
echo   - tests/test_search.exe
echo.
