#ifndef DOCUMENT_MANAGER_H
#define DOCUMENT_MANAGER_H

#include "Document.h"
#include <string>
#include <vector>
#include <unordered_map>

/**
 * @brief Manages loading, storing, and accessing the document collection.
 * 
 * Includes a lightweight, pure-C++ standard library JSON parser to ensure
 * zero external dependencies for seamless college evaluation.
 */
class DocumentManager {
private:
    std::vector<Document> documents;
    std::unordered_map<int, size_t> idToIndexMap;

public:
    DocumentManager();

    /**
     * @brief Loads documents from a JSON file.
     * @param filepath Path to the documents.json file.
     * @return true if loading succeeded, false otherwise.
     */
    bool loadFromJsonFile(const std::string& filepath);

    /**
     * @brief Adds a new document to the collection.
     */
    void addDocument(const Document& doc);

    /**
     * @brief Retrieves all loaded documents.
     */
    const std::vector<Document>& getAllDocuments() const;

    /**
     * @brief Finds a document by its unique integer ID.
     * @return Pointer to Document if found, nullptr otherwise.
     */
    const Document* getDocumentById(int id) const;

    /**
     * @brief Returns total number of documents currently stored.
     */
    size_t getDocumentCount() const;

    /**
     * @brief Clears all currently loaded documents.
     */
    void clear();
};

#endif // DOCUMENT_MANAGER_H
