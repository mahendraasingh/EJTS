#ifndef DOCUMENT_H
#define DOCUMENT_H

#include <string>
#include <vector>

/**
 * @brief Represents a searchable document / web-page record in the search engine.
 * 
 * Contains unique identifier, title, textual description, keyword tags,
 * category, source URL reference, and base popularity metrics.
 */
class Document {
private:
    int id;
    std::string title;
    std::string description;
    std::vector<std::string> keywords;
    std::string category;
    std::string url;
    int popularity;

public:
    Document();
    Document(int id, const std::string& title, const std::string& description,
             const std::vector<std::string>& keywords, const std::string& category,
             const std::string& url, int popularity = 0);

    // Getters
    int getId() const;
    const std::string& getTitle() const;
    const std::string& getDescription() const;
    const std::vector<std::string>& getKeywords() const;
    const std::string& getCategory() const;
    const std::string& getUrl() const;
    int getPopularity() const;

    // Setters
    void setId(int newId);
    void setTitle(const std::string& newTitle);
    void setDescription(const std::string& newDescription);
    void setKeywords(const std::vector<std::string>& newKeywords);
    void setCategory(const std::string& newCategory);
    void setUrl(const std::string& newUrl);
    void setPopularity(int newPopularity);

    // Serialization helper
    std::string toJson() const;
};

#endif // DOCUMENT_H
