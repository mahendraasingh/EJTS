/**
 * Database Seed Runner Utility
 * Populates MySQL schemas and seed rows, MongoDB sample documents,
 * and Redis Sorted Sets for leaderboard snapshots.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const { redis } = require('../config/redis');
const leaderboardService = require('../services/leaderboardService');
const QuizAttempt = require('../models/QuizAttempt');
require('dotenv').config();

async function runSeed() {
  console.log('🌱 Starting Tri-Database Seeding Process...');

  // 1. MySQL Schema & Data Seeding
  try {
    console.log('📦 [1/3] Connecting to MySQL...');
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      multipleStatements: true,
    });

    const schemaPath = path.resolve(__dirname, '../../../database/mysql_schema.sql');
    const seedPath = path.resolve(__dirname, '../../../database/mysql_seed.sql');

    if (fs.existsSync(schemaPath)) {
      console.log('   -> Executing mysql_schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
    }

    if (fs.existsSync(seedPath)) {
      console.log('   -> Executing mysql_seed.sql...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await connection.query(seedSql);
    }

    await connection.end();
    console.log('✅ [MySQL] Schema and seed data successfully initialized.');
  } catch (err) {
    console.error('❌ [MySQL Seed Error]:', err.message);
  }

  // 2. MongoDB Document Seeding
  try {
    console.log('📦 [2/3] Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz_platform_mongo';
    await mongoose.connect(mongoUri);

    const mongoDataPath = path.resolve(__dirname, '../../../database/mongodb_sample_data.json');
    if (fs.existsSync(mongoDataPath)) {
      console.log('   -> Inserting sample QuizAttempt documents...');
      const rawData = JSON.parse(fs.readFileSync(mongoDataPath, 'utf8'));
      await QuizAttempt.deleteMany({});
      await QuizAttempt.insertMany(rawData);
      console.log(`✅ [MongoDB] Inserted ${rawData.length} sample quiz attempt documents.`);
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ [MongoDB Seed Error]:', err.message);
  }

  // 3. Redis Leaderboard Hydration
  try {
    console.log('📦 [3/3] Hydrating Redis Sorted Sets for Leaderboard...');
    // Hydrate Quiz 1 with Rahul and Priya's scores
    await leaderboardService.updateScore(1, 2, 23.75, Date.now() - 3600000, {
      name: 'Rahul Sharma',
      email: 'rahul@student.com',
    });
    await leaderboardService.updateScore(1, 3, 18.50, Date.now() - 1800000, {
      name: 'Priya Patel',
      email: 'priya@student.com',
    });
    console.log('✅ [Redis] Leaderboard Sorted Sets hydrated.');
  } catch (err) {
    console.error('❌ [Redis Seed Error]:', err.message);
  }

  console.log('🎉 Tri-Database Seeding Complete!');
  process.exit(0);
}

runSeed();

