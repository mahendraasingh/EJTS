/**
 * Analytics REST Routes (MongoDB Aggregation Pipelines)
 */
const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Student self-analytics
router.get('/my-history', analyticsController.getMyHistory);
router.get('/my-performance', analyticsController.getMyPerformance);

// Admin-only analytical reports
router.get('/admin/overview', authorizeRoles('admin'), analyticsController.getAdminOverview);
router.get('/admin/quizzes/:quizId', authorizeRoles('admin'), analyticsController.getQuizAnalytics);
router.get('/admin/categories', authorizeRoles('admin'), analyticsController.getCategoryPerformance);
router.get('/admin/students', authorizeRoles('admin'), analyticsController.getAllStudents);

module.exports = router;
