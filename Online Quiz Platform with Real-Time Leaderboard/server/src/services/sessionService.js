/**
 * Redis Session Service
 * Manages active quiz attempts using Redis key-value storage and automatic TTL expiration.
 * Redis acts as a fast ephemeral cache with automatic lifecycle expiration.
 */
const { redis } = require('../config/redis');
const participantRepository = require('../repositories/participantRepository');

class SessionService {
  getSessionKey(userId, quizId) {
    return `quiz:session:${userId}:${quizId}`;
  }

  /**
   * Initializes a temporary quiz attempt session in Redis with TTL.
   * Also updates MySQL participant record.
   */
  async createSession(userId, quizId, durationMinutes) {
    const key = this.getSessionKey(userId, quizId);
    const existing = await redis.get(key);

    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        const remainingSeconds = Math.max(0, Math.floor((parsed.deadline - Date.now()) / 1000));
        return {
          session: parsed,
          remainingSeconds,
          isResumed: true,
        };
      } catch (e) {
        // Corrupt session, recreate
      }
    }

    const startTime = Date.now();
    const durationSeconds = durationMinutes * 60;
    const deadline = startTime + durationSeconds * 1000;
    // Allow 60-second grace buffer in Redis TTL for network variance and auto-submit handling
    const ttlSeconds = durationSeconds + 60;

    const sessionData = {
      userId,
      quizId,
      startTime,
      deadline,
      currentQuestionId: null,
      answers: {}, // questionId -> selectedOptionId
      status: 'active',
    };

    // Store in Redis with TTL (EXPIRE)
    await redis.setex(key, ttlSeconds, JSON.stringify(sessionData));

    // Update MySQL participant state
    await participantRepository.createOrUpdateParticipant(quizId, userId, 'started');

    return {
      session: sessionData,
      remainingSeconds: durationSeconds,
      isResumed: false,
    };
  }

  /**
   * Fetches active session from Redis and calculates remaining time using server-side deadline
   */
  async getSession(userId, quizId) {
    const key = this.getSessionKey(userId, quizId);
    const raw = await redis.get(key);
    if (!raw) return null;

    try {
      const session = JSON.parse(raw);
      const remainingSeconds = Math.max(0, Math.floor((session.deadline - Date.now()) / 1000));
      return {
        ...session,
        remainingSeconds,
        isExpired: remainingSeconds <= 0,
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Temporarily stores a question answer in the active Redis session
   */
  async recordAnswer(userId, quizId, questionId, selectedOptionId) {
    const key = this.getSessionKey(userId, quizId);
    const session = await this.getSession(userId, quizId);

    if (!session || session.isExpired) {
      const err = new Error('Quiz session has expired or is invalid.');
      err.statusCode = 410; // Gone
      throw err;
    }

    session.answers[questionId] = selectedOptionId;
    session.currentQuestionId = questionId;

    const remainingTtl = await redis.ttl(key);
    if (remainingTtl > 0) {
      await redis.setex(key, remainingTtl, JSON.stringify(session));
    }

    return {
      success: true,
      questionId,
      selectedOptionId,
      remainingSeconds: session.remainingSeconds,
    };
  }

  /**
   * Cleans up the temporary session from Redis upon quiz submission
   */
  async deleteSession(userId, quizId) {
    const key = this.getSessionKey(userId, quizId);
    await redis.del(key);
  }
}

module.exports = new SessionService();

