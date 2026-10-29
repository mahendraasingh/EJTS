#ifndef TRIE_H
#define TRIE_H

#include <string>
#include <vector>
#include <unordered_map>
#include <utility>

/**
 * @brief Represents a single node in the Trie structure.
 * 
 * Uses an unordered_map for children to support lowercase alphabets,
 * numbers, spaces, and punctuation gracefully without fixed-size arrays.
 */
class TrieNode {
public:
    std::unordered_map<char, TrieNode*> children;
    bool isEndOfWord;
    int frequency; // Popularity or search frequency weight
    std::string fullWord; // Stored at end-of-word nodes for fast retrieval

    TrieNode();
    ~TrieNode();
};

/**
 * @brief Prefix Tree (Trie) for fast autocomplete and prefix matching.
 * 
 * Provides O(L) time complexity for search, insert, and prefix lookup,
 * where L is the length of the string.
 */
class Trie {
private:
    TrieNode* root;

    // Helper DFS function to collect suggestions from a given node
    void collectSuggestions(TrieNode* node, std::vector<std::pair<std::string, int>>& results) const;

public:
    Trie();
    ~Trie();

    // Prevent accidental shallow copying
    Trie(const Trie&) = delete;
    Trie& operator=(const Trie&) = delete;

    /**
     * @brief Inserts a word/phrase with an initial frequency weight.
     */
    void insert(const std::string& word, int frequency = 1);

    /**
     * @brief Checks if an exact word exists in the Trie.
     */
    bool search(const std::string& word) const;

    /**
     * @brief Increments the search frequency of an existing word or inserts it.
     */
    void incrementFrequency(const std::string& word, int delta = 1);

    /**
     * @brief Retrieves top suggestions matching the given prefix.
     * 
     * Results are sorted by frequency (popularity) in descending order.
     * 
     * @param prefix Query prefix typed by the user.
     * @param maxSuggestions Maximum number of suggestions to return (default: 5).
     * @return List of matching suggested words/phrases.
     */
    std::vector<std::string> getSuggestions(const std::string& prefix, int maxSuggestions = 5) const;

    /**
     * @brief Clears and resets the entire Trie.
     */
    void clear();

    /**
     * @brief Helper to normalize string to lowercase and strip extra whitespace.
     */
    static std::string normalize(const std::string& text);
};

#endif // TRIE_H
