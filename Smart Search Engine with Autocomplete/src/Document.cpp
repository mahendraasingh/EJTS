#include "../include/Document.h"
#include <sstream>

Document::Document()
    : id(0), title(""), description(""), keywords({}), category("General"), url(""), popularity(0) {}

Document::Document(int id, const std::string& title, const std::string& description,
                   const std::vector<std::string>& keywords, const std::string& category,
                   const std::string& url, int popularity)
    : id(id), title(title), description(description), keywords(keywords),
      category(category), url(url), popularity(popularity) {}

int Document::getId() const {
    return id;
}

const std::string& Document::getTitle() const {
    return title;
}

const std::string& Document::getDescription() const {
    return description;
}

const std::vector<std::string>& Document::getKeywords() const {
    return keywords;
}

const std::string& Document::getCategory() const {
    return category;
}

const std::string& Document::getUrl() const {
    return url;
}

int Document::getPopularity() const {
    return popularity;
}

void Document::setId(int newId) {
    id = newId;
}

void Document::setTitle(const std::string& newTitle) {
    title = newTitle;
}

void Document::setDescription(const std::string& newDescription) {
    description = newDescription;
}

void Document::setKeywords(const std::vector<std::string>& newKeywords) {
    keywords = newKeywords;
}

void Document::setCategory(const std::string& newCategory) {
    category = newCategory;
}

void Document::setUrl(const std::string& newUrl) {
    url = newUrl;
}

void Document::setPopularity(int newPopularity) {
    popularity = newPopularity;
}

// Helper to escape JSON string values safely
static std::string escapeJson(const std::string& input) {
    std::ostringstream ss;
    for (char c : input) {
        if (c == '"') ss << "\\\"";
        else if (c == '\\') ss << "\\\\";
        else if (c == '\b') ss << "\\b";
        else if (c == '\f') ss << "\\f";
        else if (c == '\n') ss << "\\n";
        else if (c == '\r') ss << "\\r";
        else if (c == '\t') ss << "\\t";
        else ss << c;
    }
    return ss.str();
}

std::string Document::toJson() const {
    std::ostringstream ss;
    ss << "{";
    ss << "\"id\":" << id << ",";
    ss << "\"title\":\"" << escapeJson(title) << "\",";
    ss << "\"description\":\"" << escapeJson(description) << "\",";
    ss << "\"category\":\"" << escapeJson(category) << "\",";
    ss << "\"url\":\"" << escapeJson(url) << "\",";
    ss << "\"keywords\":[";
    for (size_t i = 0; i < keywords.size(); ++i) {
        ss << "\"" << escapeJson(keywords[i]) << "\"";
        if (i + 1 < keywords.size()) {
            ss << ",";
        }
    }
    ss << "],";
    ss << "\"popularity\":" << popularity;
    ss << "}";
    return ss.str();
}
