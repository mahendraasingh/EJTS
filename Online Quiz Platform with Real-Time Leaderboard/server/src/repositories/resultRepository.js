/**
 * MySQL Result Repository
 * Manages transactional insertion and querying of final quiz results.
 */
const { query, withTransaction } = require('../config/mysql');

class ResultRepository {
  async findResult(quizId, userId) {
    const sql = `
      SELECT r.*, q.title AS quiz_title, q.total_marks
      FROM quiz_results r
      JOIN quizzes q ON r.quiz_id = q.quiz_id
      WHERE r.quiz_id = ? AND r.user_id = ?
      LIMIT 1
    `;
    const rows = await query(sql, [quizId, userId]);
    return rows[0] || null;
  }

  /**
   * Saves quiz result and marks participant status as 'completed' in an ACID transaction.
   */
  async saveResultTransactional(resultData) {
    return await withTransaction(async (conn) => {
      const sql = `
        INSERT INTO quiz_results (
          quiz_id, user_id, score, total_questions, correct_answers,
          incorrect_answers, unanswered_questions, time_taken_seconds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          score = VALUES(score),
          total_questions = VALUES(total_questions),
          correct_answers = VALUES(correct_answers),
          incorrect_answers = VALUES(incorrect_answers),
          unanswered_questions = VALUES(unanswered_questions),
          time_taken_seconds = VALUES(time_taken_seconds),
          submitted_at = CURRENT_TIMESTAMP
      `;
      const [insertResult] = await conn.execute(sql, [
        resultData.quizId,
        resultData.userId,
        resultData.score,
        resultData.totalQuestions,
        resultData.correctAnswers,
        resultData.incorrectAnswers,
        resultData.unansweredQuestions,
        resultData.timeTakenSeconds,
      ]);

      // Update participant status
      const partSql = `
        UPDATE quiz_participants
        SET status = 'completed'
        WHERE quiz_id = ? AND user_id = ?
      `;
      await conn.execute(partSql, [resultData.quizId, resultData.userId]);

      return insertResult.insertId;
    });
  }

  async getResultsByQuiz(quizId, limit = 50) {
    const sql = `
      SELECT r.*, u.name AS student_name, u.email
      FROM quiz_results r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.quiz_id = ?
      ORDER BY r.score DESC, r.time_taken_seconds ASC
      LIMIT ?
    `;
    return await query(sql, [quizId, parseInt(limit, 10)]);
  }

  async getUserResults(userId) {
    const sql = `
      SELECT r.*, q.title AS quiz_title, c.category_name, q.total_marks
      FROM quiz_results r
      JOIN quizzes q ON r.quiz_id = q.quiz_id
      JOIN categories c ON q.category_id = c.category_id
      WHERE r.user_id = ?
      ORDER BY r.submitted_at DESC
    `;
    return await query(sql, [userId]);
  }

  async getOverallStats() {
    const sql = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
        (SELECT COUNT(*) FROM quizzes WHERE status = 'active') AS total_quizzes,
        (SELECT COUNT(*) FROM quiz_results) AS total_attempts,
        (SELECT COALESCE(AVG(score), 0) FROM quiz_results) AS average_score
    `;
    const rows = await query(sql);
    return rows[0] || {
      total_students: 0,
      total_quizzes: 0,
      total_attempts: 0,
      average_score: 0,
    };
  }
}

module.exports = new ResultRepository();
