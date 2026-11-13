/**
 * MySQL Database Connector & Connection Pool
 * Uses mysql2/promise for async/await queries, connection pooling, and ACID transaction support.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'quiz_platform_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '10', 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

/**
 * Executes a parameterized query using the MySQL connection pool
 */
async function query(sql, params = []) {
  const [rows, fields] = await pool.execute(sql, params);
  return rows;
}

/**
 * Executes a callback within a managed ACID transaction.
 * Automatically performs COMMIT on success and ROLLBACK on error.
 */
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Tests the MySQL database connectivity
 */
async function testMySQLConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ [MySQL] Successfully connected to relational database.');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ [MySQL] Connection failed:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
  testMySQLConnection,
};
