#ifndef HISTORY_MANAGER_H
#define HISTORY_MANAGER_H

#include <string>
#include <vector>
#include <unordered_map>
#include <deque>
#include <utility>

/**
 * @brief Manages recent search history and global search frequency statistics.
 * 
 * Supports session persistence using local file storage.
 */
class HistoryManager {
private:
    std::deque<std::string> recentSearches; // Most recent at front
    std::unordered_map<std::string, int> searchFrequencies; // Tracks popularity counts
    size_t maxHistoryCapacity;
    std::string persistentFilePath;

public:
    explicit HistoryManager(size_t maxCapacity = 20, const std::string& filepath = "data/history.txt");

    /**
     * @brief Records a new query: updates recent history and increments frequency.
     */
    void recordSearch(const std::string& query);

    /**
     * @brief Retrieves a list of most recent unique search queries.
     * @param limit Maximum number of recent items to return (default: 5).
     */
    std::vector<std::string> getRecentSearches(int limit = 5) const;

    /**
     * @brief Retrieves the top most popular search queries sorted by frequency.
     * @param limit Maximum number of popular items to return (default: 5).
     */
    std::vector<std::pair<std::string, int>> getPopularSearches(int limit = 5) const;

    /**
     * @brief Clears the recent history and resets popularity metrics.
     */
    void clearHistory();

    /**
     * @brief Persists history and search frequencies to local disk.
     */
    bool saveToFile() const;

    /**
     * @brief Loads persisted history from local disk if available.
     */
    bool loadFromFile();

    /**
     * @brief Returns recent search history formatted as JSON array string.
     */
    std::string getHistoryJson() const;

    /**
     * @brief Returns popular searches formatted as JSON array of objects string.
     */
    std::string getPopularJson() const;
};

#endif // HISTORY_MANAGER_H
