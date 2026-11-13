/**
 * Quiz & Question REST Routes
 */
const express = require('express');
const { body } = require('express-validator');
const quizController = require('../controllers/quizController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Public / Authenticated Quiz Listing
router.get('/', authenticateToken, quizController.getQuizzes);
router.get('/categories', authenticateToken, quizController.getCategories);
router.get('/:quizId', authenticateToken, quizController.getQuizById);
router.get('/:quizId/questions', authenticateToken, quizController.getQuestions);

// Admin-Only Quiz Mutation Routes
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  [
    body('title').trim().notEmpty().withMessage('Quiz title is required.'),
    body('categoryId').isInt({ min: 1 }).withMessage('Valid categoryId is required.'),
    body('durationMinutes').isInt({ min: 1 }).withMessage('Duration in minutes must be at least 1.'),
    body('totalMarks').isFloat({ min: 1 }).withMessage('Total marks must be greater than 0.'),
    validate,
  ],
  quizController.createQuiz
);

router.put('/:quizId', authenticateToken, authorizeRoles('admin'), quizController.updateQuiz);
router.delete('/:quizId', authenticateToken, authorizeRoles('admin'), quizController.deleteQuiz);

// Admin-Only Question Management
router.post(
  '/:quizId/questions',
  authenticateToken,
  authorizeRoles('admin'),
  [
    body('questionText').trim().notEmpty().withMessage('Question text is required.'),
    body('marks').isFloat({ min: 0.1 }).withMessage('Marks must be positive.'),
    body('options').isArray({ min: 2 }).withMessage('At least 2 options are required.'),
    validate,
  ],
  quizController.createQuestion
);

router.delete('/questions/:questionId', authenticateToken, authorizeRoles('admin'), quizController.deleteQuestion);

// Admin Category Creation
router.post(
  '/categories',
  authenticateToken,
  authorizeRoles('admin'),
  [body('categoryName').trim().notEmpty().withMessage('Category name is required.'), validate],
  quizController.createCategory
);

module.exports = router;

