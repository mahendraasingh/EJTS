# Smart Search Engine with Context-Aware Autocomplete Using C++

A high-performance, Google-inspired search engine developed in **C++17** demonstrating the real-world application of **Data Structures and Algorithms (DSA)**, **Information Retrieval (IR)**, and **Full-Stack Systems Programming**.

Unlike basic prefix search engines that match only single words, this upgraded engine understands the **complete user query and word sequence**, providing **context-aware multi-word suggestions** that become progressively more specific as more words are entered, backed by full-query relevance ranking, proximity scoring, and term coverage analysis.

---

## 🌟 Key Features

1. **Context-Aware Multi-Word Autocomplete (`PhraseIndex`)**:
   - Understands word order, multi-word phrases, and context.
   - Suggestions become progressively more specific as more words are typed:
     - `machine` &rarr; `machine learning`, `machine learning algorithms`, `machine learning projects`
     - `machine learning` &rarr; `machine learning algorithms for beginners`, `machine learning projects using C++`
     - `machine learning using C++` &rarr; `machine learning projects using C++`, `machine learning classification using C++`
   - Combines 5 intelligent suggestion channels:
     - **Channel 1**: Exact phrase progression lookup ($O(1)$ hash map).
     - **Channel 2**: Phrase prefix continuation ($O(N)$ with log frequency scaling).
     - **Channel 3**: Word-boundary prefix matching.
     - **Channel 4**: Multi-word context-word token conditioning.
     - **Channel 5**: Overlap fallback when a complete phrase is not yet in the index.
   - Zero duplicate suggestions; case-insensitive; debounced at 150ms.

2. **Full-Query Multi-Factor Search Ranking**:
   - Evaluates the entire query rather than filtering by a single word:
     - **Exact Title Match**: **+140.0 pts**
     - **Exact Phrase in Title**: **+85.0 pts**
     - **Exact Phrase in Description**: **+45.0 pts**
     - **Title Term Frequency**: **+25.0 pts / match**
     - **Keyword Tag Match**: **+18.0 pts / match**
     - **Description Term Frequency**: **+6.0 pts / match**
     - **Query Term Coverage Ratio**: up to **+70.0 pts** ($\text{coverage} \times 70$)
     - **Phrase Proximity Bonus**: **+25.0 pts** when query words appear within 4 tokens of each other
     - **Document Popularity Weight**: **+0.15 &times; popularity**
   - Employs a Min-Heap (`std::priority_queue`) to extract top-$K$ results in $O(M \log K)$ time.

3. **Google-Inspired Search Engine Interface**:
   - Centered search homepage with developer terminal aesthetics.
   - Dynamic autocomplete dropdown with structured type badges (`[Phrase]`, `[Context]`, `[Trie]`, `[History]`).
   - Query refinement button (`↖`) to populate the search bar without auto-executing.
   - Keyboard navigation via **Up Arrow**, **Down Arrow**, **Enter**, and **Escape**.
   - Result cards with Google-like breadcrumb URLs (`en.cppreference.com › w › cpp`), category tags, highlighted matching snippet terms, and relevance score bars.
   - Dark & Light mode toggle with persistent local storage.

4. **Expanded 35+ Document Dataset**:
   - Covers C++ programming, Machine Learning, Data Structures, Algorithms, Systems Architecture, and Operating Systems.
   - Every document includes `id`, `title`, `description`, `keywords`, `category`, `url`, and `popularity`.

5. **20-Case Automated Test Suite**:
   - Proves suggestions and search rankings become increasingly specific as queries grow across 8 progressive test queries.

---

## 📐 Scoring Formula & 3 Worked Examples

The relevance score $S(D, Q)$ for document $D$ against query $Q$ with tokens $\{t_1, t_2, \dots, t_k\}$ is calculated as:

$$S(D, Q) = S_{\text{exact\_title}} + S_{\text{phrase\_title}} + S_{\text{phrase\_desc}} + \sum_{t \in Q} (25 f_{t, \text{title}} + 18 I_{t \in \text{keywords}} + 6 f_{t, \text{desc}}) + 70 \cdot \frac{|T_{\text{matched}}|}{|Q|} + S_{\text{proximity}} + 0.15 P_D$$

### Worked Example 1: Query `C++`
- **Target Document**: Doc 1 ("C++ Programming Fundamentals", Popularity 95)
- Title contains "C++": $+25 \text{ pts}$
- Keywords contain "C++": $+18 \text{ pts}$
- Description contains "C++" (2 occurrences): $2 \times 6 = +12 \text{ pts}$
- Coverage Ratio: $1 / 1 = 1.0 \times 70 = +70 \text{ pts}$
- Popularity: $0.15 \times 95 = +14.25 \text{ pts}$
- **Total Score**: $25 + 18 + 12 + 70 + 14.25 = \mathbf{139.25 \text{ pts}}$

