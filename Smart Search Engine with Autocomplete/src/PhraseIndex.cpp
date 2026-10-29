#include "../include/PhraseIndex.h"
#include "../include/Trie.h"
#include <sstream>
#include <algorithm>
#include <cctype>
#include <iomanip>

std::string QuerySuggestion::toJson() const {
    std::ostringstream ss;
    ss << "{";
    ss << "\"text\":\"";
    for (char c : text) {
        if (c == '"') ss << "\\\"";
        else if (c == '\\') ss << "\\\\";
        else ss << c;
    }
    ss << "\",";
    ss << "\"type\":\"" << type << "\",";
    ss << "\"score\":" << std::fixed << std::setprecision(1) << score;
    ss << "}";
    return ss.str();
}

PhraseIndex::PhraseIndex() {}

void PhraseIndex::clear() {
    indexedPhrases.clear();
    prefixToPhraseMap.clear();
    tokenToPhraseMap.clear();
}

size_t PhraseIndex::getPhraseCount() const {
    return indexedPhrases.size();
}

std::vector<std::string> PhraseIndex::splitWords(const std::string& text) const {
    std::vector<std::string> words;
    std::string current = "";

    for (char ch : text) {
        unsigned char uc = static_cast<unsigned char>(ch);
        // Allow alphanumeric plus '+' for C++
        if (std::isalnum(uc) || ch == '+') {
            current += static_cast<char>(std::tolower(uc));
        } else {
            if (!current.empty()) {
                words.push_back(current);
                current.clear();
            }
        }
    }
    if (!current.empty()) {
        words.push_back(current);
    }
    return words;
}

void PhraseIndex::addPhrase(const std::string& phrase, int weight) {
    std::string clean = Trie::normalize(phrase);
    if (clean.empty() || clean.length() < 2) return;

    // Check if phrase already indexed
    for (size_t i = 0; i < indexedPhrases.size(); ++i) {
        if (indexedPhrases[i].first == clean) {
            indexedPhrases[i].second += weight;
            return;
        }
    }

    size_t phraseIndex = indexedPhrases.size();
    indexedPhrases.push_back({clean, weight});

    auto words = splitWords(clean);
    if (words.empty()) return;

    // 1. Index progressive prefixes of words:
    // e.g. "machine", "machine learning", "machine learning using", etc.
    std::string runningPrefix = "";
    for (size_t i = 0; i < words.size(); ++i) {
        if (i > 0) runningPrefix += " ";
        runningPrefix += words[i];
        prefixToPhraseMap[runningPrefix].push_back(phraseIndex);
    }

    // 2. Index individual word tokens for context fallback matching
    std::unordered_set<std::string> uniqueWords(words.begin(), words.end());
    for (const auto& w : uniqueWords) {
        tokenToPhraseMap[w].push_back(phraseIndex);
    }
}

void PhraseIndex::extractNgramsFromText(const std::string& text, int baseWeight) {
    auto words = splitWords(text);
    if (words.size() < 2) return;

    // Extract bigrams, trigrams, 4-grams, and 5-grams
    for (size_t n = 2; n <= 6; ++n) {
        for (size_t i = 0; i + n <= words.size(); ++i) {
            std::string ngram = "";
            for (size_t k = 0; k < n; ++k) {
                if (k > 0) ngram += " ";
                ngram += words[i + k];
            }
            addPhrase(ngram, baseWeight);
        }
    }
}

void PhraseIndex::indexDocumentText(const std::string& title, const std::string& description,
                                     const std::vector<std::string>& keywords, int popularity) {
    int weight = 20 + (popularity / 5);

    // 1. Index full title
    addPhrase(title, weight + 30);

    // 2. Extract N-grams from title
    extractNgramsFromText(title, weight + 15);

    // 3. Index keywords and keyword combinations
    for (const auto& kw : keywords) {
        addPhrase(kw, weight + 10);
        // Also combine keyword with title context
        auto kwWords = splitWords(kw);
        if (kwWords.size() > 1) {
            extractNgramsFromText(kw, weight + 8);
        }
    }

    // 4. Extract rich phrases from description sentences
    extractNgramsFromText(description, weight);
}

