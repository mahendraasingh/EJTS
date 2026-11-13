/**
 * MySQL Quiz Participant Repository
 * Manages active quiz registrations and status transitions.
 */
const { query } = require('../config/mysql');

class ParticipantRepository {
  async findParticipant(quizId, userId) {
    const sql = `
      SELECT * FROM quiz_participants
      WHERE quiz_id = ? AND user_id = ?
      LIMIT 1
    `;
    const rows = await query(sql, [quizId, userId]);
    return rows[0] || null;
  }

  async createOrUpdateParticipant(quizId, userId, status = 'started') {
    const sql = `
      INSERT INTO quiz_participants (quiz_id, user_id, status)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `;
    return await query(sql, [quizId, userId, status]);
  }

  async updateStatus(quizId, userId, status) {
    const sql = `
      UPDATE quiz_participants
      SET status = ?
      WHERE quiz_id = ? AND user_id = ?
    `;
    const result = await query(sql, [status, quizId, userId]);
    return result.affectedRows > 0;
  }

  async countParticipantsByQuiz(quizId) {
    const sql = 'SELECT COUNT(*) AS total FROM quiz_participants WHERE quiz_id = ?';
    const rows = await query(sql, [quizId]);
    return rows[0]?.total || 0;
  }
}

module.exports = new ParticipantRepository();
