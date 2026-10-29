# VIVA PREPARATION GUIDE & PRESENTATION SCRIPT

## Project: Smart Search Engine with Autocomplete Using C++

---

## 🎙️ 2-Minute Project Presentation Script for Professors

*(Use this script when presenting the project in front of your professor or evaluation panel)*

> **"Respected Professor and Panel Members, Good Morning/Afternoon.**
>
> Today, I am proud to present our college capstone project titled **'Smart Search Engine with Autocomplete Using C++'**.
>
> In real-world web systems like Google or Amazon, searching is more than just scanning text. It requires two core capabilities:
> 1. **Interactive prefix prediction (autocomplete)** that assists the user in real-time as they type, and
> 2. **Relevance ranking** that ensures the most meaningful documents appear at the very top of the results.
>
> In this project, we built a complete, high-performance search engine from scratch in **C++17** using pure Data Structures and Algorithms without relying on heavy third-party frameworks.
>
> **Here is how our architecture works:**
> - For autocomplete, we implemented a **Trie (Prefix Tree)** data structure. When a user types a prefix like `'pro'`, the Trie traverses down the prefix path in $O(L)$ time and extracts the top suggestions using a frequency-weighted Depth-First Search.
> - For searching, we built an **Inverted Index** using hash maps that maps words directly to document IDs in $O(1)$ average time.
> - For ranking, we designed a **Multi-Factor Scoring Algorithm** that awards points for exact title matches, word frequency across titles, keywords, and descriptions, and document popularity. We then use a **Priority Queue (Min-Heap)** to extract the top-$K$ highest-scoring results in $O(N \log K)$ time.
> - To make it a complete real-world application, we created a lightweight, zero-dependency **Windows Socket (WinSock2) HTTP Server** in C++ that exposes clean REST API endpoints (`/api/suggest`, `/api/search`, `/api/popular`, `/api/history`) to a modern, responsive web interface, along with an interactive console CLI mode.
>
> Let me now demonstrate the application running live and show you the search in action."

---

## 🔍 Core Technical Concept Explanations

### 1. How Trie Insertion and Prefix Autocomplete Work
- **Insertion:** We start at the `root` node. For each character in the string, we check if a child node exists in `std::unordered_map<char, TrieNode*> children`. If not, we dynamically allocate a new `TrieNode`. At the final character, we set `isEndOfWord = true`, store the `fullWord`, and increment its `frequency` weight.
- **Prefix Matching:** To get suggestions for prefix $P$, we traverse character by character from the root. If any character path is missing, the prefix does not exist and we return an empty list. If found, we reach the prefix node and perform a Depth-First Search (DFS) to collect all descendant words marked with `isEndOfWord = true`.
- **Ranking Suggestions:** Candidates collected during DFS are sorted by their `frequency` descending so that more popular searches appear first.

### 2. Time and Space Complexity Summary

| Operation | Data Structure | Time Complexity | Space Complexity |
| :--- | :--- | :--- | :--- |
| **Insert into Trie** | Trie | $O(L)$ where $L = \text{word length}$ | $O(L \times \Sigma)$ |
| **Prefix Autocomplete** | Trie + DFS | $O(L + M \log M)$ ($M = \text{descendant words}$) | $O(M)$ |
| **Inverted Index Lookup** | `unordered_map` | $O(1)$ average | $O(V \times D)$ ($V = \text{vocab}, D = \text{docs}$) |
| **Top-K Ranking** | Priority Queue (Min-Heap) | $O(N \log K)$ ($N = \text{candidates}, K = \text{results}$) | $O(K)$ |
| **History Add/Remove** | `deque` | $O(1)$ | $O(H)$ ($H = \text{history cap}$) |

### 3. How C++ Communicates with the Frontend
- The C++ backend creates a standard TCP socket using Windows Sockets (`WSAStartup`, `socket()`, `bind()`, `listen()`, `accept()`).
- When the frontend JavaScript sends a request via `fetch('http://localhost:8080/api/suggest?q=pro')`, the C++ socket receives the raw HTTP GET text.
- The `HttpServer` parses the query string, queries the `SearchEngine`, serializes the results to JSON strings, appends HTTP response headers (including CORS headers `Access-Control-Allow-Origin: *`), and transmits the bytes back over the socket.

