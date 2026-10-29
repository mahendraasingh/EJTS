#include "../include/HttpServer.h"
#include <iostream>
#include <sstream>
#include <fstream>
#include <vector>
#include <thread>
#include <cstring>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
typedef int socklen_t;
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#define closesocket close
typedef int SOCKET;
#define INVALID_SOCKET -1
#define SOCKET_ERROR -1
#endif

HttpServer::HttpServer(int port, SearchEngine& engine)
    : port(port), searchEngine(engine), isRunning(false) {}

HttpServer::~HttpServer() {
    stop();
}

std::string HttpServer::urlDecode(const std::string& in) const {
    std::string out = "";
    out.reserve(in.size());
    for (size_t i = 0; i < in.size(); ++i) {
        if (in[i] == '%') {
            if (i + 2 < in.size()) {
                int hexVal = 0;
                std::istringstream hexStream(in.substr(i + 1, 2));
                if (hexStream >> std::hex >> hexVal) {
                    out += static_cast<char>(hexVal);
                    i += 2;
                } else {
                    out += '%';
                }
            } else {
                out += '%';
            }
        } else if (in[i] == '+') {
            out += ' ';
        } else {
            out += in[i];
        }
    }
    return out;
}

std::string HttpServer::getQueryParam(const std::string& queryStr, const std::string& key) const {
    std::string searchKey = key + "=";
    size_t pos = queryStr.find(searchKey);
    if (pos == std::string::npos) return "";

    size_t start = pos + searchKey.length();
    size_t end = queryStr.find('&', start);
    if (end == std::string::npos) {
        return urlDecode(queryStr.substr(start));
    }
    return urlDecode(queryStr.substr(start, end - start));
}

std::string HttpServer::readFileContent(const std::string& filepath) const {
    std::ifstream file(filepath, std::ios::in | std::ios::binary);
    if (!file.is_open()) return "";
    std::ostringstream ss;
    ss << file.rdbuf();
    return ss.str();
}

std::string HttpServer::getContentType(const std::string& path) const {
    if (path.rfind(".html") != std::string::npos || path == "/") return "text/html; charset=utf-8";
    if (path.rfind(".css") != std::string::npos) return "text/css; charset=utf-8";
    if (path.rfind(".js") != std::string::npos) return "application/javascript; charset=utf-8";
    if (path.rfind(".json") != std::string::npos) return "application/json; charset=utf-8";
    return "text/plain; charset=utf-8";
}

std::string HttpServer::routeRequest(const std::string& method, const std::string& pathAndQuery) {
    // 1. Separate path and query string
    std::string path = pathAndQuery;
    std::string queryString = "";
    size_t qPos = pathAndQuery.find('?');
    if (qPos != std::string::npos) {
        path = pathAndQuery.substr(0, qPos);
        queryString = pathAndQuery.substr(qPos + 1);
    }

    // CORS preflight handler
    if (method == "OPTIONS") {
        return "HTTP/1.1 204 No Content\r\n"
               "Access-Control-Allow-Origin: *\r\n"
               "Access-Control-Allow-Methods: GET, DELETE, OPTIONS\r\n"
               "Access-Control-Allow-Headers: Content-Type\r\n"
               "Content-Length: 0\r\n\r\n";
    }

    std::ostringstream responseHeaders;
    std::string responseBody = "";

    // 2. API Endpoints
    if (path == "/api/suggest" && method == "GET") {
        std::string query = getQueryParam(queryString, "q");
        auto suggestions = searchEngine.getSuggestions(query, 8);

        std::ostringstream json;
        json << "[";
        for (size_t i = 0; i < suggestions.size(); ++i) {
            json << "\"" << suggestions[i] << "\"";
            if (i + 1 < suggestions.size()) json << ",";
        }
        json << "]";
        responseBody = json.str();

        responseHeaders << "HTTP/1.1 200 OK\r\n"
                        << "Content-Type: application/json; charset=utf-8\r\n"
                        << "Access-Control-Allow-Origin: *\r\n"
                        << "Content-Length: " << responseBody.size() << "\r\n\r\n";
        return responseHeaders.str() + responseBody;

    } else if (path == "/api/search" && method == "GET") {
        std::string query = getQueryParam(queryString, "q");
        auto results = searchEngine.search(query, 10);

        std::ostringstream json;
        json << "{\"query\":\"" << query << "\",\"count\":" << results.size() << ",\"results\":[";
        for (size_t i = 0; i < results.size(); ++i) {
            json << results[i].toJson();
            if (i + 1 < results.size()) json << ",";
        }
        json << "]}";
        responseBody = json.str();

        responseHeaders << "HTTP/1.1 200 OK\r\n"
                        << "Content-Type: application/json; charset=utf-8\r\n"
                        << "Access-Control-Allow-Origin: *\r\n"
                        << "Content-Length: " << responseBody.size() << "\r\n\r\n";
        return responseHeaders.str() + responseBody;

    } else if (path == "/api/popular" && method == "GET") {
        responseBody = searchEngine.getHistoryManager().getPopularJson();
        responseHeaders << "HTTP/1.1 200 OK\r\n"
                        << "Content-Type: application/json; charset=utf-8\r\n"
                        << "Access-Control-Allow-Origin: *\r\n"
                        << "Content-Length: " << responseBody.size() << "\r\n\r\n";
        return responseHeaders.str() + responseBody;

    } else if (path == "/api/history" && method == "GET") {
        responseBody = searchEngine.getHistoryManager().getHistoryJson();
        responseHeaders << "HTTP/1.1 200 OK\r\n"
                        << "Content-Type: application/json; charset=utf-8\r\n"
                        << "Access-Control-Allow-Origin: *\r\n"
                        << "Content-Length: " << responseBody.size() << "\r\n\r\n";
        return responseHeaders.str() + responseBody;

    } else if (path == "/api/history" && method == "DELETE") {
        searchEngine.clearHistory();
        responseBody = "{\"status\":\"success\",\"message\":\"Search history successfully cleared.\"}";
        responseHeaders << "HTTP/1.1 200 OK\r\n"
                        << "Content-Type: application/json; charset=utf-8\r\n"
                        << "Access-Control-Allow-Origin: *\r\n"
                        << "Content-Length: " << responseBody.size() << "\r\n\r\n";
        return responseHeaders.str() + responseBody;

    // 3. Static File Serving (frontend/)
    } else {
        std::string localFilePath = "frontend/index.html";
        if (path == "/style.css") localFilePath = "frontend/style.css";
        else if (path == "/script.js") localFilePath = "frontend/script.js";
        else if (path != "/" && path != "/index.html") {
            localFilePath = "frontend" + path;
        }

        responseBody = readFileContent(localFilePath);
        if (!responseBody.empty()) {
            responseHeaders << "HTTP/1.1 200 OK\r\n"
                            << "Content-Type: " << getContentType(localFilePath) << "\r\n"
                            << "Content-Length: " << responseBody.size() << "\r\n\r\n";
            return responseHeaders.str() + responseBody;
        }
    }

    // 404 Not Found
    responseBody = "{\"error\":\"Resource not found\"}";
    return "HTTP/1.1 404 Not Found\r\n"
           "Content-Type: application/json\r\n"
           "Content-Length: " + std::to_string(responseBody.size()) + "\r\n\r\n" + responseBody;
}

