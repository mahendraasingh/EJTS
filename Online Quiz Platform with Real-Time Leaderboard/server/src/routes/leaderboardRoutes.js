/**
 * Leaderboard Routes (Redis Sorted Sets)
 */
const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Top 10 leaderboard for a quiz
router.get('/:quizId', leaderboardController.getQuizLeaderboard);

// Current user's specific rank & score
router.get('/:quizId/me', leaderboardController.getMyRank);

module.exports = router;
