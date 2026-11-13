/**
 * Quiz Attempt, Active Session & Submission Routes
 */
const express = require('express');
const attemptController = require('../controllers/attemptController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Join quiz and initialize Redis session with TTL
router.post('/:quizId/join', attemptController.joinQuiz);

// Record answer temporarily in Redis session
router.post('/:quizId/answer', attemptController.recordAnswer);

// Final evaluation and multi-database submission
router.post('/:quizId/submit', attemptController.submitQuiz);

// Retrieve submission results
router.get('/:quizId/result', attemptController.getResult);

module.exports = router;