void HttpServer::handleClient(uintptr_t clientSocketRaw) {
    SOCKET clientSocket = static_cast<SOCKET>(clientSocketRaw);
    char buffer[4096];
    int bytesReceived = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);

    if (bytesReceived > 0) {
        buffer[bytesReceived] = '\0';
        std::string requestStr(buffer);

        std::istringstream reqStream(requestStr);
        std::string method, pathAndQuery, httpVersion;
        reqStream >> method >> pathAndQuery >> httpVersion;

        if (!method.empty() && !pathAndQuery.empty()) {
            std::string response = routeRequest(method, pathAndQuery);
            send(clientSocket, response.c_str(), static_cast<int>(response.length()), 0);
        }
    }

    closesocket(clientSocket);
}

void HttpServer::start() {
#ifdef _WIN32
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "[HttpServer] WSAStartup failed.\n";
        return;
    }
#endif

    SOCKET serverSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (serverSocket == INVALID_SOCKET) {
        std::cerr << "[HttpServer] Failed to create socket.\n";
        return;
    }

    // Allow port reuse
    int opt = 1;
    setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&opt), sizeof(opt));

    sockaddr_in serverAddr{};
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(static_cast<u_short>(port));

    if (bind(serverSocket, reinterpret_cast<sockaddr*>(&serverAddr), sizeof(serverAddr)) == SOCKET_ERROR) {
        std::cerr << "[HttpServer] Bind failed on port " << port << ".\n";
        closesocket(serverSocket);
        return;
    }

    if (listen(serverSocket, 10) == SOCKET_ERROR) {
        std::cerr << "[HttpServer] Listen failed.\n";
        closesocket(serverSocket);
        return;
    }

    isRunning = true;
    std::cout << "\n============================================================\n";
    std::cout << "  SMART SEARCH ENGINE HTTP SERVER RUNNING                   \n";
    std::cout << "  Backend API:  http://localhost:" << port << "/api/search?q=c++\n";
    std::cout << "  Web UI App:   http://localhost:" << port << "/\n";
    std::cout << "  Press Ctrl+C in terminal to stop server                   \n";
    std::cout << "============================================================\n\n";

    while (isRunning) {
        sockaddr_in clientAddr{};
        socklen_t clientLen = sizeof(clientAddr);
        SOCKET clientSocket = accept(serverSocket, reinterpret_cast<sockaddr*>(&clientAddr), &clientLen);

        if (clientSocket != INVALID_SOCKET) {
            // Process request in lightweight detached thread for concurrency
            std::thread(&HttpServer::handleClient, this, static_cast<uintptr_t>(clientSocket)).detach();
        }
    }

    closesocket(serverSocket);
#ifdef _WIN32
    WSACleanup();
#endif
}

void HttpServer::stop() {
    isRunning = false;
}
