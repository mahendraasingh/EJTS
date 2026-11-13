/**
 * Redis Leaderboard Service
 * Utilizes Redis Sorted Sets (ZSET) for O(log N) real-time leaderboard ranking
 * with deterministic tie-breaking (higher score wins; earlier submission breaks ties).
 */
const { redis } = require('../config/redis');
const { query } = require('../config/mysql');

class LeaderboardService {
  getLeaderboardKey(quizId) {
    return `leaderboard:quiz:${quizId}`;
  }

  getUserMetaKey(userId) {
    return `user:meta:${userId}`;
  }

  /**
   * Calculates a composite score for deterministic tie-breaking.
   * High score wins. For identical scores, the earlier submission timestamp wins.
   */
  calculateCompositeScore(score, submissionTimestamp) {
    // Offset timestamp with a high ceiling so earlier timestamp yields a slightly larger fraction (< 1)
    const maxTimestamp = 2000000000000; // Far future ms (~year 2033)
    const tieBreaker = Math.max(0, (maxTimestamp - submissionTimestamp) / 10000000000000);
    return parseFloat((score + tieBreaker).toFixed(8));
  }

  /**
   * Updates or inserts a student's score in the quiz leaderboard.
   * Uses ZADD on leaderboard:quiz:{quizId}
   */
  async updateScore(quizId, userId, score, submissionTimestamp = Date.now(), userMeta = {}) {
    const key = this.getLeaderboardKey(quizId);
    const compositeScore = this.calculateCompositeScore(score, submissionTimestamp);

    // ZADD leaderboard:quiz:{quizId} <compositeScore> <userId>
    await redis.zadd(key, compositeScore, userId.toString());

    // Cache user metadata in Redis hash for fast leaderboard enrichment without SQL joins
    if (userMeta.name) {
      await redis.hset(this.getUserMetaKey(userId), {
        name: userMeta.name,
        email: userMeta.email || '',
      });
    }

    return { compositeScore };
  }

  /**
   * Retrieves the top participants ordered by score descending.
   * Uses ZREVRANGE leaderboard:quiz:{quizId} 0 {limit-1} WITHSCORES
   */
  async getLeaderboard(quizId, limit = 10) {
    const key = this.getLeaderboardKey(quizId);
    // Returns [member1, score1, member2, score2, ...]
    const rawResults = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');

    if (!rawResults || rawResults.length === 0) {
      // Fallback: If Redis leaderboard is cold, hydrate from MySQL quiz_results
      return await this.hydrateLeaderboardFromMySQL(quizId, limit);
    }

    const leaderboard = [];
    const userIds = [];

    for (let i = 0; i < rawResults.length; i += 2) {
      const userId = parseInt(rawResults[i], 10);
      const compositeScore = parseFloat(rawResults[i + 1]);
      const rawScore = Math.floor(compositeScore); // or decimal extraction
      userIds.push(userId);
      leaderboard.push({
        rank: i / 2 + 1,
        userId,
        score: rawScore,
        compositeScore,
      });
    }

    // Enrich with user metadata (Redis Hash or MySQL fallback)
    for (const item of leaderboard) {
      const meta = await redis.hgetall(this.getUserMetaKey(item.userId));
      if (meta && meta.name) {
        item.name = meta.name;
        item.email = meta.email;
      } else {
        // Fallback to MySQL user query
        const [u] = await query('SELECT name, email FROM users WHERE user_id = ?', [item.userId]);
        item.name = u ? u.name : `Student #${item.userId}`;
        item.email = u ? u.email : '';
        if (u) {
          await redis.hset(this.getUserMetaKey(item.userId), { name: u.name, email: u.email });
        }
      }
    }

    return leaderboard;
  }

  /**
   * Retrieves the specific student's rank and score in the quiz leaderboard.
   * Uses ZREVRANK and ZSCORE
   */
  async getUserRank(quizId, userId) {
    const key = this.getLeaderboardKey(quizId);
    const zeroBasedRank = await redis.zrevrank(key, userId.toString());
    const score = await redis.zscore(key, userId.toString());

    if (zeroBasedRank === null || score === null) {
      return {
        rank: null,
        score: null,
        totalParticipants: await this.getTotalParticipants(quizId),
      };
    }

    return {
      rank: zeroBasedRank + 1,
      score: Math.floor(parseFloat(score)),
      totalParticipants: await this.getTotalParticipants(quizId),
    };
  }

  /**
   * Returns the total count of scored participants.
   * Uses ZCARD
   */
  async getTotalParticipants(quizId) {
    const key = this.getLeaderboardKey(quizId);
    return await redis.zcard(key);
  }

  /**
   * Hydrates Redis Sorted Set from MySQL if Redis was restarted or cache was flushed
   */
  async hydrateLeaderboardFromMySQL(quizId, limit = 10) {
    const sql = `
      SELECT r.user_id, r.score, UNIX_TIMESTAMP(r.submitted_at) * 1000 AS sub_ts,
             u.name, u.email
      FROM quiz_results r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.quiz_id = ?
      ORDER BY r.score DESC, r.time_taken_seconds ASC
      LIMIT 100
    `;
    const rows = await query(sql, [quizId]);
    for (const r of rows) {
      await this.updateScore(quizId, r.user_id, parseFloat(r.score), r.sub_ts, {
        name: r.name,
        email: r.email,
      });
    }

    return rows.slice(0, limit).map((r, idx) => ({
      rank: idx + 1,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      score: parseFloat(r.score),
    }));
  }
}

module.exports = new LeaderboardService();

