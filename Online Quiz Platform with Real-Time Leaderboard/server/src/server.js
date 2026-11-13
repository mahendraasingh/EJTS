/**
 * Main HTTP & Socket.IO Server Entry Point
 */
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = require('./app');
const { testMySQLConnection } = require('./config/mysql');
const { testRedisConnection } = require('./config/redis');
const { connectMongoDB } = require('./config/mongodb');
const { initQuizSocket } = require('./sockets/quizSocket');

const PORT = parseInt(process.env.PORT || '5000', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach Socket Handlers
initQuizSocket(io);

async function startServer() {
  console.log('🚀 Initializing Online Quiz Platform Services...');

  // Initialize Tri-Database Connections
  await testMySQLConnection();
  await testRedisConnection();
  await connectMongoDB();

  server.listen(PORT, () => {
    console.log(`
========================================================================
🏆 Online Quiz Platform Server is Live!
📡 REST API:      http://localhost:${PORT}
⚡ Socket.IO:     ws://localhost:${PORT}
🩺 Health Check:  http://localhost:${PORT}/api/health
🌐 Client Origin: ${CLIENT_URL}
========================================================================
    `);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

startServer();

