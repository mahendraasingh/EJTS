# Smart Search Engine with Autocomplete Using C++

A high-performance, mini search engine developed in **C++17** demonstrating the real-world application of **Data Structures and Algorithms (DSA)**, **Object-Oriented Programming (OOP)**, and **Information Retrieval**.

Includes a pure C++ backend with real-time **Trie prefix autocomplete**, **Inverted Indexing**, **Multi-Factor Relevance Ranking**, **Search History & Popularity Tracking**, and a modern, responsive **Web Interface** (HTML5, CSS3, JavaScript) connected via a lightweight, zero-dependency Windows Socket (WinSock2) HTTP API.

---

## 🌟 Key Features

1. **Prefix Autocomplete via Trie**:
   - Sub-millisecond prefix suggestion matching in $O(L)$ time, where $L$ is query length.
   - Frequency-weighted Depth-First Search (DFS) returns the top 5–10 most relevant completions.
   - Dynamic learning: typing and searching phrases increments their weight in the Trie.

2. **Inverted Index Information Retrieval**:
   - Maps tokenized terms directly to matching document IDs using `std::unordered_map<std::string, std::vector<int>>`.
   - Provides instant $O(1)$ average candidate document retrieval.

3. **Multi-Factor Relevance Ranking**:
   - Scores documents based on:
     - Exact Title Match: **+50 pts**
     - Full Query Substring Match in Title: **+35 pts**
     - Query Word in Title: **+20 pts / occurrence**
     - Keyword Tag Match: **+15 pts / keyword**
     - Description Word Match: **+5 pts / occurrence**
     - Base Document Popularity: **+0.2 × popularity**
   - Retains top-ranked results efficiently using a Min-Heap (`std::priority_queue`).

4. **Search Term Highlighting**:
   - Automatically wraps matched query terms with `<mark>` tags for intuitive visual confirmation.

5. **Session History & Popular Searches**:
   - Tracks recent searches in memory and persists them to local disk (`data/history.txt`).
   - Counts query frequencies to dynamically show the **Top 5 Popular Searches**.
   - Provides a one-click **Clear History** feature.

6. **Dual Execution Modes**:
   - **Web Application Mode**: Native zero-dependency C++ HTTP REST server serving both the JSON API and the frontend at `http://localhost:8080`.
   - **Interactive Console Mode**: Standalone CLI menu for instant terminal demonstration or quick professor viva examination.

---

## 📂 Project Structure

```text
Smart Search Engine with Autocomplete/
├── CMakeLists.txt              # Cross-platform CMake configuration
├── build_msvc.bat              # 1-click build script for Microsoft Visual C++ (MSVC)
├── build_mingw.bat             # 1-click build script for MinGW (g++)
├── run.bat                     # Auto-build & launch web app in default browser
├── README.md                   # Complete project documentation & guide
├── REPORT.md                   # Full academic college project report
├── VIVA_QUESTIONS.md           # 25+ viva questions, answers & presentation script
├── data/
│   ├── documents.json          # 25 curated Computer Science documents
│   └── history.txt             # Persistent search history and popularity counters
├── include/
│   ├── Document.h              # Document entity declaration & JSON serialization
│   ├── Trie.h                  # TrieNode and Trie prefix matching declarations
│   ├── DocumentManager.h       # JSON file loader and document store
│   ├── HistoryManager.h        # Search history & frequency tracking
│   ├── SearchEngine.h          # Inverted index, scoring, ranking & highlighting
│   └── HttpServer.h            # Zero-dependency WinSock2 HTTP server
├── src/
│   ├── main.cpp                # Unified entry point (Web Server & --console mode)
│   ├── main_console.cpp        # Standalone interactive terminal application
│   ├── Document.cpp            # Document methods implementation
│   ├── Trie.cpp                # Trie insertion, search, and frequency DFS
│   ├── DocumentManager.cpp     # Pure STL JSON parser and document storage
│   ├── HistoryManager.cpp      # File persistence & popularity rankings
│   ├── SearchEngine.cpp        # Inverted index posting & priority queue ranking
│   └── HttpServer.cpp          # WinSock2 HTTP socket server & REST routing
├── frontend/
│   ├── index.html              # Modern, accessible, glassmorphic UI
│   ├── style.css               # Obsidian theme, CSS variables & animations
│   └── script.js               # Debounced API fetch, keyboard navigation & rendering
└── tests/
    └── test_search.cpp         # Automated 11-case unit test suite
```

---

## 🛠️ Prerequisites & Compilation

### Option A: Using MSVC (Visual Studio / Build Tools) — Recommended
If you have Visual Studio or Visual Studio Build Tools installed on Windows:
```cmd
cd "Smart Search Engine with Autocomplete"
build_msvc.bat
```

### Option B: Using MinGW GCC (`g++`)
If you have MinGW installed on your PATH:
```cmd
cd "Smart Search Engine with Autocomplete"
build_mingw.bat
```

### Option C: Using CMake
```cmd
cd "Smart Search Engine with Autocomplete"
mkdir build && cd build
cmake ..
cmake --build . --config Release
```

---

## 🚀 Running the Project

### 1. Launch the Web Interface (Default)
Simply run:
```cmd
run.bat
```
or run the compiled server directly:
```cmd
smart_search_server.exe
```
Then open your web browser at:
> **http://localhost:8080/**

### 2. Launch in Console / Terminal Mode
For a direct terminal experience (ideal during viva or without a browser):
```cmd
smart_search_console.exe
```
or:
```cmd
smart_search_server.exe --console
```

### 3. Run the Automated Test Suite
To verify all 11 test cases:
```cmd
tests\test_search.exe
```

---

## 🌐 REST API Endpoints

The C++ backend natively handles HTTP requests on port `8080`:

| Method | Endpoint | Query Param | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/suggest` | `?q=pro` | Returns top Trie autocomplete suggestions |
| `GET` | `/api/search` | `?q=programming` | Returns scored and highlighted search results |
| `GET` | `/api/popular` | — | Returns top 5 popular queries with counts |
| `GET` | `/api/history` | — | Returns recent search queries |
| `DELETE` | `/api/history` | — | Clears all search history and popularity counts |

---

## 📊 Automated Test Suite Results

The automated test suite (`tests/test_search.cpp`) verifies:
- [x] Dataset loading & verification ($\ge 20$ documents)
- [x] Prefix autocomplete via Trie
- [x] Case-insensitive prefix suggestions
- [x] Empty prefix safety handling
- [x] Exact word search
- [x] Case-insensitive query evaluation
- [x] Empty query string safety
- [x] Zero-match graceful fallback
- [x] Multi-word relevance scoring & ranking order
- [x] Popular query count incrementation
- [x] Search history persistence & clearing