### Worked Example 2: Query `C++ data structures`
- **Target Document**: Doc 2 ("C++ Data Structures and Algorithms", Popularity 96)
- Exact phrase "C++ Data Structures" in title: $+85 \text{ pts}$
- Title terms "C++", "data", "structures": $3 \times 25 = +75 \text{ pts}$
- Keyword matches: $2 \times 18 = +36 \text{ pts}$
- Description term matches: $4 \times 6 = +24 \text{ pts}$
- Proximity bonus (words adjacent in title): $+25 \text{ pts}$
- Term coverage ratio: $3 / 3 = 1.0 \times 70 = +70 \text{ pts}$
- Popularity: $0.15 \times 96 = +14.4 \text{ pts}$
- **Total Score**: $85 + 75 + 36 + 24 + 25 + 70 + 14.4 = \mathbf{329.4 \text{ pts}}$

### Worked Example 3: Query `C++ data structures for beginners`
- **Target Document**: Doc 29 ("C++ Data Structures for Beginners", Popularity 92)
- Exact full title match: $+140 \text{ pts}$
- Title terms "C++", "data", "structures", "beginners": $4 \times 25 = +100 \text{ pts}$
- Keyword matches ("beginners", "data structures"): $2 \times 18 = +36 \text{ pts}$
- Description terms: $5 \times 6 = +30 \text{ pts}$
- Phrase proximity bonus: $+25 \text{ pts}$
- Full query coverage ratio: $4 / 4 = 1.0 \times 70 = +70 \text{ pts}$
- Popularity: $0.15 \times 92 = +13.8 \text{ pts}$
- **Total Score**: $140 + 100 + 36 + 30 + 25 + 70 + 13.8 = \mathbf{414.8 \text{ pts}}$
*(Notice how Doc 29 ranks #1 for this specific query, outranking generic C++ documents).*

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
├── VIVA_QUESTIONS.md           # 30+ viva questions, answers & progressive demo script
├── data/
│   ├── documents.json          # 35+ curated documents with categories and URLs
│   └── history.txt             # Persistent search history and popularity counters
├── include/
│   ├── Document.h              # Document entity with category and URL support
│   ├── Trie.h                  # Prefix Tree declarations
│   ├── PhraseIndex.h           # N-Gram & multi-word phrase index declarations
│   ├── DocumentManager.h       # JSON file loader and document store
│   ├── HistoryManager.h        # Search history & frequency tracking
│   ├── SearchEngine.h          # Full-query ranking, phrase index & inverted index
│   └── HttpServer.h            # Zero-dependency WinSock2 HTTP server
├── src/
│   ├── main.cpp                # Unified entry point (Web Server & --console mode)
│   ├── main_console.cpp        # Standalone interactive terminal application
│   ├── Document.cpp            # Document methods and JSON serialization
│   ├── Trie.cpp                # Trie insertion, search, and frequency DFS
│   ├── PhraseIndex.cpp         # N-Gram extraction, phrase channels & log scaling
│   ├── DocumentManager.cpp     # Pure STL JSON parser and document storage
│   ├── HistoryManager.cpp      # File persistence & popularity rankings
│   ├── SearchEngine.cpp        # Full-query scoring, proximity, and Min-Heap Top-K
│   └── HttpServer.cpp          # WinSock2 HTTP socket server & REST routing
├── frontend/
│   ├── index.html              # Modern, glassmorphic UI with developer IDE theme
│   ├── style.css               # Luxury theme, syntax colors, badges, breadcrumbs
│   └── script.js               # Structured suggestions, refine buttons, keyboard navigation
└── tests/
    └── test_search.cpp         # Automated 20-case unit & progressive test suite
```

---

## 🛠️ Compilation & Execution

### 1. Build and Run the Web Application (MSVC - Visual Studio)
```cmd
cd "Smart Search Engine with Autocomplete"
build_msvc.bat
smart_search_server.exe
```
Then open your browser to **`http://localhost:8080`**.

### 2. Run the Automated 20-Case Test Suite
```cmd
.\tests\test_search.exe
```

### 3. Run in Standalone Console Mode
```cmd
smart_search_console.exe
```

---

## 📊 Complexity Analysis

| Operation | Data Structure | Time Complexity | Space Complexity |
|---|---|---|---|
| **Prefix Suggestion** | Trie | $O(L + K \log K)$ | $O(\sum L \cdot |\Sigma|)$ |
| **Exact Phrase Lookup** | `PhraseIndex` Map | $O(W)$ average | $O(N_{\text{phrases}} \cdot \bar{L})$ |
| **Context Multi-Word Match** | N-Gram Index | $O(N_{\text{phrases}} \cdot W_{\text{phrase}})$ | $O(N_{\text{ngrams}})$ |
| **Candidate Retrieval** | Inverted Index | $O(|Q| \cdot \text{avg}(P_t))$ | $O(\text{Unique Terms} \times \text{Postings})$ |
| **Top-$K$ Document Ranking**| Min-Heap | $O(M \log K)$ | $O(K)$ |

Where $L$ is query length, $K$ is maximum suggestions, $W$ is word count, $M$ is candidate document count, and $P_t$ is postings list length.
