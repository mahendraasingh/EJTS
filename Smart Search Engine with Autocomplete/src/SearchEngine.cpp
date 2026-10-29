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

    // Build Inverted Index, seed Autocomplete Trie & build Phrase Index
    invertedIndex.clear();
    autocompleteTrie.clear();
    phraseIndex.clear();

    const auto& docs = documentManager.getAllDocuments();
    for (const auto& doc : docs) {
        // Seed Trie with document title
        autocompleteTrie.insert(doc.getTitle(), 25);

        // Seed Trie with keywords
        for (const auto& kw : doc.getKeywords()) {
            autocompleteTrie.insert(kw, 15);
        }

        // Deep phrase indexing (N-grams: unigrams, bigrams, trigrams, 4-grams)
        phraseIndex.indexDocumentText(doc.getTitle(), doc.getDescription(), doc.getKeywords(), doc.getPopularity());

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

    // Index previous search history phrases
    for (const auto& h : historyManager.getRecentSearches(20)) {
        phraseIndex.addPhrase(h, 40);
    }

    return true;
}

std::vector<std::string> SearchEngine::tokenize(const std::string& text) const {
    std::vector<std::string> tokens;
    std::string current = "";

    for (char ch : text) {
        unsigned char uc = static_cast<unsigned char>(ch);
        // Allow alphanumeric plus '+' for C++
        if (std::isalnum(uc) || ch == '+') {
            current += static_cast<char>(std::tolower(uc));
        } else {
            if (!current.empty()) {
                if (current.length() >= 2 || current == "c" || current == "r") {
                    tokens.push_back(current);
                }
                current.clear();
            }
        }
    }

    if (!current.empty()) {
        tokens.push_back(current);
    }

    return tokens;
}

std::string SearchEngine::highlightTerms(const std::string& sourceText, const std::vector<std::string>& tokens) const {
    if (tokens.empty() || sourceText.empty()) return sourceText;

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

    if (cleanQuery.empty() || queryTokens.empty()) return 0.0;

    // 1. Exact Complete Phrase Matching (Google-like Title & Body Match)
    if (lowerTitle == cleanQuery) {
        score += 140.0; // Perfect full title match!
    } else if (lowerTitle.find(cleanQuery) != std::string::npos) {
        score += 85.0;  // Exact phrase contained inside title
    }

    if (lowerDesc.find(cleanQuery) != std::string::npos) {
        score += 45.0;  // Exact phrase contained inside description
    }

    // 2. Query Term Coverage (How many of the user's words appear in the document)
    int matchedTokensCount = 0;
    for (const auto& token : queryTokens) {
        bool inTitle = (lowerTitle.find(token) != std::string::npos);
        bool inDesc = (lowerDesc.find(token) != std::string::npos);
        bool inKeywords = false;

        for (const auto& kw : doc.getKeywords()) {
            std::string lowerKw = Trie::normalize(kw);
            if (lowerKw == token || lowerKw.find(token) != std::string::npos) {
                inKeywords = true;
                if (std::find(outMatchedKeywords.begin(), outMatchedKeywords.end(), kw) == outMatchedKeywords.end()) {
                    outMatchedKeywords.push_back(kw);
                }
            }
        }

        if (inTitle || inDesc || inKeywords) {
            matchedTokensCount++;
        }

        // Weighted term counts
        if (inTitle) {
            size_t pos = 0;
            int count = 0;
            while ((pos = lowerTitle.find(token, pos)) != std::string::npos) {
                count++;
                pos += token.length();
            }
            score += count * 25.0;
        }

        if (inKeywords) {
            score += 18.0;
        }

        if (inDesc) {
            size_t pos = 0;
            int count = 0;
            while ((pos = lowerDesc.find(token, pos)) != std::string::npos) {
                count++;
                pos += token.length();
            }
            score += count * 6.0;
        }
    }

    // Coverage Multiplier: Prioritize documents that cover all or most query terms
    double coverageRatio = static_cast<double>(matchedTokensCount) / queryTokens.size();
    score += (coverageRatio * 50.0);

    // Full coverage jackpot (all words of query present in document)
    if (coverageRatio >= 0.99) {
        score += 35.0;
    }

    // 3. Phrase Proximity (if consecutive query tokens appear close together in description)
    if (queryTokens.size() >= 2) {
        size_t pos1 = lowerDesc.find(queryTokens[0]);
        size_t pos2 = lowerDesc.find(queryTokens[1]);
        if (pos1 != std::string::npos && pos2 != std::string::npos) {
            size_t diff = (pos1 > pos2) ? (pos1 - pos2) : (pos2 - pos1);
            if (diff < 60) {
                score += 20.0; // Near each other in text!
            }
        }
    }

    // 4. Baseline Document Popularity Bonus
    if (score > 0.0) {
        score += (doc.getPopularity() * 0.25);
    }

    return score;
}

