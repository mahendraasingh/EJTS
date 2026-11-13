/**
 * MySQL Question & Option Repository
 * Manages questions and multiple-choice options with strict answer masking for students.
 */
const { query, withTransaction } = require('../config/mysql');

class QuestionRepository {
  /**
   * Retrieves all questions and options for a quiz.
   * If includeAnswers is false (student view), is_correct is intentionally excluded.
   */
  async findByQuizId(quizId, includeAnswers = false) {
    const questionSql = `
      SELECT question_id, quiz_id, question_text, question_type, marks, negative_marks, question_order
      FROM questions
      WHERE quiz_id = ?
      ORDER BY question_order ASC, question_id ASC
    `;
    const questions = await query(questionSql, [quizId]);

    if (questions.length === 0) return [];

    const questionIds = questions.map((q) => q.question_id);
    const placeholders = questionIds.map(() => '?').join(',');

    const optionFields = includeAnswers
      ? 'option_id, question_id, option_text, is_correct'
      : 'option_id, question_id, option_text';

    const optionSql = `
      SELECT ${optionFields}
      FROM options
      WHERE question_id IN (${placeholders})
      ORDER BY option_id ASC
    `;
    const options = await query(optionSql, questionIds);

    // Map options to corresponding questions
    const questionMap = new Map();
    questions.forEach((q) => {
      questionMap.set(q.question_id, { ...q, options: [] });
    });

    options.forEach((opt) => {
      if (questionMap.has(opt.question_id)) {
        questionMap.get(opt.question_id).options.push(opt);
      }
    });

    return Array.from(questionMap.values());
  }

  /**
   * Internal method for backend submission grading.
   * Returns a map of questionId -> { marks, negativeMarks, correctOptionId, questionText }
   */
  async getAnswerKey(quizId) {
    const sql = `
      SELECT q.question_id, q.question_text, q.marks, q.negative_marks, o.option_id AS correct_option_id
      FROM questions q
      JOIN options o ON q.question_id = o.question_id
      WHERE q.quiz_id = ? AND o.is_correct = TRUE
    `;
    const rows = await query(sql, [quizId]);
    const answerKey = new Map();
    rows.forEach((r) => {
      answerKey.set(r.question_id, {
        questionText: r.question_text,
        marks: parseFloat(r.marks),
        negativeMarks: parseFloat(r.negative_marks),
        correctOptionId: r.correct_option_id,
      });
    });
    return answerKey;
  }

  /**
   * Creates a question along with its multiple-choice options in an atomic MySQL transaction.
   */
  async createQuestionWithOptions(quizId, questionData, optionsData) {
    return await withTransaction(async (conn) => {
      const qSql = `
        INSERT INTO questions (quiz_id, question_text, question_type, marks, negative_marks, question_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [qResult] = await conn.execute(qSql, [
        quizId,
        questionData.questionText.trim(),
        questionData.questionType || 'mcq',
        questionData.marks || 1.0,
        questionData.negativeMarks || 0.0,
        questionData.questionOrder || 1,
      ]);

      const questionId = qResult.insertId;

      if (Array.isArray(optionsData) && optionsData.length > 0) {
        for (const opt of optionsData) {
          const optSql = `
            INSERT INTO options (question_id, option_text, is_correct)
            VALUES (?, ?, ?)
          `;
          await conn.execute(optSql, [
            questionId,
            opt.optionText.trim(),
            opt.isCorrect ? 1 : 0,
          ]);
        }
      }

      return questionId;
    });
  }

  async deleteQuestion(questionId) {
    const sql = 'DELETE FROM questions WHERE question_id = ?';
    const result = await query(sql, [questionId]);
    return result.affectedRows > 0;
  }
}

module.exports = new QuestionRepository();
