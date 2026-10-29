#include "../include/SearchEngine.h"
#include "../include/HttpServer.h"
#include <iostream>
#include <string>

// External declaration for console loop
int runConsoleApp();

int main(int argc, char* argv[]) {
    // Check if user requested console-only mode
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--console" || arg == "-c") {
            // Run interactive console mode
            SearchEngine engine;
            if (!engine.initialize("data/documents.json", "data/history.txt")) {
                std::cerr << "[Error] Failed to initialize search engine documents.\n";
                return 1;
            }
            std::cout << "[System] Running in Console Mode...\n";
            std::cout << "Type queries, or run without --console to launch the Web API.\n";
            
            // Execute interactive loop
            std::string query;
            while (true) {
                std::cout << "\nEnter query (or 'exit' to quit): ";
                if (!std::getline(std::cin, query) || query == "exit") break;
                auto results = engine.search(query, 5);
                std::cout << "Found " << results.size() << " results:\n";
                for (size_t k = 0; k < results.size(); ++k) {
                    std::cout << " [" << (k + 1) << "] " << results[k].document.getTitle()
                              << " (Score: " << results[k].score << ")\n";
                    std::cout << "     " << results[k].document.getDescription() << "\n";
                }
            }
            return 0;
        }
    }

    // Default: Start C++ High-Performance HTTP Server
    SearchEngine engine;
    std::cout << "[System] Initializing Smart Search Engine...\n";
    if (!engine.initialize("data/documents.json", "data/history.txt")) {
        std::cerr << "[Error] Could not load documents from data/documents.json.\n";
        return 1;
    }

    int port = 8080;
    HttpServer server(port, engine);
    server.start();

    return 0;
}
