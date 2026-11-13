/**
 * Quiz Management Service with Redis Metadata Caching
 * Demonstrates Cache-Aside pattern with deterministic invalidation on mutations.
 */
const quizRepository = require('../repositories/quizRepository');
const questionRepository = require('../repositories/questionRepository');
const { redis } = require('../config/redis');

const CACHE_TTL = 300; // 5 minutes

class QuizService {
  getQuizCacheKey(quizId) {
    return `cache:quiz:${quizId}`;
  }

  getQuizzesListCacheKey(params) {
    return `cache:quizzes:list:${JSON.stringify(params || {})}`;
  }

  async getAllQuizzes(filters = {}) {
    const cacheKey = this.getQuizzesListCacheKey(filters);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Cache miss or Redis down, proceed to MySQL
    }

    const quizzes = await quizRepository.findAll(filters);

    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(quizzes));
    } catch (e) {}

    return quizzes;
  }

  async getQuizById(quizId) {
    const cacheKey = this.getQuizCacheKey(quizId);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}

    const quiz = await quizRepository.findById(quizId);
    if (!quiz) {
      const err = new Error('Quiz not found.');
      err.statusCode = 404;
      throw err;
    }

    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(quiz));
    } catch (e) {}

    return quiz;
  }

  async createQuiz(quizData) {
    const quizId = await quizRepository.create(quizData);
    await this.invalidateQuizzesCache();
    return await this.getQuizById(quizId);
  }

  async updateQuiz(quizId, updates) {
    const success = await quizRepository.update(quizId, updates);
    if (!success) {
      const err = new Error('Failed to update quiz or no valid fields provided.');
      err.statusCode = 400;
      throw err;
    }
    await this.invalidateQuizCache(quizId);
    await this.invalidateQuizzesCache();
    return await this.getQuizById(quizId);
  }

  async deleteQuiz(quizId) {
    const success = await quizRepository.delete(quizId);
    if (!success) {
      const err = new Error('Quiz not found or could not be deleted.');
      err.statusCode = 404;
      throw err;
    }
    await this.invalidateQuizCache(quizId);
    await this.invalidateQuizzesCache();
    // Also delete leaderboard key
    try {
      await redis.del(`leaderboard:quiz:${quizId}`);
    } catch (e) {}
    return true;
  }

  async getQuizQuestions(quizId, userRole = 'student') {
    // Only admins get is_correct included; students get options without answer leakage
    const includeAnswers = userRole === 'admin';
    return await questionRepository.findByQuizId(quizId, includeAnswers);
  }

  async addQuestionWithOptions(quizId, questionData, optionsData) {
    const questionId = await questionRepository.createQuestionWithOptions(quizId, questionData, optionsData);
    await this.invalidateQuizCache(quizId);
    return questionId;
  }

  async deleteQuestion(questionId, quizId) {
    const success = await questionRepository.deleteQuestion(questionId);
    if (quizId) {
      await this.invalidateQuizCache(quizId);
    }
    return success;
  }

  async getCategories() {
    return await quizRepository.getCategories();
  }

  async createCategory(name, description) {
    return await quizRepository.createCategory(name, description);
  }

  async invalidateQuizCache(quizId) {
    try {
      await redis.del(this.getQuizCacheKey(quizId));
    } catch (e) {}
  }

  async invalidateQuizzesCache() {
    try {
      const keys = await redis.keys('cache:quizzes:list:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (e) {}
  }
}

module.exports = new QuizService();
