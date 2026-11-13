/**
 * MongoDB Aggregation Analytics Controller
 */
const analyticsService = require('../services/analyticsService');
const userRepository = require('../repositories/userRepository');

class AnalyticsController {
  async getMyHistory(req, res, next) {
    try {
      const history = await analyticsService.getStudentHistory(req.user.userId);
      res.status(200).json({ success: true, count: history.length, data: history });
    } catch (err) {
      next(err);
    }
  }

  async getMyPerformance(req, res, next) {
    try {
      const summary = await analyticsService.getStudentPerformanceSummary(req.user.userId);
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  async getAdminOverview(req, res, next) {
    try {
      const overview = await analyticsService.getAdminOverview();
      res.status(200).json({ success: true, data: overview });
    } catch (err) {
      next(err);
    }
  }

  async getQuizAnalytics(req, res, next) {
    try {
      const analytics = await analyticsService.getQuizAnalytics(req.params.quizId);
      res.status(200).json({ success: true, data: analytics });
    } catch (err) {
      next(err);
    }
  }

  async getCategoryPerformance(req, res, next) {
    try {
      const categories = await analyticsService.getCategoryPerformance();
      res.status(200).json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }

  async getAllStudents(req, res, next) {
    try {
      const students = await userRepository.getAllStudents();
      res.status(200).json({ success: true, count: students.length, data: students });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();

