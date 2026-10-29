#include "../include/SearchEngine.h"
#include <iostream>
#include <string>
#include <vector>
#include <iomanip>

void printDivider() {
    std::cout << "--------------------------------------------------------------------------------\n";
}

void printBanner() {
    std::cout << "\n";
    std::cout << "================================================================================\n";
    std::cout << "          SMART SEARCH ENGINE WITH AUTOCOMPLETE (C++17 DSA)                     \n";
    std::cout << "       College Capstone Project | Trie + Inverted Index + Ranking               \n";
    std::cout << "================================================================================\n";
}

void printMenu() {
    printDivider();
    std::cout << " 1. Search Documents (with Relevance Ranking)\n";
    std::cout << " 2. Real-Time Autocomplete (Trie Prefix Lookup)\n";
    std::cout << " 3. View Recent Search History\n";
    std::cout << " 4. View Top 5 Popular Searches\n";
    std::cout << " 5. Clear Search History\n";
    std::cout << " 6. Browse All Loaded Documents\n";
    std::cout << " 7. Exit\n";
    printDivider();
    std::cout << "Enter your choice (1-7): ";
}

int main() {
    printBanner();

    SearchEngine engine;
    std::cout << "[System] Initializing search engine & building indices...\n";

    if (!engine.initialize("data/documents.json", "data/history.txt")) {
        std::cerr << "[Error] Failed to initialize search engine. Ensure data/documents.json exists.\n";
        return 1;
    }

    std::cout << "[System] Successfully indexed " << engine.getDocumentManager().getDocumentCount()
              << " documents.\n";

    int choice = 0;
    std::string line;

    while (true) {
        printMenu();
        if (!(std::cin >> choice)) {
            std::cin.clear();
            std::cin.ignore(10000, '\n');
            std::cout << "[Error] Invalid input. Please enter a number between 1 and 7.\n";
            continue;
        }
        std::cin.ignore(10000, '\n'); // Consume newline

        if (choice == 1) {
            std::cout << "\nEnter Search Query: ";
            std::string query;
            std::getline(std::cin, query);

            auto results = engine.search(query, 5);

            std::cout << "\n--- Search Results for: \"" << query << "\" (" << results.size() << " found) ---\n\n";
            if (results.empty()) {
                std::cout << "  No matching documents found. Try another query or check autocomplete suggestions!\n";
            } else {
                for (size_t i = 0; i < results.size(); ++i) {
                    const auto& r = results[i];
                    std::cout << "[" << (i + 1) << "] " << r.document.getTitle() 
                              << "  (Score: " << std::fixed << std::setprecision(1) << r.score << " pts)\n";
                    std::cout << "    ID: " << r.document.getId() 
                              << " | Base Popularity: " << r.document.getPopularity() << "\n";
                    std::cout << "    Description: " << r.document.getDescription() << "\n";
                    std::cout << "    Keywords: ";
                    for (size_t k = 0; k < r.document.getKeywords().size(); ++k) {
                        std::cout << r.document.getKeywords()[k];
                        if (k + 1 < r.document.getKeywords().size()) std::cout << ", ";
                    }
                    std::cout << "\n\n";
                }
            }

        } else if (choice == 2) {
            std::cout << "\nEnter Query Prefix (e.g., 'pro', 'data', 'c++'): ";
            std::string prefix;
            std::getline(std::cin, prefix);

            auto suggestions = engine.getSuggestions(prefix, 8);
            std::cout << "\n--- Autocomplete Suggestions for prefix: \"" << prefix << "\" ---\n";
            if (suggestions.empty()) {
                std::cout << "  No suggestions found for this prefix in Trie.\n";
            } else {
                for (size_t i = 0; i < suggestions.size(); ++i) {
                    std::cout << "  " << (i + 1) << ". " << suggestions[i] << "\n";
                }
            }
            std::cout << "\n";

        } else if (choice == 3) {
            std::cout << "\n--- Recent Search History ---\n";
            auto recent = engine.getRecentSearches(10);
            if (recent.empty()) {
                std::cout << "  (No searches recorded yet)\n";
            } else {
                for (size_t i = 0; i < recent.size(); ++i) {
                    std::cout << "  " << (i + 1) << ". " << recent[i] << "\n";
                }
            }
            std::cout << "\n";

        } else if (choice == 4) {
            std::cout << "\n--- Top 5 Popular Searches ---\n";
            auto popular = engine.getPopularSearches(5);
            if (popular.empty()) {
                std::cout << "  (No search frequency data yet)\n";
            } else {
                for (size_t i = 0; i < popular.size(); ++i) {
                    std::cout << "  " << (i + 1) << ". \"" << popular[i].first 
                              << "\" -> " << popular[i].second << " search(es)\n";
                }
            }
            std::cout << "\n";

        } else if (choice == 5) {
            engine.clearHistory();
            std::cout << "\n[Success] Search history and popularity counters cleared.\n\n";

        } else if (choice == 6) {
            std::cout << "\n--- Catalog of Stored Documents (" 
                      << engine.getDocumentManager().getDocumentCount() << " total) ---\n\n";
            for (const auto& doc : engine.getDocumentManager().getAllDocuments()) {
                std::cout << " [" << doc.getId() << "] " << doc.getTitle() << "\n";
            }
            std::cout << "\n";

        } else if (choice == 7) {
            std::cout << "\nThank you for using Smart Search Engine! Goodbye.\n\n";
            break;
        } else {
            std::cout << "[Error] Please select an option from 1 to 7.\n";
        }
    }

    return 0;
}