---

## ❓ 25 College Viva Questions and Answers

### Section A: C++ & Object-Oriented Programming (OOP)

#### Q1. Why did you choose C++17 for this search engine project?
**Answer:** C++17 provides high execution speed, fine-grained control over dynamic memory and pointers, rich standard library containers (like `unordered_map`, `priority_queue`, and `vector`), and low-level socket networking, making it ideal for high-throughput information retrieval systems.

#### Q2. What OOP principles are implemented in this project?
**Answer:**
- **Encapsulation:** Classes like `Document`, `Trie`, `SearchEngine`, and `HistoryManager` hide their internal state (private members) and expose controlled public member functions.
- **Abstraction:** The `SearchEngine` interface allows callers to simply call `search()` or `getSuggestions()` without needing to know the internal workings of the Trie or inverted index.
- **Single Responsibility Principle (SRP):** Each class handles one specific concern (e.g., `DocumentManager` loads files, `HistoryManager` tracks user history).

#### Q3. How do you prevent memory leaks in the Trie?
**Answer:** In `TrieNode::~TrieNode()`, we implement a recursive destructor that iterates through the `children` hash map and calls `delete` on every dynamically allocated child pointer. In `Trie::~Trie()`, deleting the `root` node triggers the full recursive deletion of the entire tree.

#### Q4. Why did you use `std::unordered_map` instead of `std::map`?
**Answer:** `std::unordered_map` is implemented as a Hash Table providing average $O(1)$ insertion and lookup time complexity. In contrast, `std::map` is implemented as a Red-Black Tree with $O(\log N)$ complexity. For word lookups in autocomplete and indexing, hash tables are significantly faster.

#### Q5. What is RAII in C++ and where is it used here?
**Answer:** RAII stands for *Resource Acquisition Is Initialization*. It ensures that resources (like file streams and dynamic memory) are acquired in a constructor and automatically released in a destructor. We use it with `std::ifstream`, `std::ofstream`, and class destructors to guarantee proper cleanup even if exceptions occur.

---

### Section B: Trie & Autocomplete

#### Q6. What is a Trie data structure?
**Answer:** A Trie (or Prefix Tree) is a specialized tree structure where each node represents a character of a word. Instead of storing entire words at each node, strings are defined by the path traversed from the root to an end-of-word node.

#### Q7. Why is a Trie better than a regular array or hash map for autocomplete?
**Answer:** With an array, finding words with a prefix requires scanning all $N$ words, taking $O(N \times L)$ time. A hash table only matches exact words, not prefixes. A Trie navigates directly to the prefix node in $O(L)$ time regardless of whether there are 100 or 1,000,000 words in the dictionary.

#### Q8. How do you handle case-insensitivity in the Trie?
**Answer:** Through our `Trie::normalize()` function, all input strings and user queries are converted to lowercase characters and trimmed of excess whitespace before insertion or searching.

#### Q9. How does the Trie rank which autocomplete suggestions to show first?
**Answer:** Each `TrieNode` maintains an integer `frequency` counter. During the Depth-First Search traversal from the prefix node, all candidate words are collected along with their frequencies. We sort these candidates descending by frequency, returning the top 5 to 10 most popular words.

#### Q10. What happens if the user types a prefix with no matches?
**Answer:** The prefix traversal loop fails to find the corresponding child character in the `children` map and gracefully returns an empty vector (`{}`) without traversing further or crashing.

---

### Section C: Information Retrieval, Indexing & Ranking

#### Q11. What is an Inverted Index?
**Answer:** An Inverted Index is an information retrieval data structure that maps words (terms) to the list of document IDs (called *postings*) in which those words appear. Instead of searching documents for words, it looks up words to find documents in $O(1)$ time.

