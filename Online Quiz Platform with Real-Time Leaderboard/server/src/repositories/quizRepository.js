/**
 * MySQL Quiz Repository
 * Data Access Object for quizzes and categories tables.
 */
const { query } = require('../config/mysql');

class QuizRepository {
  async findAll({ categoryId, search, status, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT q.*, c.category_name, u.name AS creator_name,
             (SELECT COUNT(*) FROM questions WHERE quiz_id = q.quiz_id) AS question_count,
             (SELECT COUNT(*) FROM quiz_participants WHERE quiz_id = q.quiz_id) AS participant_count
      FROM quizzes q
      JOIN categories c ON q.category_id = c.category_id
      JOIN users u ON q.created_by = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (categoryId) {
      sql += ' AND q.category_id = ?';
      params.push(categoryId);
    }
    if (status) {
      sql += ' AND q.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (q.title LIKE ? OR q.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    return await query(sql, params);
  }

  async findById(quizId) {
    const sql = `
      SELECT q.*, c.category_name, u.name AS creator_name,
             (SELECT COUNT(*) FROM questions WHERE quiz_id = q.quiz_id) AS question_count,
             (SELECT COUNT(*) FROM quiz_participants WHERE quiz_id = q.quiz_id) AS participant_count
      FROM quizzes q
      JOIN categories c ON q.category_id = c.category_id
      JOIN users u ON q.created_by = u.user_id
      WHERE q.quiz_id = ?
      LIMIT 1
    `;
    const rows = await query(sql, [quizId]);
    return rows[0] || null;
  }

  async create({
    title,
    description,
    categoryId,
    durationMinutes = 15,
    totalMarks = 100,
    negativeMarking = 0,
    startTime = null,
    endTime = null,
    status = 'active',
    createdBy,
  }) {
    const sql = `
      INSERT INTO quizzes (
        title, description, category_id, duration_minutes, total_marks,
        negative_marking, start_time, end_time, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      title.trim(),
      description || null,
      categoryId,
      durationMinutes,
      totalMarks,
      negativeMarking,
      startTime,
      endTime,
      status,
      createdBy,
    ]);
    return result.insertId;
  }

  async update(quizId, updates) {
    const allowedFields = [
      'title',
      'description',
      'category_id',
      'duration_minutes',
      'total_marks',
      'negative_marking',
      'start_time',
      'end_time',
      'status',
    ];
    const setClauses = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = ?`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return false;

    params.push(quizId);
    const sql = `UPDATE quizzes SET ${setClauses.join(', ')} WHERE quiz_id = ?`;
    await query(sql, params);
    return true;
  }

  async delete(quizId) {
    const sql = 'DELETE FROM quizzes WHERE quiz_id = ?';
    const result = await query(sql, [quizId]);
    return result.affectedRows > 0;
  }

  async getCategories() {
    const sql = `
      SELECT c.*, COUNT(q.quiz_id) AS quiz_count
      FROM categories c
      LEFT JOIN quizzes q ON c.category_id = q.category_id
      GROUP BY c.category_id, c.category_name, c.description, c.created_at
      ORDER BY c.category_name ASC
    `;
    return await query(sql);
  }

  async createCategory(categoryName, description = '') {
    const sql = 'INSERT INTO categories (category_name, description) VALUES (?, ?)';
    const result = await query(sql, [categoryName.trim(), description]);
    return result.insertId;
  }
}

module.exports = new QuizRepository();

