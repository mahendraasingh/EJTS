#include "../include/SearchEngine.h"
#include <sstream>
#include <algorithm>
#include <cctype>
#include <iomanip>
#include <regex>

// --- SearchResult JSON Serialization ---

std::string SearchResult::toJson() const {
    std::ostringstream ss;
    ss << "{";
    ss << "\"score\":" << std::fixed << std::setprecision(2) << score << ",";
    ss << "\"highlightedTitle\":\"" << highlightedTitle << "\",";
    ss << "\"highlightedDescription\":\"" << highlightedDescription << "\",";
    ss << "\"matchedKeywords\":[";
    for (size_t i = 0; i < matchedKeywords.size(); ++i) {
        ss << "\"" << matchedKeywords[i] << "\"";
        if (i + 1 < matchedKeywords.size()) ss << ",";
    }
    ss << "],";
    ss << "\"document\":" << document.toJson();
    ss << "}";
    return ss.str();
}

// --- SearchEngine Implementation ---

SearchEngine::SearchEngine() {}

bool SearchEngine::initialize(const std::string& documentsJsonPath, const std::string& historyPath) {
    if (!documentManager.loadFromJsonFile(documentsJsonPath)) {
        return false;
    }

    // Build Inverted Index and seed Autocomplete Trie
    invertedIndex.clear();
    autocompleteTrie.clear();

    const auto& docs = documentManager.getAllDocuments();
    for (const auto& doc : docs) {
        // Seed Trie with document title
        autocompleteTrie.insert(doc.getTitle(), 25);

        // Seed Trie with keywords
        for (const auto& kw : doc.getKeywords()) {
            autocompleteTrie.insert(kw, 15);
        }

        // Build inverted index for title tokens
        auto titleTokens = tokenize(doc.getTitle());
        for (const auto& token : titleTokens) {
            invertedIndex[token].push_back(doc.getId());
        }

        // Build inverted index for keyword tokens
        for (const auto& kw : doc.getKeywords()) {
            auto kwTokens = tokenize(kw);
            for (const auto& token : kwTokens) {
                invertedIndex[token].push_back(doc.getId());
            }
        }

        // Build inverted index for description tokens
        auto descTokens = tokenize(doc.getDescription());
        for (const auto& token : descTokens) {
            invertedIndex[token].push_back(doc.getId());
        }
    }

    // Deduplicate inverted index document ID postings
    for (auto& pair : invertedIndex) {
        std::sort(pair.second.begin(), pair.second.end());
        pair.second.erase(std::unique(pair.second.begin(), pair.second.end()), pair.second.end());
    }

    return true;
}

std::vector<std::string> SearchEngine::tokenize(const std::string& text) const {
    std::vector<std::string> tokens;
    std::string current = "";

    for (char ch : text) {
        unsigned char uc = static_cast<unsigned char>(ch);
        if (std::isalnum(uc)) {
            current += static_cast<char>(std::tolower(uc));
        } else {
            if (!current.empty()) {
                if (current.length() >= 2) { // Skip 1-letter noise tokens
                    tokens.push_back(current);
                }
                current.clear();
            }
        }
    }

    if (!current.empty() && current.length() >= 2) {
        tokens.push_back(current);
    }

    return tokens;
}

std::string SearchEngine::highlightTerms(const std::string& sourceText, const std::vector<std::string>& tokens) const {
    if (tokens.empty() || sourceText.empty()) return sourceText;

    // Build a case-insensitive search and wrap in <mark> tags
    std::string lowerSource = Trie::normalize(sourceText);
    std::vector<bool> isHighlighted(sourceText.size(), false);

    for (const auto& token : tokens) {
        if (token.empty()) continue;
        size_t startPos = 0;
        while ((startPos = lowerSource.find(token, startPos)) != std::string::npos) {
            for (size_t k = 0; k < token.size() && (startPos + k) < isHighlighted.size(); ++k) {
                isHighlighted[startPos + k] = true;
            }
            startPos += token.size();
        }
    }

    // Reconstruct with <mark> tags preserving original casing
    std::string result = "";
    bool inMark = false;
    for (size_t i = 0; i < sourceText.size(); ++i) {
        if (isHighlighted[i] && !inMark) {
            result += "<mark>";
            inMark = true;
        } else if (!isHighlighted[i] && inMark) {
            result += "</mark>";
            inMark = false;
        }

        // Escape JSON-special characters
        char c = sourceText[i];
        if (c == '"') result += "\\\"";
        else if (c == '\\') result += "\\\\";
        else result += c;
    }
    if (inMark) {
        result += "</mark>";
    }
    return result;
}

