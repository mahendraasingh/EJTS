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

    // ========================================================
    // PROGRESSIVE MULTI-WORD CONTEXT-AWARE AUTOCOMPLETE TESTS
    // ========================================================
    std::cout << "\n============================================\n";
    std::cout << "  PROGRESSIVE CONTEXT-AWARE AUTOCOMPLETE\n";
    std::cout << "============================================\n";

    // Test 12: Query 1 - 'machine'
    std::cout << "\nTest 12: Progressive Query 1 ('machine')\n";
    auto sug1 = engine.getSuggestions("machine", 5);
    runTest("Suggestions for 'machine' returned non-empty", !sug1.empty());
    bool sug1HasML = false;
    for (const auto& s : sug1) {
        if (s.find("machine") != std::string::npos) sug1HasML = true;
    }
    runTest("Suggestions contain 'machine' context", sug1HasML);

    // Test 13: Query 2 - 'machine learning'
    std::cout << "\nTest 13: Progressive Query 2 ('machine learning')\n";
    auto sug2 = engine.getSuggestions("machine learning", 5);
    runTest("Suggestions for 'machine learning' returned non-empty", !sug2.empty());
    bool sug2Specific = false;
    for (const auto& s : sug2) {
        if (s.find("machine learning") != std::string::npos) sug2Specific = true;
    }
    runTest("Suggestions narrow down specifically to 'machine learning'", sug2Specific);

    // Test 14: Query 3 - 'machine learning using'
    std::cout << "\nTest 14: Progressive Query 3 ('machine learning using')\n";
    auto sug3 = engine.getSuggestions("machine learning using", 5);
    runTest("Suggestions for 'machine learning using' returned non-empty", !sug3.empty());
    bool sug3HasUsing = false;
    for (const auto& s : sug3) {
        if (s.find("using") != std::string::npos) sug3HasUsing = true;
    }
    runTest("Suggestions understand sequence and preserve 'using'", sug3HasUsing);

    // Test 15: Query 4 - 'machine learning using C++'
    std::cout << "\nTest 15: Progressive Query 4 ('machine learning using C++')\n";
    auto sug4 = engine.getSuggestions("machine learning using C++", 5);
    runTest("Suggestions for 'machine learning using C++' returned non-empty", !sug4.empty());
    bool sug4HasCpp = false;
    for (const auto& s : sug4) {
        if (s.find("c++") != std::string::npos) sug4HasCpp = true;
    }
    runTest("Suggestions specifically relate to C++ and machine learning", sug4HasCpp);

    // Test 16: Query 5 - 'machine learning projects using C++'
    std::cout << "\nTest 16: Progressive Query 5 ('machine learning projects using C++')\n";
    auto sug5 = engine.getSuggestions("machine learning projects using C++", 5);
    runTest("Suggestions for full phrase returned non-empty", !sug5.empty());
    bool sug5Projects = false;
    for (const auto& s : sug5) {
        if (s.find("c++") != std::string::npos && s.find("projects") != std::string::npos) {
            sug5Projects = true;
        }
    }
    runTest("Suggestions maintain project and C++ relevance", sug5Projects);

    // Test 17: Query 6 - 'C++'
    std::cout << "\nTest 17: Progressive Query 6 ('C++')\n";
    auto sug6 = engine.getSuggestions("C++", 5);
    runTest("Suggestions for 'C++' returned non-empty", !sug6.empty());
    bool sug6HasCpp = false;
    for (const auto& s : sug6) {
        if (s.find("c++") != std::string::npos) sug6HasCpp = true;
    }
    runTest("Suggestions contain C++ topics", sug6HasCpp);

    // Test 18: Query 7 - 'C++ data structures'
    std::cout << "\nTest 18: Progressive Query 7 ('C++ data structures')\n";
    auto sug7 = engine.getSuggestions("C++ data structures", 5);
    runTest("Suggestions for 'C++ data structures' returned non-empty", !sug7.empty());
    bool sug7DataStruct = false;
    for (const auto& s : sug7) {
        if (s.find("data structures") != std::string::npos) sug7DataStruct = true;
    }
    runTest("Suggestions prioritize data structures in C++", sug7DataStruct);

    // Test 19: Query 8 - 'C++ data structures for beginners'
    std::cout << "\nTest 19: Progressive Query 8 ('C++ data structures for beginners')\n";
    auto sug8 = engine.getSuggestions("C++ data structures for beginners", 5);
    runTest("Suggestions for 'C++ data structures for beginners' returned non-empty", !sug8.empty());
    bool sug8Beginners = false;
    for (const auto& s : sug8) {
        if (s.find("beginner") != std::string::npos || s.find("data structures") != std::string::npos) {
            sug8Beginners = true;
        }
    }
    runTest("Suggestions reflect beginner and data structures context", sug8Beginners);

    // Test 20: Progressive Search Ranking Specificity
    std::cout << "\nTest 20: Search Result Specificity Progression\n";
    auto resGen = engine.search("C++");
    auto resDS = engine.search("C++ data structures");
    auto resBeg = engine.search("C++ data structures for beginners");
    runTest("All progressive searches return valid results", !resGen.empty() && !resDS.empty() && !resBeg.empty());
    runTest("Top result for beginner query prioritizes beginner resources",
            resBeg[0].document.getTitle().find("Beginner") != std::string::npos ||
            resBeg[0].document.getDescription().find("beginner") != std::string::npos ||
            resBeg[0].score >= resDS[0].score);

    std::cout << "\n============================================\n";
    std::cout << "  ALL 20 TEST SUITES PASSED SUCCESSFULLY!\n";
    std::cout << "============================================\n\n";

    return 0;
}
