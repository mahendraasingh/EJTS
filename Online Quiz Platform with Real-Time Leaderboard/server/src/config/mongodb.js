/**
 * MongoDB Document Database Connector
 * Uses Mongoose for schema modeling, document persistence, and Aggregation Pipelines.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz_platform_mongo';

async function connectMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ [MongoDB] Successfully connected to document database.');
    return true;
  } catch (error) {
    console.error('❌ [MongoDB] Connection failed:', error.message);
    return false;
  }
}

mongoose.connection.on('error', (err) => {
  console.error('❌ [MongoDB] Runtime error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ [MongoDB] Disconnected.');
});

module.exports = {
  mongoose,
  connectMongoDB,
};
