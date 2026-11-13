/**
 * Quiz & Question REST Controller
 */
const quizService = require('../services/quizService');

class QuizController {
  async getQuizzes(req, res, next) {
    try {
      const { categoryId, search, status, limit, offset } = req.query;
      const quizzes = await quizService.getAllQuizzes({
        categoryId,
        search,
        status: req.user && req.user.role === 'admin' ? status : 'active',
        limit,
        offset,
      });
      res.status(200).json({ success: true, count: quizzes.length, data: quizzes });
    } catch (err) {
      next(err);
    }
  }

  async getQuizById(req, res, next) {
    try {
      const quiz = await quizService.getQuizById(req.params.quizId);
      res.status(200).json({ success: true, data: quiz });
    } catch (err) {
      next(err);
    }
  }

  async createQuiz(req, res, next) {
    try {
      const quiz = await quizService.createQuiz({
        ...req.body,
        createdBy: req.user.userId,
      });
      res.status(201).json({
        success: true,
        message: 'Quiz created successfully.',
        data: quiz,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateQuiz(req, res, next) {
    try {
      const updated = await quizService.updateQuiz(req.params.quizId, req.body);
      res.status(200).json({
        success: true,
        message: 'Quiz updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteQuiz(req, res, next) {
    try {
      await quizService.deleteQuiz(req.params.quizId);
      res.status(200).json({
        success: true,
        message: 'Quiz and associated questions deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  async getQuestions(req, res, next) {
    try {
      const userRole = req.user ? req.user.role : 'student';
      const questions = await quizService.getQuizQuestions(req.params.quizId, userRole);
      res.status(200).json({ success: true, count: questions.length, data: questions });
    } catch (err) {
      next(err);
    }
  }

  async createQuestion(req, res, next) {
    try {
      const { questionText, questionType, marks, negativeMarks, questionOrder, options } = req.body;
      const questionId = await quizService.addQuestionWithOptions(
        req.params.quizId,
        { questionText, questionType, marks, negativeMarks, questionOrder },
        options
      );
      res.status(201).json({
        success: true,
        message: 'Question added successfully.',
        data: { questionId },
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteQuestion(req, res, next) {
    try {
      await quizService.deleteQuestion(req.params.questionId, req.query.quizId);
      res.status(200).json({
        success: true,
        message: 'Question deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await quizService.getCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req, res, next) {
    try {
      const categoryId = await quizService.createCategory(req.body.categoryName, req.body.description);
      res.status(201).json({
        success: true,
        message: 'Category created successfully.',
        data: { categoryId },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new QuizController();

