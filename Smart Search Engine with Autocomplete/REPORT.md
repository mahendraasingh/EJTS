# ACADEMIC PROJECT REPORT

## PROJECT TITLE: SMART SEARCH ENGINE WITH AUTOCOMPLETE USING C++

---

### 1. TITLE PAGE

- **Project Title:** Smart Search Engine with Autocomplete Using C++
- **Academic Domain:** Data Structures, Algorithms & Information Retrieval
- **Language / Standard:** C++17
- **Architecture:** Client-Server Web Architecture / Standalone Interactive CLI
- **Submitted For:** Bachelor of Technology / Computer Science Engineering Capstone Project

---

### 2. ABSTRACT

In modern software systems, search and information retrieval represent the backbone of user discovery. This project presents **Smart Search Engine with Autocomplete**, a high-performance, mini search engine developed in pure C++17. The system solves the dual challenge of real-time prefix prediction and relevant document retrieval from a corpus of structured computer science documents.

The autocomplete subsystem employs a **Trie (Prefix Tree)** data structure that guarantees optimal $O(L)$ search time complexity, where $L$ is query prefix length, enriched with frequency-weighted Depth-First Search (DFS) for popularity ranking. Document searching is accelerated through an **Inverted Index** implemented using hash maps (`std::unordered_map`). Search results are evaluated via a **multi-factor relevance ranking algorithm** that analyzes exact title matches, word occurrences across titles, keyword tags, descriptions, and baseline document popularity. Top results are efficiently sorted using a Min-Heap (`std::priority_queue`). A custom, zero-dependency Windows Socket (WinSock2) HTTP server bridges the C++ core to a responsive, glassmorphic web interface.

---

### 3. INTRODUCTION

Search engines allow users to rapidly locate information across vast datasets. Beyond basic substring search, real-world systems require:
1. **Interactive Guidance:** Predicting search intent via instant autocomplete suggestions as the user types.
2. **Relevance Scoring:** Ranking documents so the most meaningful results appear at the top.
3. **Session Awareness:** Tracking user search history and surfacing community-wide popular searches.

This project demonstrates how fundamental Computer Science concepts—such as Trees, Hash Tables, Heaps, String Tokenization, File I/O, and Socket Programming—integrate into a cohesive, production-grade application.

---

### 4. PROBLEM STATEMENT

Conventional basic search implementations in academic projects typically suffer from:
- **Inefficient Substring Scanning:** Iterating over every document with $O(N \times M)$ string search algorithms, which scales poorly as document volume grows.
- **Absence of Real-Time Autocomplete:** Forcing users to guess exact document titles without dynamic assistance.
- **Unranked Results:** Returning matches in arbitrary insertion order rather than by relevance.
- **Heavy External Dependencies:** Requiring complex third-party web frameworks, Python packages, or external database setups that complicate compilation on academic evaluation environments.

**Objective of this project:** Design and implement a self-contained, clean C++17 solution with zero external library requirements that provides real-time autocomplete, inverted indexing, and multi-factor relevance ranking.

---

### 5. OBJECTIVES

1. Construct an efficient **Trie** structure to store vocabulary and deliver top 5–10 suggestions within sub-millisecond response times.
2. Build an **Inverted Index** using hash maps to instantly retrieve candidate documents without linear scanning.
3. Formulate and implement a **Multi-Factor Relevance Scoring Function** that prioritizes exact matches and high-frequency terms.
4. Implement **Persistent Search History and Popularity Tracking** using local disk file handling.
5. Engineer a **Zero-Dependency WinSock2 HTTP Server** in C++ to expose standard REST API endpoints.
6. Design a modern, responsive **Web Frontend** with keyboard navigation, text highlighting, and real-time updates.
7. Deliver a complementary **Interactive Console Mode** for direct terminal testing and viva demonstration.
8. Establish a rigorous **Automated Test Suite** verifying edge cases, case-insensitivity, and algorithmic correctness.

---

### 6. SCOPE OF THE PROJECT

- **Target Corpus:** 25 curated Computer Science documents spanning algorithms, systems, web technologies, and AI.
- **Search Capabilities:** Prefix matching, single-term search, multi-term keyword search, case-insensitive normalization.
- **Platform:** Windows (with native WinSock2 network support; portable standard C++ core).
- **Extensibility:** The JSON document dataset and vocabulary can be expanded without altering engine source code.

---

### 7. HARDWARE AND SOFTWARE REQUIREMENTS

#### 7.1 Software Requirements
- **Operating System:** Windows 10 / Windows 11 (or Linux/macOS for core engine)
- **Programming Language:** C++17 compliant compiler:
  - Microsoft Visual C++ (MSVC / Build Tools 2019/2022/2026), OR
  - MinGW GCC (`g++` 9.0+)
- **Build Utilities:** CMake 3.12+ (optional) or included `.bat` scripts
- **Frontend Environment:** Any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox)

