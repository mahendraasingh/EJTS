cmake_minimum_required(VERSION 3.12)
project(SmartSearchEngine VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(include)

# Core engine source files
set(ENGINE_SOURCES
    src/Document.cpp
    src/Trie.cpp
    src/DocumentManager.cpp
    src/HistoryManager.cpp
    src/SearchEngine.cpp
    src/HttpServer.cpp
)

# 1. Main Web API Server Executable
add_executable(smart_search_engine src/main.cpp ${ENGINE_SOURCES})
if(WIN32)
    target_link_libraries(smart_search_engine PRIVATE ws2_32)
endif()

# 2. Interactive Console Executable
add_executable(smart_search_console src/main_console.cpp ${ENGINE_SOURCES})
if(WIN32)
    target_link_libraries(smart_search_console PRIVATE ws2_32)
endif()

# 3. Automated Test Suite Executable
add_executable(test_search tests/test_search.cpp ${ENGINE_SOURCES})
if(WIN32)
    target_link_libraries(test_search PRIVATE ws2_32)
endif()
