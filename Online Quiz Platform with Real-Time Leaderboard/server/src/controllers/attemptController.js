/**
 * Quiz Attempt & Participation Controller
 * Orchestrates student session creation in Redis, answer recording, and evaluation.
 */
const quizService = require('../services/quizService');
const sessionService = require('../services/sessionService');
const submissionService = require('../services/submissionService');
const resultRepository = require('../repositories/resultRepository');
const { getSocketEmitter } = require('../sockets/quizSocket');

class AttemptController {
  async joinQuiz(req, res, next) {
    try {
      const quizId = parseInt(req.params.quizId, 10);
      const userId = req.user.userId;

      // 1. Check if user has already completed this quiz
      const existingResult = await resultRepository.findResult(quizId, userId);
      if (existingResult) {
        return res.status(200).json({
          success: true,
          isCompleted: true,
          message: 'You have already completed this quiz.',
          data: { result: existingResult },
        });
      }

      // 2. Fetch Quiz details to determine duration
      const quiz = await quizService.getQuizById(quizId);
      if (quiz.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'This quiz is not currently active for participation.',
        });
      }

      // 3. Create or resume Redis session with TTL
      const { session, remainingSeconds, isResumed } = await sessionService.createSession(
        userId,
        quizId,
        quiz.duration_minutes
      );

      // 4. Fetch questions without correct answers
      const questions = await quizService.getQuizQuestions(quizId, 'student');

      res.status(200).json({
        success: true,
        message: isResumed ? 'Active session resumed.' : 'Quiz session started successfully.',
        data: {
          quiz: {
            quizId: quiz.quiz_id,
            title: quiz.title,
            description: quiz.description,
            durationMinutes: quiz.duration_minutes,
            totalMarks: quiz.total_marks,
            negativeMarking: quiz.negative_marking,
          },
          session: {
            startTime: session.startTime,
            deadline: session.deadline,
            remainingSeconds,
            answers: session.answers || {},
          },
          questions,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async recordAnswer(req, res, next) {
    try {
      const quizId = parseInt(req.params.quizId, 10);
      const userId = req.user.userId;
      const { questionId, selectedOptionId } = req.body;

      const result = await sessionService.recordAnswer(
        userId,
        quizId,
        parseInt(questionId, 10),
        selectedOptionId !== null ? parseInt(selectedOptionId, 10) : null
      );

      res.status(200).json({
        success: true,
        message: 'Answer recorded in session.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async submitQuiz(req, res, next) {
    try {
      const quizId = parseInt(req.params.quizId, 10);
      const userId = req.user.userId;
      const { answers } = req.body;

      // Extract socket emitter to broadcast real-time leaderboard update
      const emitter = getSocketEmitter();

      const evaluation = await submissionService.submitQuiz(userId, quizId, answers, emitter);

      res.status(200).json({
        success: true,
        message: 'Quiz evaluated and submitted successfully.',
        data: evaluation,
      });
    } catch (err) {
      next(err);
    }
  }

  async getResult(req, res, next) {
    try {
      const quizId = parseInt(req.params.quizId, 10);
      const userId = req.user.userId;

      const result = await resultRepository.findResult(quizId, userId);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'No submission found for this quiz.',
        });
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AttemptController();

