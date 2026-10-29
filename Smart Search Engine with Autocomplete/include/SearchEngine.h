#ifndef SEARCH_ENGINE_H
#define SEARCH_ENGINE_H

#include "Document.h"
#include "DocumentManager.h"
#include "Trie.h"
#include "PhraseIndex.h"
#include "HistoryManager.h"
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <queue>

/**
 * @brief Represents a scored and highlighted search result ready for display.
 */
struct SearchResult {
    Document document;
    double score;
    std::string highlightedTitle;
    std::string highlightedDescription;
    std::vector<std::string> matchedKeywords;

    std::string toJson() const;
};

// Comparator for Priority Queue (Min-Heap based on score to retain top-K items)
struct SearchResultComparator {
    bool operator()(const SearchResult& a, const SearchResult& b) const {
        return a.score > b.score; // Min-heap: lowest score at top
    }
};

/**
 * @brief Google-Inspired Search Engine coordinating Indexing, Trie & Phrase Autocomplete,
 * Multi-Factor Full-Query Ranking, and History.
 */
class SearchEngine {
private:
    DocumentManager documentManager;
    Trie autocompleteTrie;
    PhraseIndex phraseIndex;
    HistoryManager historyManager;

    // Inverted Index: maps normalized word token -> list of Document IDs
    std::unordered_map<std::string, std::vector<int>> invertedIndex;

    // Tokenization and scoring utilities
    std::vector<std::string> tokenize(const std::string& text) const;
    double calculateScore(const Document& doc, const std::string& rawQuery, const std::vector<std::string>& queryTokens,
                          std::vector<std::string>& outMatchedKeywords) const;
    std::string highlightTerms(const std::string& sourceText, const std::vector<std::string>& tokens) const;

public:
    SearchEngine();

    /**
     * @brief Initializes the engine: loads documents, builds inverted index,
     * seeds the autocomplete Trie, and extracts N-grams into the PhraseIndex.
     */
    bool initialize(const std::string& documentsJsonPath = "data/documents.json",
                    const std::string& historyPath = "data/history.txt");

    /**
     * @brief Searches documents matching the full query and ranks them by relevance.
     */
    std::vector<SearchResult> search(const std::string& query, int maxResults = 10, bool recordHistory = true);

    /**
     * @brief Context-aware autocomplete returning rich suggestion objects.
     */
    std::vector<QuerySuggestion> getSuggestionsDetailed(const std::string& query, int maxSuggestions = 8);

    /**
     * @brief Context-aware autocomplete returning string list (convenience wrapper).
     */
    std::vector<std::string> getSuggestions(const std::string& query, int maxSuggestions = 8);

    /**
     * @brief Returns recent search queries.
     */
    std::vector<std::string> getRecentSearches(int limit = 5) const;

    /**
     * @brief Returns top popular search queries.
     */
    std::vector<std::pair<std::string, int>> getPopularSearches(int limit = 5) const;

    /**
     * @brief Clears user search history and resets frequencies.
     */
    void clearHistory();

    /**
     * @brief Accessors for inner components
     */
    const DocumentManager& getDocumentManager() const;
    const PhraseIndex& getPhraseIndex() const;
    const HistoryManager& getHistoryManager() const;
};

#endif // SEARCH_ENGINE_H
