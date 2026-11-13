/**
 * Quiz Submission & Multi-Database Orchestrator Service
 * Handles transactional evaluation, MySQL ACID persistence, MongoDB audit documents,
 * and Redis Real-Time Leaderboard updates with idempotency and cross-database reconciliation.
 */
const questionRepository = require('../repositories/questionRepository');
const resultRepository = require('../repositories/resultRepository');
const quizRepository = require('../repositories/quizRepository');
const userRepository = require('../repositories/userRepository');
const sessionService = require('./sessionService');
const leaderboardService = require('./leaderboardService');
const QuizAttempt = require('../models/QuizAttempt');

class SubmissionService {
  /**
   * Submits and evaluates a student's quiz attempt across MySQL, MongoDB, and Redis.
   */
  async submitQuiz(userId, quizId, clientAnswers = null, socketEmitter = null) {
    // 1. Idempotency Check: Verify if user has already submitted this quiz
    const existingResult = await resultRepository.findResult(quizId, userId);
    if (existingResult) {
      const userRank = await leaderboardService.getUserRank(quizId, userId);
      return {
        isAlreadySubmitted: true,
        result: existingResult,
        rank: userRank.rank,
      };
    }

    // 2. Retrieve session from Redis or construct from parameters
    const session = await sessionService.getSession(userId, quizId);
    const answersMap = clientAnswers || (session ? session.answers : {});

    // 3. Fetch Quiz and User Metadata from MySQL
    const quiz = await quizRepository.findById(quizId);
    if (!quiz) {
      const err = new Error('Quiz not found.');
      err.statusCode = 404;
      throw err;
    }

    const user = await userRepository.findById(userId);
    const studentName = user ? user.name : `Student #${userId}`;

    // 4. Fetch Secure Server-Side Answer Key from MySQL
    const answerKey = await questionRepository.getAnswerKey(quizId);

    // 5. Calculate Score & Performance Metrics
    let score = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    const answerDetails = [];

    const totalQuestions = answerKey.size;
    const defaultNegative = parseFloat(quiz.negative_marking || 0);

    for (const [questionId, qData] of answerKey.entries()) {
      const selectedOptionId = answersMap[questionId] !== undefined ? parseInt(answersMap[questionId], 10) : null;
      let isCorrect = false;
      let marksAwarded = 0;

      if (selectedOptionId === null || isNaN(selectedOptionId)) {
        unansweredCount++;
        marksAwarded = 0;
      } else if (selectedOptionId === qData.correctOptionId) {
        correctCount++;
        isCorrect = true;
        marksAwarded = qData.marks;
        score += marksAwarded;
      } else {
        incorrectCount++;
        isCorrect = false;
        const neg = qData.negativeMarks > 0 ? qData.negativeMarks : defaultNegative;
        marksAwarded = -neg;
        score -= neg;
      }

      answerDetails.push({
        questionId,
        questionText: qData.questionText,
        selectedOptionId,
        isCorrect,
        marksAwarded,
      });
    }

    // Never let total score go below 0 unless specific negative rules apply
    const finalScore = Math.max(0, parseFloat(score.toFixed(2)));

    // Calculate time taken
    let timeTakenSeconds = 0;
    if (session && session.startTime) {
      timeTakenSeconds = Math.min(
        quiz.duration_minutes * 60,
        Math.floor((Date.now() - session.startTime) / 1000)
      );
    } else {
      timeTakenSeconds = Math.floor(quiz.duration_minutes * 30); // Default estimate
    }

    // 6. Primary Source of Truth: Save to MySQL inside an ACID transaction
    const resultData = {
      quizId,
      userId,
      score: finalScore,
      totalQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      unansweredQuestions: unansweredCount,
      timeTakenSeconds,
    };

    const savedResultId = await resultRepository.saveResultTransactional(resultData);

    // 7. Store Detailed Document in MongoDB (Document Database)
    const attemptId = `ATTEMPT_${Date.now()}_U${userId}_Q${quizId}`;
    try {
      await QuizAttempt.create({
        attemptId,
        userId,
        studentName,
        quizId,
        quizTitle: quiz.title,
        category: quiz.category_name,
        startedAt: session ? new Date(session.startTime) : new Date(Date.now() - timeTakenSeconds * 1000),
        submittedAt: new Date(),
        score: finalScore,
        totalMarks: parseFloat(quiz.total_marks),
        timeTaken: timeTakenSeconds,
        correctCount,
        incorrectCount,
        unansweredCount,
        answers: answerDetails,
      });
    } catch (mongoErr) {
      console.error('⚠️ [MongoDB Sync Warning] Failed to insert QuizAttempt document:', mongoErr.message);
      // Fail-soft: MySQL holds relational truth, MongoDB can be reconciled
    }

    // 8. Update Redis Sorted Set for Real-Time Leaderboard
    const submissionTime = Date.now();
    try {
      await leaderboardService.updateScore(quizId, userId, finalScore, submissionTime, {
        name: studentName,
        email: user ? user.email : '',
      });
    } catch (redisErr) {
      console.error('⚠️ [Redis Sync Warning] Failed to update Redis Sorted Set:', redisErr.message);
    }

    // 9. Clean up temporary Redis Session
    try {
      await sessionService.deleteSession(userId, quizId);
    } catch (e) {
      // Non-blocking cleanup
    }

    // 10. Fetch updated rank from Redis
    const rankInfo = await leaderboardService.getUserRank(quizId, userId);

    // 11. Broadcast Real-Time Leaderboard Update via Socket.IO
    if (socketEmitter) {
      try {
        const top10 = await leaderboardService.getLeaderboard(quizId, 10);
        socketEmitter(quizId, {
          quizId,
          lastSubmitter: studentName,
          top10,
        });
      } catch (sockErr) {
        console.warn('⚠️ [Socket Broadcast Warning]:', sockErr.message);
      }
    }

    return {
      success: true,
      resultId: savedResultId,
      attemptId,
      quizTitle: quiz.title,
      score: finalScore,
      totalMarks: parseFloat(quiz.total_marks),
      totalQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      unansweredQuestions: unansweredCount,
      timeTakenSeconds,
      rank: rankInfo.rank,
      totalParticipants: rankInfo.totalParticipants,
    };
  }
}

module.exports = new SubmissionService();

