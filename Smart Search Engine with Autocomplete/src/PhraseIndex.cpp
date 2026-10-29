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

std::vector<std::string> PhraseIndex::splitWords(const std::string& text) {
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

bool PhraseIndex::isDanglingFragment(const std::string& phrase, const std::string& query) {
    static const std::unordered_set<std::string> prepositions = {
        "in", "for", "with", "using", "of", "to", "by", "at", "and", "or", "a", "an", "the", "as"
    };
    auto words = PhraseIndex::splitWords(phrase);
    if (words.empty()) return false;
    const std::string& lastWord = words.back();
    if (prepositions.find(lastWord) != prepositions.end()) {
        auto queryWords = PhraseIndex::splitWords(query);
        if (queryWords.empty() || queryWords.back() != lastWord) {
            return true;
        }
    }
    return false;
}

void PhraseIndex::indexDocumentText(const std::string& title, const std::string& description,
                                     const std::vector<std::string>& keywords, int popularity) {
    int weight = 30 + (popularity / 3);

    // 1. Index full title
    addPhrase(title, weight + 40);

    // 2. Extract meaningful N-grams from title
    extractNgramsFromText(title, weight + 20);

    // 3. Index keywords and keyword combinations
    for (const auto& kw : keywords) {
        addPhrase(kw, weight + 25);
        auto kwWords = splitWords(kw);
        if (kwWords.size() > 1) {
            extractNgramsFromText(kw, weight + 15);
        }
    }
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
                if (isDanglingFragment(item.first, cleanQuery)) continue;
                seenPhrases.insert(item.first);

                double weightBonus = std::log1p(static_cast<double>(std::max(0, item.second))) * 6.0;
                double score = 160.0 + weightBonus;
                if (item.first == cleanQuery) score += 5.0; // exact complete match

                candidates.push_back({
                    item.first,
                    (item.first == cleanQuery ? "exact_phrase" : "phrase_continuation"),
                    score
                });
            }
        }
    }

    // Channel 2: Phrase prefix match across all indexed phrases
    // If the phrase begins with cleanQuery (e.g. "machine learning..." begins with "machine")
    for (const auto& item : indexedPhrases) {
        if (seenPhrases.find(item.first) != seenPhrases.end()) continue;
        if (isDanglingFragment(item.first, cleanQuery)) continue;

        if (item.first.rfind(cleanQuery, 0) == 0) { // starts with cleanQuery
            seenPhrases.insert(item.first);
            double weightBonus = std::log1p(static_cast<double>(std::max(0, item.second))) * 6.0;
            candidates.push_back({
                item.first,
                "phrase_continuation",
                150.0 + weightBonus
            });
        }
    }

    // Channel 3: Word-boundary prefix match for non-initial words
    // E.g., user typed "c++" or "pro", find phrases where a word inside starts with cleanQuery
    for (const auto& item : indexedPhrases) {
        if (seenPhrases.find(item.first) != seenPhrases.end()) continue;
        if (isDanglingFragment(item.first, cleanQuery)) continue;

        auto itemWords = splitWords(item.first);
        bool wordPrefixMatch = false;
        for (const auto& iw : itemWords) {
            if (iw.rfind(cleanQuery, 0) == 0) {
                wordPrefixMatch = true;
                break;
            }
        }

        if (wordPrefixMatch) {
            seenPhrases.insert(item.first);
            double weightBonus = std::log1p(static_cast<double>(std::max(0, item.second))) * 4.0;
            candidates.push_back({
                item.first,
                "context_match",
                45.0 + weightBonus
            });
        }
    }

    // Channel 4: Context-Aware Multi-Word Token Fallback
    // If user typed multiple words (e.g. "machine learning using c++", "c++ data structures for beginners")
    // Match phrases containing the context words and matching the latest word
    if (queryWords.size() > 1) {
        std::string latestWord = queryWords.back();
        std::vector<std::string> contextWords(queryWords.begin(), queryWords.end() - 1);

        for (const auto& item : indexedPhrases) {
            if (seenPhrases.find(item.first) != seenPhrases.end()) continue;
            if (isDanglingFragment(item.first, cleanQuery)) continue;

            auto itemWords = splitWords(item.first);
            std::unordered_set<std::string> itemWordSet(itemWords.begin(), itemWords.end());

            int matchedContextCount = 0;
            for (const auto& cw : contextWords) {
                if (itemWordSet.find(cw) != itemWordSet.end()) {
                    matchedContextCount++;
                }
            }

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
                double weightBonus = std::log1p(static_cast<double>(std::max(0, item.second))) * 5.0;
                double score = 90.0 + (matchRatio * 55.0) + weightBonus;

                candidates.push_back({
                    item.first,
                    "context_match",
                    score
                });
            }
        }
    }

    // Channel 5: Multi-word general token overlap fallback
    // When the complete phrase does not exist verbatim, rank by token overlap
    if (candidates.size() < static_cast<size_t>(maxSuggestions * 2)) {
        for (const auto& item : indexedPhrases) {
            if (seenPhrases.find(item.first) != seenPhrases.end()) continue;
            if (isDanglingFragment(item.first, cleanQuery)) continue;

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
                double overlapRatio = static_cast<double>(matchCount) / queryWords.size();
                double weightBonus = std::log1p(static_cast<double>(std::max(0, item.second))) * 3.0;
                double score = 30.0 + (overlapRatio * 35.0) + weightBonus;
                candidates.push_back({
                    item.first,
                    "context_match",
                    score
                });
            }
        }
    }

    // Sort candidates by score descending, tie-breaking on shorter phrase length
    std::sort(candidates.begin(), candidates.end(), [](const auto& a, const auto& b) {
        if (std::abs(a.score - b.score) > 0.01) {
            return a.score > b.score;
        }
        return a.text.length() < b.text.length();
    });

    // Extract top maxSuggestions
    size_t limit = std::min(static_cast<size_t>(maxSuggestions), candidates.size());
    for (size_t i = 0; i < limit; ++i) {
        suggestions.push_back(candidates[i]);
    }

    return suggestions;
}
