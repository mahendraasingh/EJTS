/**
 * Socket.IO Real-Time Communications Module
 * Handles rooms, live timer broadcasts, instant answer receipts, and real-time leaderboard sync.
 */
const jwt = require('jsonwebtoken');
const sessionService = require('../services/sessionService');
const leaderboardService = require('../services/leaderboardService');

let globalIo = null;

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_jwt_secret_college_dbms_quiz_2026';

function initQuizSocket(io) {
  globalIo = io;

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication token required for Socket connection.'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid socket authentication token.'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, name } = socket.user;
    console.log(`🔌 [Socket.IO] Client connected: ${name} (User #${userId}, Socket ${socket.id})`);

    /**
     * Student joins a live quiz session room
     */
    socket.on('join_quiz', async ({ quizId }) => {
      const room = `quiz:${quizId}`;
      socket.join(room);

      const session = await sessionService.getSession(userId, quizId);
      if (session) {
        socket.emit('quiz_started', {
          quizId,
          remainingSeconds: session.remainingSeconds,
          answers: session.answers,
        });
      }
    });

    /**
     * Client records an answer in real-time
     */
    socket.on('submit_answer', async ({ quizId, questionId, selectedOptionId }) => {
      try {
        const result = await sessionService.recordAnswer(
          userId,
          quizId,
          parseInt(questionId, 10),
          selectedOptionId !== null ? parseInt(selectedOptionId, 10) : null
        );
        socket.emit('answer_recorded', result);
      } catch (err) {
        socket.emit('session_expired', { message: err.message });
      }
    });

    /**
     * Student or spectator joins the real-time leaderboard room
     */
    socket.on('join_leaderboard', async ({ quizId }) => {
      const room = `leaderboard:${quizId}`;
      socket.join(room);

      // Instantly dispatch current leaderboard snapshot
      try {
        const top10 = await leaderboardService.getLeaderboard(quizId, 10);
        socket.emit('leaderboard_updated', {
          quizId,
          top10,
        });
      } catch (err) {
        console.error('Leaderboard snapshot error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.IO] Client disconnected: ${name} (Socket ${socket.id})`);
    });
  });

  return io;
}

/**
 * Returns a helper function to emit leaderboard updates across all connected clients in a quiz room
 */
function getSocketEmitter() {
  return (quizId, payload) => {
    if (globalIo) {
      globalIo.to(`leaderboard:${quizId}`).emit('leaderboard_updated', payload);
    }
  };
}

module.exports = {
  initQuizSocket,
  getSocketEmitter,
};