#### Q12. Explain the relevance scoring formula used in this project.
**Answer:** The score combines:
- Exact Title Match: **+50 pts**
- Substring Query in Title: **+35 pts**
- Term matches in Title: **+20 pts each**
- Term matches in Keyword Tags: **+15 pts each**
- Term matches in Description: **+5 pts each**
- Document Base Popularity: **+0.2 × popularity**

#### Q13. Why use a Priority Queue (Heap) for top-K results?
**Answer:** If we have $N$ matching documents and only want to display the top $K=10$ results, a Min-Heap of size $K$ allows us to process candidates in $O(N \log K)$ time. This is significantly faster than sorting all $N$ elements which takes $O(N \log N)$ time.

#### Q14. What is query tokenization?
**Answer:** Tokenization is the process of breaking a continuous query string (e.g., `"data structures in c++"`) into individual word tokens (`"data"`, `"structures"`, `"c++"`), discarding punctuation and converting to lowercase.

#### Q15. How is search term highlighting implemented?
**Answer:** The `SearchEngine::highlightTerms()` function scans the original document text for the query tokens case-insensitively and wraps the matching characters with HTML `<mark>` tags while preserving the original casing of the text.

---

### Section D: History, Persistence & Sockets

#### Q16. How is search history stored and persisted?
**Answer:** `HistoryManager` maintains recent queries in a `std::deque<std::string>` in memory and writes them to a text file (`data/history.txt`). When the application restarts, it reads this file to restore past searches.

#### Q17. How do popular searches work?
**Answer:** Whenever a user executes a search, `HistoryManager` increments a frequency counter in `std::unordered_map<std::string, int> searchFrequencies`. The `getPopularSearches()` function sorts this map by frequency descending and returns the top 5 queries.

#### Q18. How does the C++ backend handle HTTP requests without external libraries?
**Answer:** It uses the Windows Sockets API (`winsock2.h`). The server creates a TCP socket listening on port `8080`. When a client connects, the server reads the HTTP request string, parses the URL endpoint and parameters, invokes the search engine, and writes back a standard HTTP/1.1 response with JSON body and headers.

#### Q19. What are CORS headers and why did you include them?
**Answer:** CORS (*Cross-Origin Resource Sharing*) headers like `Access-Control-Allow-Origin: *` allow the web browser to make asynchronous `fetch()` requests to the C++ server even if the frontend is opened from a different port or local file origin.

#### Q20. What is debounce in the search bar and why is it important?
**Answer:** Debouncing delays sending the autocomplete request until the user has stopped typing for a brief interval (150ms). This prevents flooding the C++ server with an HTTP request on every single keystroke.

---

### Section E: Software Engineering, Testing & Viva Traps

#### Q21. What happens if the `documents.json` file is missing or corrupted?
**Answer:** `DocumentManager::loadFromJsonFile()` checks if the file exists and whether the JSON array opens properly. If it fails, it logs an error message to `std::cerr` and returns `false`, preventing crashes.

#### Q22. How did you verify the correctness of the project?
**Answer:** We wrote an automated unit test suite in `tests/test_search.cpp` that executes 11 distinct test suites covering dataset loading, Trie autocomplete, case-insensitivity, empty inputs, non-existent words, multi-factor ranking, and history persistence.

#### Q23. What are the limitations of this project?
**Answer:** The system does not yet support phonetic matching (like Soundex) or fuzzy string distance (Levenshtein distance) for misspelled words. Also, the socket layer is currently built using WinSockets for Windows.

#### Q24. How would you scale this search engine for 1 million documents?
**Answer:**
1. Store inverted index postings on disk or distributed key-value stores.
2. Implement compression techniques on document postings.
3. Use a Radix Tree or DAWG (Directed Acyclic Word Graph) to reduce Trie memory overhead.
4. Distribute document indices across multiple nodes with map-reduce style queries.

#### Q25. What is the difference between a Trie and a Binary Search Tree (BST)?
**Answer:** In a BST, each node stores a full key and has at most 2 children, with lookups taking $O(\log N)$ average or $O(N)$ worst-case time. In a Trie, nodes store individual characters and can have multiple children; lookup time depends only on the length of the string $O(L)$, completely independent of the total number of items stored.