double SearchEngine::calculateScore(const Document& doc, const std::string& rawQuery,
                                     const std::vector<std::string>& queryTokens,
                                     std::vector<std::string>& outMatchedKeywords) const {
    double score = 0.0;
    std::string lowerTitle = Trie::normalize(doc.getTitle());
    std::string lowerDesc = Trie::normalize(doc.getDescription());
    std::string cleanQuery = Trie::normalize(rawQuery);

    // 1. Exact Title Match (+50 points)
    if (!cleanQuery.empty() && lowerTitle == cleanQuery) {
        score += 50.0;
    } else if (!cleanQuery.empty() && lowerTitle.find(cleanQuery) != std::string::npos) {
        score += 35.0; // Substring match of full query in title
    }

    // 2. Query token matches
    for (const auto& token : queryTokens) {
        // In Title (+20 per occurrence)
        size_t pos = 0;
        int titleCount = 0;
        while ((pos = lowerTitle.find(token, pos)) != std::string::npos) {
            titleCount++;
            pos += token.length();
        }
        score += titleCount * 20.0;

        // In Keywords (+15 per matched keyword)
        for (const auto& kw : doc.getKeywords()) {
            std::string lowerKw = Trie::normalize(kw);
            if (lowerKw == token || lowerKw.find(token) != std::string::npos) {
                score += 15.0;
                if (std::find(outMatchedKeywords.begin(), outMatchedKeywords.end(), kw) == outMatchedKeywords.end()) {
                    outMatchedKeywords.push_back(kw);
                }
            }
        }

        // In Description (+5 per occurrence)
        pos = 0;
        int descCount = 0;
        while ((pos = lowerDesc.find(token, pos)) != std::string::npos) {
            descCount++;
            pos += token.length();
        }
        score += descCount * 5.0;
    }

    // 3. Baseline popularity bonus (+0.2 * doc popularity)
    if (score > 0.0) {
        score += (doc.getPopularity() * 0.2);
    }

    return score;
}

std::vector<SearchResult> SearchEngine::search(const std::string& query, int maxResults) {
    std::vector<SearchResult> results;
    std::string cleanQuery = Trie::normalize(query);

    if (cleanQuery.empty()) {
        return results;
    }

    // 1. Record search query in history and update Trie frequency
    historyManager.recordSearch(cleanQuery);
    autocompleteTrie.incrementFrequency(cleanQuery, 2);

    // 2. Tokenize query
    auto queryTokens = tokenize(cleanQuery);
    if (queryTokens.empty() && !cleanQuery.empty()) {
        queryTokens.push_back(cleanQuery);
    }

    // 3. Gather candidate document IDs using Inverted Index
    std::unordered_set<int> candidateDocIds;
    for (const auto& token : queryTokens) {
        auto it = invertedIndex.find(token);
        if (it != invertedIndex.end()) {
            for (int id : it->second) {
                candidateDocIds.insert(id);
            }
        }
    }

    // If inverted index had no exact token hits, fallback to checking all documents
    if (candidateDocIds.empty()) {
        for (const auto& doc : documentManager.getAllDocuments()) {
            candidateDocIds.insert(doc.getId());
        }
    }

    // 4. Score all candidate documents and maintain Top-K in Priority Queue (Min-Heap)
    std::priority_queue<SearchResult, std::vector<SearchResult>, SearchResultComparator> minHeap;

    for (int docId : candidateDocIds) {
        const Document* docPtr = documentManager.getDocumentById(docId);
        if (!docPtr) continue;

        std::vector<std::string> matchedKeywords;
        double score = calculateScore(*docPtr, cleanQuery, queryTokens, matchedKeywords);

        if (score > 0.0) {
            SearchResult item;
            item.document = *docPtr;
            item.score = score;
            item.highlightedTitle = highlightTerms(docPtr->getTitle(), queryTokens);
            item.highlightedDescription = highlightTerms(docPtr->getDescription(), queryTokens);
            item.matchedKeywords = matchedKeywords;

            if (static_cast<int>(minHeap.size()) < maxResults) {
                minHeap.push(item);
            } else if (item.score > minHeap.top().score) {
                minHeap.pop();
                minHeap.push(item);
            }
        }
    }

    // 5. Extract from min-heap into vector (gives ascending order, so reverse to descending)
    while (!minHeap.empty()) {
        results.push_back(minHeap.top());
        minHeap.pop();
    }
    std::reverse(results.begin(), results.end());

    return results;
}

std::vector<std::string> SearchEngine::getSuggestions(const std::string& prefix, int maxSuggestions) {
    return autocompleteTrie.getSuggestions(prefix, maxSuggestions);
}

std::vector<std::string> SearchEngine::getRecentSearches(int limit) const {
    return historyManager.getRecentSearches(limit);
}

std::vector<std::pair<std::string, int>> SearchEngine::getPopularSearches(int limit) const {
    return historyManager.getPopularSearches(limit);
}

void SearchEngine::clearHistory() {
    historyManager.clearHistory();
}

const DocumentManager& SearchEngine::getDocumentManager() const {
    return documentManager;
}

const HistoryManager& SearchEngine::getHistoryManager() const {
    return historyManager;
}
