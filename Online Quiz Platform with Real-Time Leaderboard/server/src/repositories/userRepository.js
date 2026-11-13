/**
 * MySQL User Repository
 * Data Access Object for users table.
 */
const { query } = require('../config/mysql');

class UserRepository {
  async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
    const rows = await query(sql, [email.toLowerCase().trim()]);
    return rows[0] || null;
  }

  async findById(userId) {
    const sql = 'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ? LIMIT 1';
    const rows = await query(sql, [userId]);
    return rows[0] || null;
  }

  async create({ name, email, passwordHash, role = 'student' }) {
    const sql = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `;
    const result = await query(sql, [name.trim(), email.toLowerCase().trim(), passwordHash, role]);
    return {
      userId: result.insertId,
      name,
      email,
      role,
    };
  }

  async getAllStudents() {
    const sql = `
      SELECT u.user_id, u.name, u.email, u.created_at,
             COUNT(DISTINCT r.result_id) AS quizzes_completed,
             COALESCE(AVG(r.score), 0) AS average_score
      FROM users u
      LEFT JOIN quiz_results r ON u.user_id = r.user_id
      WHERE u.role = 'student'
      GROUP BY u.user_id, u.name, u.email, u.created_at
      ORDER BY u.created_at DESC
    `;
    return await query(sql);
  }

  async countUsers() {
    const sql = `
      SELECT role, COUNT(*) AS count
      FROM users
      GROUP BY role
    `;
    const rows = await query(sql);
    const summary = { student: 0, admin: 0 };
    rows.forEach((r) => {
      summary[r.role] = parseInt(r.count, 10);
    });
    return summary;
  }
}

module.exports = new UserRepository();
