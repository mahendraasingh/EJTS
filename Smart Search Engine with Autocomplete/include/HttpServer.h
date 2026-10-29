#ifndef HTTP_SERVER_H
#define HTTP_SERVER_H

#include "SearchEngine.h"
#include <string>
#include <functional>

/**
 * @brief Lightweight, zero-dependency HTTP REST API server using Windows Sockets (WinSock2).
 * 
 * Exposes REST endpoints for real-time frontend integration without requiring
 * external dependencies or package managers.
 */
class HttpServer {
private:
    int port;
    SearchEngine& searchEngine;
    bool isRunning;

    // Helper functions for parsing HTTP requests
    void handleClient(uintptr_t clientSocket);
    std::string routeRequest(const std::string& method, const std::string& pathAndQuery);
    std::string getQueryParam(const std::string& queryStr, const std::string& key) const;
    std::string urlDecode(const std::string& in) const;
    std::string readFileContent(const std::string& filepath) const;
    std::string getContentType(const std::string& path) const;

public:
    HttpServer(int port, SearchEngine& engine);
    ~HttpServer();

    /**
     * @brief Starts the HTTP server listening on the configured port.
     */
    void start();

    /**
     * @brief Stops the server.
     */
    void stop();
};

#endif // HTTP_SERVER_H
