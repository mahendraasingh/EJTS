#include "../include/DocumentManager.h"
#include <fstream>
#include <sstream>
#include <iostream>
#include <cctype>

DocumentManager::DocumentManager() {}

void DocumentManager::addDocument(const Document& doc) {
    documents.push_back(doc);
    idToIndexMap[doc.getId()] = documents.size() - 1;
}

const std::vector<Document>& DocumentManager::getAllDocuments() const {
    return documents;
}

const Document* DocumentManager::getDocumentById(int id) const {
    auto it = idToIndexMap.find(id);
    if (it != idToIndexMap.end()) {
        return &documents[it->second];
    }
    return nullptr;
}

size_t DocumentManager::getDocumentCount() const {
    return documents.size();
}

void DocumentManager::clear() {
    documents.clear();
    idToIndexMap.clear();
}

// --- Lightweight C++ STL JSON Parser for documents.json ---

static void skipWhitespace(const std::string& str, size_t& pos) {
    while (pos < str.size() && std::isspace(static_cast<unsigned char>(str[pos]))) {
        pos++;
    }
}

static std::string parseString(const std::string& str, size_t& pos) {
    skipWhitespace(str, pos);
    if (pos >= str.size() || str[pos] != '"') return "";
    pos++; // skip opening quote

    std::string result = "";
    while (pos < str.size()) {
        char ch = str[pos++];
        if (ch == '\\' && pos < str.size()) {
            char next = str[pos++];
            if (next == '"') result += '"';
            else if (next == '\\') result += '\\';
            else if (next == 'n') result += '\n';
            else if (next == 't') result += '\t';
            else if (next == 'r') result += '\r';
            else result += next;
        } else if (ch == '"') {
            break; // closing quote
        } else {
            result += ch;
        }
    }
    return result;
}

static int parseInt(const std::string& str, size_t& pos) {
    skipWhitespace(str, pos);
    size_t start = pos;
    if (pos < str.size() && (str[pos] == '-' || str[pos] == '+')) {
        pos++;
    }
    while (pos < str.size() && std::isdigit(static_cast<unsigned char>(str[pos]))) {
        pos++;
    }
    if (start == pos) return 0;
    try {
        return std::stoi(str.substr(start, pos - start));
    } catch (...) {
        return 0;
    }
}

static std::vector<std::string> parseStringArray(const std::string& str, size_t& pos) {
    std::vector<std::string> list;
    skipWhitespace(str, pos);
    if (pos >= str.size() || str[pos] != '[') return list;
    pos++; // skip '['

    while (pos < str.size()) {
        skipWhitespace(str, pos);
        if (pos < str.size() && str[pos] == ']') {
            pos++;
            break;
        }
        std::string item = parseString(str, pos);
        list.push_back(item);
        skipWhitespace(str, pos);
        if (pos < str.size() && str[pos] == ',') {
            pos++;
        }
    }
    return list;
}

bool DocumentManager::loadFromJsonFile(const std::string& filepath) {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        std::cerr << "[DocumentManager] Failed to open file: " << filepath << std::endl;
        return false;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string content = buffer.str();
    file.close();

    size_t pos = 0;
    skipWhitespace(content, pos);
    if (pos >= content.size() || content[pos] != '[') {
        std::cerr << "[DocumentManager] Invalid JSON format: array expected at root." << std::endl;
        return false;
    }
    pos++; // skip '['

    clear();

    while (pos < content.size()) {
        skipWhitespace(content, pos);
        if (pos < content.size() && content[pos] == ']') {
            pos++;
            break; // End of root array
        }

        if (content[pos] == '{') {
            pos++; // enter object
            int id = 0;
            std::string title = "";
            std::string description = "";
            std::vector<std::string> keywords;
            std::string category = "General";
            std::string url = "";
            int popularity = 0;

            while (pos < content.size()) {
                skipWhitespace(content, pos);
                if (pos < content.size() && content[pos] == '}') {
                    pos++;
                    break; // end of object
                }

                std::string key = parseString(content, pos);
                skipWhitespace(content, pos);
                if (pos < content.size() && content[pos] == ':') {
                    pos++; // skip ':'
                }

                if (key == "id") {
                    id = parseInt(content, pos);
                } else if (key == "title") {
                    title = parseString(content, pos);
                } else if (key == "description") {
                    description = parseString(content, pos);
                } else if (key == "keywords") {
                    keywords = parseStringArray(content, pos);
                } else if (key == "category") {
                    category = parseString(content, pos);
                } else if (key == "url") {
                    url = parseString(content, pos);
                } else if (key == "popularity") {
                    popularity = parseInt(content, pos);
                } else {
                    // Skip unknown value (primitive or nested)
                    skipWhitespace(content, pos);
                    if (pos < content.size() && content[pos] == '"') {
                        parseString(content, pos);
                    } else {
                        while (pos < content.size() && content[pos] != ',' && content[pos] != '}') {
                            pos++;
                        }
                    }
                }

                skipWhitespace(content, pos);
                if (pos < content.size() && content[pos] == ',') {
                    pos++;
                }
            }

            if (id > 0 && !title.empty()) {
                addDocument(Document(id, title, description, keywords, category, url, popularity));
            }
        }

        skipWhitespace(content, pos);
        if (pos < content.size() && content[pos] == ',') {
            pos++;
        }
    }

    std::cout << "[DocumentManager] Successfully loaded " << documents.size() 
              << " documents from " << filepath << std::endl;
    return !documents.empty();
}
