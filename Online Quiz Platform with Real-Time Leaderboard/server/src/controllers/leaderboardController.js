/**
 * Real-Time Leaderboard Controller (Powered by Redis Sorted Sets)
 */
const leaderboardService = require('../services/leaderboardService');

class LeaderboardController {
  async getQuizLeaderboard(req, res, next) {
    try {
      const quizId = parseInt(req.params.quizId, 10);
      const limit = parseInt(req.query.limit || '10', 10);

      const top10 = await leaderboardService.getLeaderboard(quizId, limit);
      const totalParticipants = await leaderboardService.getTotalParticipants(quizId);

      let myRank = null;
      if (req.user) {
        myRank = await leaderboardService.getUserRank(quizId, req.user.userId);
      }

      res.status(200).json({
        success: true,
        data: {
          quizId,
          totalParticipants,
          leaderboard: top10,
          currentUser: myRank,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyRank(req, res, next) {
    try {
      const quizId = parseInt(req.params.quizId, 10);
      const userId = req.user.userId;

      const rankInfo = await leaderboardService.getUserRank(quizId, userId);
      res.status(200).json({
        success: true,
        data: rankInfo,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LeaderboardController();