std::vector<SearchResult> SearchEngine::search(const std::string& query, int maxResults, bool recordHistory) {
    std::vector<SearchResult> results;
    std::string cleanQuery = Trie::normalize(query);

    if (cleanQuery.empty()) {
        return results;
    }

    // 1. Record search query in history, Trie, and PhraseIndex
    if (recordHistory) {
        historyManager.recordSearch(cleanQuery);
        autocompleteTrie.incrementFrequency(cleanQuery, 2);
        phraseIndex.addPhrase(cleanQuery, 35); // Engine learns from user queries!
    }

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

    // If inverted index had no exact hits, check all documents
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

    // 5. Extract from min-heap into vector (gives ascending order, reverse to descending)
    while (!minHeap.empty()) {
        results.push_back(minHeap.top());
        minHeap.pop();
    }
    std::reverse(results.begin(), results.end());

    return results;
}

std::vector<QuerySuggestion> SearchEngine::getSuggestionsDetailed(const std::string& query, int maxSuggestions) {
    std::vector<QuerySuggestion> suggestions;
    std::string cleanQuery = Trie::normalize(query);
    if (cleanQuery.empty()) return suggestions;

    std::unordered_set<std::string> seen;
    auto queryWords = tokenize(cleanQuery);

    // 1. Check History for matching past searches
    for (const auto& h : historyManager.getRecentSearches(10)) {
        if (h.rfind(cleanQuery, 0) == 0 && h != cleanQuery) {
            if (seen.find(h) == seen.end()) {
                seen.insert(h);
                suggestions.push_back({h, "history", 160.0});
            }
        }
    }

    // 2. Trie single-word completions (Keywords and Titles starting with prefix)
    if (queryWords.size() <= 1) {
        auto trieMatches = autocompleteTrie.getSuggestions(cleanQuery, maxSuggestions);
        for (size_t i = 0; i < trieMatches.size(); ++i) {
            const auto& tm = trieMatches[i];
            if (seen.find(tm) == seen.end() && tm != cleanQuery) {
                seen.insert(tm);
                suggestions.push_back({tm, "word_completion", 170.0 - (i * 2.0)});
            }
        }
    }

    // 3. Query Context-Aware Phrase & N-Gram Index (retrieve generous candidate pool)
    auto phraseSuggestions = phraseIndex.getContextSuggestions(cleanQuery, maxSuggestions * 2);
    for (const auto& ps : phraseSuggestions) {
        if (seen.find(ps.text) == seen.end() && ps.text != cleanQuery) {
            seen.insert(ps.text);
            suggestions.push_back(ps);
        }
    }

    // Sort by score descending, tie-breaking on shorter length
    std::sort(suggestions.begin(), suggestions.end(), [](const auto& a, const auto& b) {
        if (std::abs(a.score - b.score) > 0.01) return a.score > b.score;
        return a.text.length() < b.text.length();
    });

    if (suggestions.size() > static_cast<size_t>(maxSuggestions)) {
        suggestions.resize(maxSuggestions);
    }

    return suggestions;
}

std::vector<std::string> SearchEngine::getSuggestions(const std::string& query, int maxSuggestions) {
    auto detailed = getSuggestionsDetailed(query, maxSuggestions);
    std::vector<std::string> results;
    for (const auto& item : detailed) {
        results.push_back(item.text);
    }
    return results;
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

const PhraseIndex& SearchEngine::getPhraseIndex() const {
    return phraseIndex;
}

const HistoryManager& SearchEngine::getHistoryManager() const {
    return historyManager;
}
