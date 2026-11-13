/**
 * Express Application Configuration
 */
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const attemptRoutes = require('./routes/attemptRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const errorHandler = require('./middleware/errorHandler');
const { testMySQLConnection } = require('./config/mysql');
const { testRedisConnection } = require('./config/redis');
const mongoose = require('mongoose');

const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Database Healthcheck Endpoint
app.get('/api/health', async (req, res) => {
  const mysqlOk = await testMySQLConnection();
  const redisOk = await testRedisConnection();
  const mongoOk = mongoose.connection.readyState === 1;

  const status = mysqlOk && redisOk && mongoOk ? 'HEALTHY' : 'DEGRADED';

  res.status(status === 'HEALTHY' ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    databases: {
      mysql: mysqlOk ? 'Connected' : 'Disconnected',
      redis: redisOk ? 'Connected' : 'Disconnected',
      mongodb: mongoOk ? 'Connected' : 'Disconnected',
    },
  });
});

// REST API Route Registration
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Online Quiz Platform API with MySQL, Redis, and MongoDB is running.',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;

