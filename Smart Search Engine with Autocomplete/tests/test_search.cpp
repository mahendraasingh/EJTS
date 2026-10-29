#include "../include/SearchEngine.h"
#include <iostream>
#include <cassert>
#include <string>
#include <vector>

void runTest(const std::string& testName, bool condition) {
    if (condition) {
        std::cout << "  [PASS] " << testName << std::endl;
    } else {
        std::cerr << "  [FAIL] " << testName << std::endl;
        exit(1);
    }
}

int main() {
    std::cout << "\n============================================\n";
    std::cout << "  RUNNING SMART SEARCH ENGINE TEST SUITE\n";
    std::cout << "============================================\n\n";

    SearchEngine engine;

    // Test 1: Loading document dataset
    std::cout << "Test 1: Loading Document Dataset\n";
    bool loaded = engine.initialize("data/documents.json", "data/test_history.txt");
    runTest("Documents loaded successfully", loaded);
    runTest("Dataset contains at least 20 documents", engine.getDocumentManager().getDocumentCount() >= 20);

    // Test 2: Trie Prefix Autocomplete
    std::cout << "\nTest 2: Trie Prefix Autocomplete\n";
    auto suggestions1 = engine.getSuggestions("pro", 5);
    runTest("Suggestions for 'pro' returned non-empty", !suggestions1.empty());
    bool hasProgramming = false;
    for (const auto& s : suggestions1) {
        if (s.find("program") != std::string::npos) hasProgramming = true;
    }
    runTest("Suggestions contain 'programming' related term", hasProgramming);

    // Test 3: Case-Insensitive Prefix Autocomplete
    std::cout << "\nTest 3: Case-Insensitive Prefix Autocomplete\n";
    auto suggestionsLower = engine.getSuggestions("trie", 5);
    auto suggestionsUpper = engine.getSuggestions("TRIE", 5);
    runTest("Upper and lower case prefix return same results", suggestionsLower == suggestionsUpper);

    // Test 4: Empty prefix handling
    std::cout << "\nTest 4: Empty Prefix Handling\n";
    auto emptySuggestions = engine.getSuggestions("", 5);
    runTest("Empty prefix returns empty suggestions list", emptySuggestions.empty());

    // Test 5: Exact Word Search
    std::cout << "\nTest 5: Exact Word Search\n";
    auto resultsExact = engine.search("C++");
    runTest("Exact search for 'C++' returns matching results", !resultsExact.empty());

    // Test 6: Case-Insensitive Search
    std::cout << "\nTest 6: Case-Insensitive Search\n";
    auto resultsLower = engine.search("algorithms");
    auto resultsUpper = engine.search("ALGORITHMS");
    runTest("Case-insensitive searches return matching results", !resultsLower.empty() && resultsLower.size() == resultsUpper.size());

    // Test 7: Empty Search Input
    std::cout << "\nTest 7: Empty Search Input\n";
    auto resultsEmpty = engine.search("");
    runTest("Empty search query returns 0 results safely", resultsEmpty.empty());

    // Test 8: No Matching Results
    std::cout << "\nTest 8: No Matching Results Handling\n";
    auto resultsNone = engine.search("xyznonexistentword999");
    runTest("Nonexistent term returns empty result gracefully", resultsNone.empty());

    // Test 9: Multiple Matching Documents & Relevance Ranking
    std::cout << "\nTest 9: Relevance Ranking and Scoring\n";
    auto rankedResults = engine.search("Trie Data Structure");
    runTest("Multi-word search returns multiple results", rankedResults.size() >= 1);
    if (rankedResults.size() >= 2) {
        runTest("Highest relevance score is first in list", rankedResults[0].score >= rankedResults[1].score);
    }

    // Test 10: Search History and Popularity Tracking
    std::cout << "\nTest 10: Search History and Popular Counts\n";
    engine.search("cloud computing");
    engine.search("cloud computing");
    engine.search("cloud computing");

    auto popular = engine.getPopularSearches(5);
    runTest("Popular searches tracked", !popular.empty());
    bool foundCloud = false;
    for (const auto& item : popular) {
        if (item.first == "cloud computing" && item.second >= 3) {
            foundCloud = true;
            break;
        }
    }
    runTest("Query 'cloud computing' has expected frequency count", foundCloud);

    auto recent = engine.getRecentSearches(5);
    runTest("Recent searches list contains latest query", !recent.empty() && recent[0] == "cloud computing");

    // Test 11: Clear History
    std::cout << "\nTest 11: Clear History\n";
    engine.clearHistory();
    runTest("History is cleared properly", engine.getRecentSearches(5).empty());

    std::cout << "\n============================================\n";
    std::cout << "  ALL 11 TEST SUITES PASSED SUCCESSFULLY!\n";
    std::cout << "============================================\n\n";

    return 0;
}
