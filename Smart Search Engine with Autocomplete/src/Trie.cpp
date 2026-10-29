#include "../include/Trie.h"
#include <algorithm>
#include <cctype>
#include <queue>

// --- TrieNode Implementation ---

TrieNode::TrieNode() : isEndOfWord(false), frequency(0), fullWord("") {}

TrieNode::~TrieNode() {
    for (auto& pair : children) {
        delete pair.second;
    }
    children.clear();
}

// --- Trie Implementation ---

Trie::Trie() {
    root = new TrieNode();
}

Trie::~Trie() {
    delete root;
    root = nullptr;
}

void Trie::clear() {
    delete root;
    root = new TrieNode();
}

std::string Trie::normalize(const std::string& text) {
    std::string result = "";
    bool inSpace = false;

    // Convert to lowercase and trim/normalize spaces
    for (char ch : text) {
        unsigned char uc = static_cast<unsigned char>(ch);
        if (std::isspace(uc)) {
            if (!result.empty() && !inSpace) {
                result += ' ';
                inSpace = true;
            }
        } else {
            result += static_cast<char>(std::tolower(uc));
            inSpace = false;
        }
    }

    // Trim trailing space if any
    while (!result.empty() && result.back() == ' ') {
        result.pop_back();
    }
    return result;
}

void Trie::insert(const std::string& word, int frequency) {
    std::string clean = normalize(word);
    if (clean.empty()) return;

    TrieNode* current = root;
    for (char ch : clean) {
        if (current->children.find(ch) == current->children.end()) {
            current->children[ch] = new TrieNode();
        }
        current = current->children[ch];
    }
    current->isEndOfWord = true;
    current->frequency += frequency;
    current->fullWord = clean;
}

bool Trie::search(const std::string& word) const {
    std::string clean = normalize(word);
    if (clean.empty()) return false;

    TrieNode* current = root;
    for (char ch : clean) {
        auto it = current->children.find(ch);
        if (it == current->children.end()) {
            return false;
        }
        current = it->second;
    }
    return current != nullptr && current->isEndOfWord;
}

void Trie::incrementFrequency(const std::string& word, int delta) {
    std::string clean = normalize(word);
    if (clean.empty()) return;

    TrieNode* current = root;
    for (char ch : clean) {
        if (current->children.find(ch) == current->children.end()) {
            current->children[ch] = new TrieNode();
        }
        current = current->children[ch];
    }
    current->isEndOfWord = true;
    current->frequency += delta;
    current->fullWord = clean;
}

void Trie::collectSuggestions(TrieNode* node, std::vector<std::pair<std::string, int>>& results) const {
    if (!node) return;

    if (node->isEndOfWord && !node->fullWord.empty()) {
        results.push_back({node->fullWord, node->frequency});
    }

    for (const auto& pair : node->children) {
        collectSuggestions(pair.second, results);
    }
}

std::vector<std::string> Trie::getSuggestions(const std::string& prefix, int maxSuggestions) const {
    std::vector<std::string> suggestions;
    std::string cleanPrefix = normalize(prefix);

    if (cleanPrefix.empty()) {
        return suggestions;
    }

    // 1. Traverse to the node representing the prefix
    TrieNode* current = root;
    for (char ch : cleanPrefix) {
        auto it = current->children.find(ch);
        if (it == current->children.end()) {
            return suggestions; // Prefix not found
        }
        current = it->second;
    }

    // 2. DFS to collect all words starting with this prefix
    std::vector<std::pair<std::string, int>> candidates;
    collectSuggestions(current, candidates);

    if (candidates.empty()) {
        return suggestions;
    }

    // 3. Sort candidates by frequency descending, then lexicographically
    std::sort(candidates.begin(), candidates.end(), [](const auto& a, const auto& b) {
        if (a.second != b.second) {
            return a.second > b.second; // Higher frequency first
        }
        return a.first < b.first; // Alphabetical order as tie-breaker
    });

    // 4. Extract top maxSuggestions
    int limit = std::min(maxSuggestions, static_cast<int>(candidates.size()));
    for (int i = 0; i < limit; ++i) {
        suggestions.push_back(candidates[i].first);
    }

    return suggestions;
}