#### 7.2 Hardware Requirements
- **Processor:** 1.8 GHz multi-core x86/x64 processor
- **Memory (RAM):** 2 GB minimum (system footprint is $< 25 \text{ MB}$)
- **Storage:** 50 MB available disk space

---

### 8. SYSTEM ARCHITECTURE

```text
+-------------------------------------------------------------+
|                  Client Layer (Web Browser)                 |
|       [Search Input]   [Trie Dropdown]   [Result Cards]     |
+------------------------------+------------------------------+
                               |  HTTP GET / DELETE (JSON)
                               v
+-------------------------------------------------------------+
|               C++ WinSock2 HTTP Server Layer                |
|           Routes: /api/suggest, /api/search, etc.           |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                    Search Engine Core                       |
|  +--------------------+  +-------------------------------+  |
|  |   Trie Structure   |  |   Inverted Index (Hash Map)   |  |
|  | (Prefix Autocmpl)  |  |  (Token -> Document Postings)  |  |
|  +--------------------+  +-------------------------------+  |
|  +--------------------+  +-------------------------------+  |
|  | Multi-Factor Score |  | Priority Queue (Top-K Heap)   |  |
|  +--------------------+  +-------------------------------+  |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                 Data & Persistence Layer                    |
|       data/documents.json        data/history.txt           |
+-------------------------------------------------------------+
```

---

### 9. DATA FLOW DIAGRAMS

#### 9.1 DFD Level 0 (Context Diagram)

```text
[User] ----(Type prefix or query)----> [Smart Search Engine]
[User] <---(Suggestions / Results)---- [Smart Search Engine]
[Engine] <---(Read/Write Corpus)-----> [Local Disk Storage]
```

#### 9.2 DFD Level 1 (Functional Decomposition)

```text
[User Input: "pro"]
       |
       v
[1.0 Request Handler]
       |
       +---> [2.0 Trie Prefix Lookup] ---> Traverses prefix "pro" ---> [Suggestions List]
       |                                                                    |
       v                                                                    v
[User Selects Query]                                                [Return JSON to UI]
       |
       v
[3.0 Tokenizer & Normalizer] ---> Produces clean lowercase tokens
       |
       v
[4.0 Inverted Index Lookup] ---> Fetches candidate Document IDs from Hash Map
       |
       v
[5.0 Multi-Factor Scorer] ---> Computes points (Exact, Title, Keywords, Desc, Pop)
       |
       v
[6.0 Min-Heap Filter] ---> Keeps top-K highest scoring results in Priority Queue
       |
       v
[7.0 History & Stats Manager] ---> Updates recent deque & query frequency on disk
```

---

### 10. USE-CASE DIAGRAM

```text
                      +---------------------------------------+
                      |       Smart Search Engine System      |
                      |                                       |
                      |  (1) Type Prefix for Autocomplete     |
                      |                 ^                     |
                      |                 |                     |
     +--------+       |  (2) Execute Search Query             |
     |        |------>|                 ^                     |
     |  User  |       |                 |                     |
     |        |------>|  (3) View Ranked & Highlighted Results|
     +--------+       |                                       |
                      |  (4) Explore Top 5 Popular Searches   |
                      |                                       |
                      |  (5) Browse & Re-run Recent History   |
                      |                                       |
                      |  (6) Clear Search History             |
                      +---------------------------------------+
```

---

### 11. DATA STRUCTURES AND ALGORITHMS ANALYSIS

| Component | Data Structure | Why It Was Chosen | Alternative Considered | Time Complexity |
| :--- | :--- | :--- | :--- | :--- |
| **Autocomplete** | **Trie (Prefix Tree)** | Enables retrieval of all words sharing a common prefix in time proportional only to the prefix length. | Linear array or regex scan | Lookup: $O(L)$<br>Insert: $O(L)$ |
| **Inverted Index** | **Hash Map (`unordered_map`)** | Provides average $O(1)$ mapping from normalized word token to list of document IDs. | Balanced BST (`std::map`) | Insertion: $O(1)$ avg<br>Lookup: $O(1)$ avg |
| **Top-K Ranking** | **Priority Queue (Min-Heap)** | Maintains only the top $K$ results in memory, avoiding a full $O(N \log N)$ sort of all documents. | QuickSort on full array | Top-$K$: $O(N \log K)$ |
| **Document Store** | **Vector (`std::vector`)** | Contiguous memory allocation, fast cache locality, and $O(1)$ index access. | Linked List | Access: $O(1)$ |
| **Recent History** | **Deque (`std::deque`)** | Allows $O(1)$ insertions at front and $O(1)$ removals at back to cap history size. | Array | Push/Pop: $O(1)$ |

---

### 12. MODULE DESCRIPTIONS

