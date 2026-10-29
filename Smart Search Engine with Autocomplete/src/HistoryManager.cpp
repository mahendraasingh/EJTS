#include "../include/HistoryManager.h"
#include "../include/Trie.h"
#include <fstream>
#include <sstream>
#include <algorithm>
#include <iostream>

HistoryManager::HistoryManager(size_t maxCapacity, const std::string& filepath)
    : maxHistoryCapacity(maxCapacity), persistentFilePath(filepath) {
    loadFromFile();
}

void HistoryManager::recordSearch(const std::string& query) {
    std::string clean = Trie::normalize(query);
    if (clean.empty()) return;

    // 1. Remove if already exists in recent to avoid duplicates and bring to front
    auto it = std::find(recentSearches.begin(), recentSearches.end(), clean);
    if (it != recentSearches.end()) {
        recentSearches.erase(it);
    }
    recentSearches.push_front(clean);

    // Maintain max history capacity
    while (recentSearches.size() > maxHistoryCapacity) {
        recentSearches.pop_back();
    }

    // 2. Increment frequency counter
    searchFrequencies[clean]++;

    // 3. Persist update
    saveToFile();
}

std::vector<std::string> HistoryManager::getRecentSearches(int limit) const {
    std::vector<std::string> results;
    int count = 0;
    for (const auto& query : recentSearches) {
        if (count >= limit) break;
        results.push_back(query);
        count++;
    }
    return results;
}

std::vector<std::pair<std::string, int>> HistoryManager::getPopularSearches(int limit) const {
    std::vector<std::pair<std::string, int>> pairs(searchFrequencies.begin(), searchFrequencies.end());

    std::sort(pairs.begin(), pairs.end(), [](const auto& a, const auto& b) {
        if (a.second != b.second) {
            return a.second > b.second; // Higher count first
        }
        return a.first < b.first;
    });

    std::vector<std::pair<std::string, int>> topList;
    int count = 0;
    for (const auto& item : pairs) {
        if (count >= limit) break;
        topList.push_back(item);
        count++;
    }
    return topList;
}

void HistoryManager::clearHistory() {
    recentSearches.clear();
    searchFrequencies.clear();
    saveToFile();
}

bool HistoryManager::saveToFile() const {
    std::ofstream file(persistentFilePath);
    if (!file.is_open()) {
        return false;
    }

    // Save recent searches section
    file << "[RECENT]\n";
    for (const auto& item : recentSearches) {
        file << item << "\n";
    }

    // Save frequencies section
    file << "[FREQUENCIES]\n";
    for (const auto& pair : searchFrequencies) {
        file << pair.first << "|" << pair.second << "\n";
    }

    file.close();
    return true;
}

bool HistoryManager::loadFromFile() {
    std::ifstream file(persistentFilePath);
    if (!file.is_open()) {
        return false; // File does not exist yet (normal on fresh start)
    }

    recentSearches.clear();
    searchFrequencies.clear();

    std::string line;
    std::string currentSection = "";

    while (std::getline(file, line)) {
        if (line.empty()) continue;
        if (line == "[RECENT]" || line == "[FREQUENCIES]") {
            currentSection = line;
            continue;
        }

        if (currentSection == "[RECENT]") {
            if (recentSearches.size() < maxHistoryCapacity) {
                recentSearches.push_back(line);
            }
        } else if (currentSection == "[FREQUENCIES]") {
            size_t delim = line.find('|');
            if (delim != std::string::npos) {
                std::string q = line.substr(0, delim);
                try {
                    int freq = std::stoi(line.substr(delim + 1));
                    searchFrequencies[q] = freq;
                } catch (...) {
                    // Ignore parse error
                }
            }
        }
    }

    file.close();
    return true;
}

std::string HistoryManager::getHistoryJson() const {
    std::ostringstream ss;
    ss << "[";
    auto recent = getRecentSearches(10);
    for (size_t i = 0; i < recent.size(); ++i) {
        ss << "\"" << recent[i] << "\"";
        if (i + 1 < recent.size()) {
            ss << ",";
        }
    }
    ss << "]";
    return ss.str();
}

std::string HistoryManager::getPopularJson() const {
    std::ostringstream ss;
    ss << "[";
    auto popular = getPopularSearches(5);
    for (size_t i = 0; i < popular.size(); ++i) {
        ss << "{\"query\":\"" << popular[i].first << "\",\"count\":" << popular[i].second << "}";
        if (i + 1 < popular.size()) {
            ss << ",";
        }
    }
    ss << "]";
    return ss.str();
}
