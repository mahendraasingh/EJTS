#ifndef PHRASE_INDEX_H
#define PHRASE_INDEX_H

#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <utility>

/**
 * @brief Structured autocomplete suggestion with contextual metadata.
 */
struct QuerySuggestion {
    std::string text;
    std::string type; // "exact_phrase", "phrase_continuation", "context_match", "history"
    double score;

    std::string toJson() const;
};

/**
 * @brief Phrase and N-Gram Index providing Google-like multi-word context-aware suggestions.
 * 
 * Extracts unigrams, bigrams, trigrams, and full phrases from titles, descriptions,
 * keywords, and query logs to intelligently predict what words come next.
 */
class PhraseIndex {
private:
    // Stored list of unique phrases and their frequency/importance score
    std::vector<std::pair<std::string, int>> indexedPhrases;

    // Fast lookup map: maps normalized prefix string -> list of matching phrase indices
    std::unordered_map<std::string, std::vector<size_t>> prefixToPhraseMap;

    // Fast lookup map: word token -> list of phrase indices containing the token
    std::unordered_map<std::string, std::vector<size_t>> tokenToPhraseMap;

    // Helper utilities
    void extractNgramsFromText(const std::string& text, int baseWeight);

public:
    static std::vector<std::string> splitWords(const std::string& text);
    static bool isDanglingFragment(const std::string& phrase, const std::string& query);
    PhraseIndex();

    /**
     * @brief Inserts a multi-word phrase with a popularity weight.
     */
    void addPhrase(const std::string& phrase, int weight = 10);

    /**
     * @brief Ingests text (like a document title or description) and indexes
     * all sub-phrases (bigrams, trigrams, 4-grams) automatically.
     */
    void indexDocumentText(const std::string& title, const std::string& description,
                           const std::vector<std::string>& keywords, int popularity = 0);

    /**
     * @brief Generates context-aware autocomplete suggestions for the entire user query.
     * 
     * @param query The complete user query string (supports single and multiple words).
     * @param maxSuggestions Maximum number of suggestions to return (e.g., 6 to 8).
     * @return List of ranked QuerySuggestion items.
     */
    std::vector<QuerySuggestion> getContextSuggestions(const std::string& query, int maxSuggestions = 8) const;

    /**
     * @brief Clears the entire index.
     */
    void clear();

    /**
     * @brief Returns total number of indexed phrases.
     */
    size_t getPhraseCount() const;
};

#endif // PHRASE_INDEX_H
