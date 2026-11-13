/**
 * MongoDB Aggregation Analytics Service
 * Implements advanced multi-stage aggregation pipelines:
 * $match, $group, $sort, $project, $unwind, $avg, $sum, $min, $max
 * Demonstrates the power of document databases for historical reporting.
 */
const QuizAttempt = require('../models/QuizAttempt');
const resultRepository = require('../repositories/resultRepository');
const userRepository = require('../repositories/userRepository');

class AnalyticsService {
  /**
   * Retrieves comprehensive student history and performance trends.
   */
  async getStudentHistory(userId) {
    return await QuizAttempt.find({ userId })
      .sort({ submittedAt: -1 })
      .select('-answers')
      .lean();
  }

  /**
   * Generates student performance statistics using MongoDB Aggregation Pipeline
   */
  async getStudentPerformanceSummary(userId) {
    const pipeline = [
      {
        $match: { userId: parseInt(userId, 10) },
      },
      {
        $group: {
          _id: '$userId',
          totalQuizzesAttempted: { $sum: 1 },
          averageScore: { $avg: '$score' },
          highestScore: { $max: '$score' },
          lowestScore: { $min: '$score' },
          totalTimeSpentSeconds: { $sum: '$timeTaken' },
          totalCorrectAnswers: { $sum: '$correctCount' },
          totalIncorrectAnswers: { $sum: '$incorrectCount' },
        },
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          totalQuizzesAttempted: 1,
          averageScore: { $round: ['$averageScore', 2] },
          highestScore: 1,
          lowestScore: 1,
          totalTimeSpentSeconds: 1,
          totalCorrectAnswers: 1,
          totalIncorrectAnswers: 1,
          accuracyRate: {
            $cond: [
              { $gt: [{ $add: ['$totalCorrectAnswers', '$totalIncorrectAnswers'] }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          '$totalCorrectAnswers',
                          { $add: ['$totalCorrectAnswers', '$totalIncorrectAnswers'] },
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
              0,
            ],
          },
        },
      },
    ];

    const results = await QuizAttempt.aggregate(pipeline);
    return (
      results[0] || {
        totalQuizzesAttempted: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        totalTimeSpentSeconds: 0,
        totalCorrectAnswers: 0,
        totalIncorrectAnswers: 0,
        accuracyRate: 0,
      }
    );
  }

  /**
   * Aggregates executive dashboard KPIs for Administrators
   */
  async getAdminOverview() {
    // 1. Relational counts from MySQL
    const mysqlStats = await resultRepository.getOverallStats();
    const userRoleCounts = await userRepository.countUsers();

    // 2. Deep analytical aggregates from MongoDB
    const mongoPipeline = [
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: '$score' },
          highestScore: { $max: '$score' },
          lowestScore: { $min: '$score' },
          avgTimeTakenSeconds: { $avg: '$timeTaken' },
        },
      },
    ];

    const mongoStats = await QuizAttempt.aggregate(mongoPipeline);
    const agg = mongoStats[0] || {};

    return {
      totalStudents: userRoleCounts.student || 0,
      totalAdmins: userRoleCounts.admin || 0,
      totalQuizzes: mysqlStats.total_quizzes || 0,
      totalAttempts: agg.totalAttempts || parseInt(mysqlStats.total_attempts, 10) || 0,
      averageScore: agg.averageScore ? parseFloat(agg.averageScore.toFixed(2)) : parseFloat(mysqlStats.average_score || 0),
      highestScore: agg.highestScore || 0,
      lowestScore: agg.lowestScore || 0,
      avgTimeTakenSeconds: agg.avgTimeTakenSeconds ? Math.round(agg.avgTimeTakenSeconds) : 0,
    };
  }

  /**
   * Detailed Quiz Analytics with Question Accuracy Breakdown using $unwind
   */
  async getQuizAnalytics(quizId) {
    const qId = parseInt(quizId, 10);

    // 1. Overall Quiz Metrics ($match -> $group)
    const summaryPipeline = [
      { $match: { quizId: qId } },
      {
        $group: {
          _id: '$quizId',
          totalSubmissions: { $sum: 1 },
          avgScore: { $avg: '$score' },
          maxScore: { $max: '$score' },
          minScore: { $min: '$score' },
          avgTimeTaken: { $avg: '$timeTaken' },
        },
      },
    ];
    const summaryResult = await QuizAttempt.aggregate(summaryPipeline);

    // 2. Question-level Accuracy ($match -> $unwind -> $group -> $project -> $sort)
    const questionAccuracyPipeline = [
      { $match: { quizId: qId } },
      { $unwind: '$answers' },
      {
        $group: {
          _id: '$answers.questionId',
          questionText: { $first: '$answers.questionText' },
          totalAnswered: { $sum: 1 },
          correctCount: {
            $sum: { $cond: ['$answers.isCorrect', 1, 0] },
          },
          incorrectCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$answers.selectedOptionId', null] },
                    { $eq: ['$answers.isCorrect', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          unansweredCount: {
            $sum: { $cond: [{ $eq: ['$answers.selectedOptionId', null] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          questionId: '$_id',
          questionText: 1,
          totalAnswered: 1,
          correctCount: 1,
          incorrectCount: 1,
          unansweredCount: 1,
          accuracyPercentage: {
            $cond: [
              { $gt: ['$totalAnswered', 0] },
              {
                $round: [
                  {
                    $multiply: [{ $divide: ['$correctCount', '$totalAnswered'] }, 100],
                  },
                  1,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { questionId: 1 } },
    ];
    const questionAccuracy = await QuizAttempt.aggregate(questionAccuracyPipeline);

    // 3. Score distribution buckets
    const scoreDistributionPipeline = [
      { $match: { quizId: qId } },
      {
        $bucket: {
          groupBy: '$score',
          boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 101],
          default: 'Other',
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ];

    let scoreDistribution = [];
    try {
      scoreDistribution = await QuizAttempt.aggregate(scoreDistributionPipeline);
    } catch (e) {
      scoreDistribution = [];
    }

    return {
      summary: summaryResult[0] || {
        totalSubmissions: 0,
        avgScore: 0,
        maxScore: 0,
        minScore: 0,
        avgTimeTaken: 0,
      },
      questionAccuracy,
      scoreDistribution,
    };
  }

  /**
   * Category-wise Performance Analytics
   */
  async getCategoryPerformance() {
    const pipeline = [
      {
        $group: {
          _id: '$category',
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: '$score' },
          avgAccuracy: {
            $avg: {
              $cond: [
                { $gt: [{ $add: ['$correctCount', '$incorrectCount'] }, 0] },
                {
                  $multiply: [
                    {
                      $divide: [
                        '$correctCount',
                        { $add: ['$correctCount', '$incorrectCount'] },
                      ],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalAttempts: 1,
          averageScore: { $round: ['$averageScore', 2] },
          avgAccuracy: { $round: ['$avgAccuracy', 1] },
        },
      },
      { $sort: { totalAttempts: -1 } },
    ];

    return await QuizAttempt.aggregate(pipeline);
  }
}

module.exports = new AnalyticsService();