1. **`Document` Class:** Encapsulates document attributes (`id`, `title`, `description`, `keywords`, `popularity`) and provides JSON serialization.
2. **`TrieNode` & `Trie` Classes:** Implements character branching, end-of-word markers, frequency weights, and recursive DFS prefix extraction.
3. **`DocumentManager` Class:** Handles file stream input (`std::ifstream`), implements a pure STL JSON parser, and maintains ID-to-document mappings.
4. **`HistoryManager` Class:** Tracks session queries, manages frequency statistics, and serializes state to disk.
5. **`SearchEngine` Class:** Coordinates document loading, tokenization, inverted index creation, relevance scoring, and result highlighting.
6. **`HttpServer` Class:** Implements non-blocking/multithreaded Windows Socket communication, routes REST endpoints, sets CORS headers, and serves frontend static assets.
7. **Frontend Web UI (`HTML/CSS/JS`):** Implements modern UX, debounced user input, arrow-key navigation in autocomplete dropdown, and score visualization.

---

### 13. IMPLEMENTATION DETAILS & SCORING MATHEMATICS

The relevance score $S(D, Q)$ for document $D$ and query $Q$ with tokens $\{t_1, t_2, \dots, t_m\}$ is computed as:

$$S(D, Q) = S_{\text{exact}} + S_{\text{title}} + S_{\text{keyword}} + S_{\text{desc}} + S_{\text{popularity}}$$

Where:
- $S_{\text{exact}} = 50.0$ if $\text{Title}(D) == Q$, or $35.0$ if $Q$ is a substring of $\text{Title}(D)$.
- $S_{\text{title}} = 20.0 \times \sum_{i=1}^{m} \text{Count}(t_i \in \text{Title}(D))$.
- $S_{\text{keyword}} = 15.0 \times \sum_{i=1}^{m} \mathbb{I}(t_i \in \text{Keywords}(D))$.
- $S_{\text{desc}} = 5.0 \times \sum_{i=1}^{m} \text{Count}(t_i \in \text{Description}(D))$.
- $S_{\text{popularity}} = 0.2 \times \text{Popularity}(D)$ (awarded only if the document matches at least one term).

---

### 14. TESTING AND RESULTS

An automated test suite was constructed and executed (`tests/test_search.cpp`). All 11 test suites executed with 100% pass rate:

1. **Dataset Loading:** Successfully parsed 25 documents from `data/documents.json`.
2. **Prefix Autocomplete:** Correctly extracted suggestions for `"pro"` containing `"programming"`.
3. **Case-Insensitivity:** Verified `"trie"` and `"TRIE"` yield identical autocomplete suggestions.
4. **Empty Prefix Safety:** Confirmed empty prefix returns empty list without crashes.
5. **Exact Match Search:** Query `"C++"` correctly retrieved C++ documentation as highest rank.
6. **Case-Insensitive Query Search:** Verified `"algorithms"` and `"ALGORITHMS"` returned identical matches.
7. **Empty Query Input:** Verified empty string produces zero results safely.
8. **No Matching Documents:** Verified nonexistent queries yield graceful empty responses.
9. **Relevance Ranking:** Verified that exact title matches score higher than peripheral keyword matches.
10. **Popular Searches Counter:** Querying `"cloud computing"` 3 times correctly incremented its popularity count to 3.
11. **History Clearing:** Confirmed history reset functionality.

---

### 15. ADVANTAGES AND LIMITATIONS

#### Advantages
- **Zero External Dependencies:** Compiles out of the box with standard C++17 and Windows Sockets.
- **High Performance:** Trie prefix lookup executes in microseconds.
- **Dual Interface:** Run in a modern Web Browser or directly inside the terminal.
- **Clean OOP Design:** Well-separated classes adhering to Single Responsibility Principle.

#### Limitations
- Does not currently perform fuzzy spelling correction (e.g., Levenshtein distance).
- Network socket implementation currently targets Windows (WinSock2); POSIX sockets required for Linux.

---

### 16. FUTURE ENHANCEMENTS

1. **Levenshtein Distance / BK-Tree:** Add fuzzy spell-checking ("Did you mean: programming?").
2. **TF-IDF & BM25 Scoring:** Implement probabilistic information retrieval models.
3. **Web Crawler Integration:** Automatically crawl and index real live web pages.
4. **Cross-Platform Sockets:** Wrap POSIX and WinSock sockets with an OS abstraction layer.

---

### 17. CONCLUSION

The **Smart Search Engine with Autocomplete Using C++** successfully demonstrates the practical implementation of core Computer Science principles. By integrating a Trie for prefix prediction, an Inverted Index for fast candidate lookup, a Priority Queue for top-$K$ ranking, and a WinSock2 HTTP server, the project provides a comprehensive, responsive, and robust search application suitable for academic demonstration and real-world software foundation.

---

### 18. REFERENCES

1. Stroustrup, Bjarne. *The C++ Programming Language (4th Edition)*. Addison-Wesley, 2013.
2. Cormen, Thomas H., et al. *Introduction to Algorithms (3rd Edition)*. MIT Press, 2009.
3. Manning, Christopher D., Raghavan, P., & Schütze, H. *Introduction to Information Retrieval*. Cambridge University Press, 2008.
4. Microsoft Corporation. *Windows Sockets 2 (WinSock) API Documentation*. Microsoft Learn.