std::vector<QuerySuggestion> PhraseIndex::getContextSuggestions(const std::string& query, int maxSuggestions) const {
    std::vector<QuerySuggestion> suggestions;
    std::string cleanQuery = Trie::normalize(query);
    if (cleanQuery.empty()) return suggestions;

    auto queryWords = splitWords(cleanQuery);
    if (queryWords.empty()) return suggestions;

    std::unordered_set<std::string> seenPhrases;
    std::vector<QuerySuggestion> candidates;

    // Channel 1: Exact prefix lookup in prefixToPhraseMap
    // Direct matches for "machine", "machine learning", "machine learning using", etc.
    auto itPrefix = prefixToPhraseMap.find(cleanQuery);
    if (itPrefix != prefixToPhraseMap.end()) {
        for (size_t idx : itPrefix->second) {
            if (idx >= indexedPhrases.size()) continue;
            const auto& item = indexedPhrases[idx];
            if (seenPhrases.find(item.first) == seenPhrases.end()) {
                seenPhrases.insert(item.first);

                double score = 100.0 + item.second;
                if (item.first == cleanQuery) score += 5.0; // exact complete match

                candidates.push_back({
                    item.first,
                    (item.first == cleanQuery ? "exact_phrase" : "phrase_continuation"),
                    score
                });
            }
        }
    }

    // Channel 2: Scan for phrases that start with or contain cleanQuery as a substring
    for (const auto& item : indexedPhrases) {
        if (seenPhrases.find(item.first) != seenPhrases.end()) continue;

        if (item.first.rfind(cleanQuery, 0) == 0) { // starts with cleanQuery
            seenPhrases.insert(item.first);
            candidates.push_back({
                item.first,
                "phrase_continuation",
                90.0 + item.second
            });
        } else if (item.first.find(cleanQuery) != std::string::npos) { // contains as substring
            seenPhrases.insert(item.first);
            candidates.push_back({
                item.first,
                "context_match",
                70.0 + item.second
            });
        }
    }

    // Channel 3: Context-Aware Multi-Word Token Fallback
    // If user typed multiple words and we need more suggestions, find phrases that contain
    // the preceding context words while matching the latest word!
    if (queryWords.size() > 1 && candidates.size() < static_cast<size_t>(maxSuggestions * 2)) {
        std::string latestWord = queryWords.back();
        std::vector<std::string> contextWords(queryWords.begin(), queryWords.end() - 1);

        for (const auto& item : indexedPhrases) {
            if (seenPhrases.find(item.first) != seenPhrases.end()) continue;

            auto itemWords = splitWords(item.first);
            std::unordered_set<std::string> itemWordSet(itemWords.begin(), itemWords.end());

            // Check how many context words are present
            int matchedContextCount = 0;
            for (const auto& cw : contextWords) {
                if (itemWordSet.find(cw) != itemWordSet.end()) {
                    matchedContextCount++;
                }
            }

            // Check if latest word is matched (as prefix or full word)
            bool latestWordMatched = false;
            for (const auto& iw : itemWords) {
                if (iw.rfind(latestWord, 0) == 0) {
                    latestWordMatched = true;
                    break;
                }
            }

            if (matchedContextCount > 0 && latestWordMatched) {
                seenPhrases.insert(item.first);
                double matchRatio = static_cast<double>(matchedContextCount + 1) / queryWords.size();
                double score = 50.0 + (matchRatio * 35.0) + (item.second * 0.2);

                candidates.push_back({
                    item.first,
                    "context_match",
                    score
                });
            }
        }
    }

    // Channel 4: General Token Overlap Fallback (when query is not in index)
    if (candidates.size() < static_cast<size_t>(maxSuggestions)) {
        for (const auto& item : indexedPhrases) {
            if (seenPhrases.find(item.first) != seenPhrases.end()) continue;

            auto itemWords = splitWords(item.first);
            std::unordered_set<std::string> itemWordSet(itemWords.begin(), itemWords.end());

            int matchCount = 0;
            for (const auto& qw : queryWords) {
                if (itemWordSet.find(qw) != itemWordSet.end()) {
                    matchCount++;
                }
            }

            if (matchCount >= 2 || (matchCount >= 1 && queryWords.size() == 1)) {
                seenPhrases.insert(item.first);
                double score = 30.0 + (matchCount * 15.0) + (item.second * 0.1);
                candidates.push_back({
                    item.first,
                    "context_match",
                    score
                });
            }
        }
    }

    // Sort candidates by score descending
    std::sort(candidates.begin(), candidates.end(), [](const auto& a, const auto& b) {
        if (a.score != b.score) {
            return a.score > b.score;
        }
        return a.text.length() < b.text.length(); // Prefer concise completions when tied
    });

    // Extract top maxSuggestions
    size_t limit = std::min(static_cast<size_t>(maxSuggestions), candidates.size());
    for (size_t i = 0; i < limit; ++i) {
        suggestions.push_back(candidates[i]);
    }

    return suggestions;
}
