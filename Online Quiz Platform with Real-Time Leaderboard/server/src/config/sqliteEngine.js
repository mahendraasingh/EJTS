/**
 * Embedded Relational SQLite Engine
 * High-reliability fallback that guarantees zero-friction student/admin access,
 * providing the exact same 3NF tables, constraints, seed users, and ACID transactions
 * whenever local MySQL credentials fail or MySQL server is unavailable.
 */
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_FILE = path.join(DB_DIR, 'quiz_platform_db.sqlite');
let db = null;
let isInitialized = false;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_FILE);
  }
  return db;
}

async function initSqlite() {
  if (isInitialized) return true;
  const database = getDb();

  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // 1. Users
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          user_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'student',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Categories
      database.run(`
        CREATE TABLE IF NOT EXISTS categories (
          category_id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 3. Quizzes
      database.run(`
        CREATE TABLE IF NOT EXISTS quizzes (
          quiz_id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          category_id INTEGER NOT NULL,
          duration_minutes INTEGER NOT NULL DEFAULT 15,
          total_marks REAL NOT NULL DEFAULT 100.0,
          negative_marking REAL NOT NULL DEFAULT 0.0,
          start_time DATETIME,
          end_time DATETIME,
          status TEXT NOT NULL DEFAULT 'active',
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 4. Questions
      database.run(`
        CREATE TABLE IF NOT EXISTS questions (
          question_id INTEGER PRIMARY KEY AUTOINCREMENT,
          quiz_id INTEGER NOT NULL,
          question_text TEXT NOT NULL,
          question_type TEXT NOT NULL DEFAULT 'mcq',
          marks REAL NOT NULL DEFAULT 1.0,
          negative_marks REAL NOT NULL DEFAULT 0.0,
          question_order INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 5. Options
      database.run(`
        CREATE TABLE IF NOT EXISTS options (
          option_id INTEGER PRIMARY KEY AUTOINCREMENT,
          question_id INTEGER NOT NULL,
          option_text TEXT NOT NULL,
          is_correct INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 6. Quiz Participants
      database.run(`
        CREATE TABLE IF NOT EXISTS quiz_participants (
          participant_id INTEGER PRIMARY KEY AUTOINCREMENT,
          quiz_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT NOT NULL DEFAULT 'started',
          UNIQUE(quiz_id, user_id)
        )
      `);

      // 7. Quiz Results
      database.run(`
        CREATE TABLE IF NOT EXISTS quiz_results (
          result_id INTEGER PRIMARY KEY AUTOINCREMENT,
          quiz_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          score REAL NOT NULL DEFAULT 0.0,
          total_questions INTEGER NOT NULL DEFAULT 0,
          correct_answers INTEGER NOT NULL DEFAULT 0,
          incorrect_answers INTEGER NOT NULL DEFAULT 0,
          unanswered_questions INTEGER NOT NULL DEFAULT 0,
          time_taken_seconds INTEGER NOT NULL DEFAULT 0,
          submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(quiz_id, user_id)
        )
      `);

      // Seed if users table is empty
      database.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
        if (err) return reject(err);
        if (row && row.count === 0) {
          seedDefaultRelationalData(database)
            .then(() => {
              isInitialized = true;
              resolve(true);
            })
            .catch(reject);
        } else {
          isInitialized = true;
          resolve(true);
        }
      });
    });
  });
}

function seedDefaultRelationalData(database) {
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      const stmtUser = database.prepare(
        'INSERT INTO users (user_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
      );
      // Demo accounts with verified bcrypt hash for 'password123'
      const passHash = '$2a$10$025wTWuV80RW9yWsSh6RJ.XujMVkGX0c1nGbKb8eMAhDo0neeOWwW';
      stmtUser.run(1, 'Admin Professor', 'admin@quiz.com', passHash, 'admin');
      stmtUser.run(2, 'Rahul Sharma', 'rahul@student.com', passHash, 'student');
      stmtUser.run(3, 'Priya Patel', 'priya@student.com', passHash, 'student');
      stmtUser.run(4, 'Amit Verma', 'amit@student.com', passHash, 'student');
      stmtUser.finalize();

      const stmtCat = database.prepare(
        'INSERT INTO categories (category_id, category_name, description) VALUES (?, ?, ?)'
      );
      stmtCat.run(1, 'Database Management Systems', 'Relational database concepts, normalization, and ACID properties.');
      stmtCat.run(2, 'NoSQL & In-Memory Databases', 'Redis key-value patterns, Sorted Sets, and MongoDB document modeling.');
      stmtCat.run(3, 'Computer Networks & Systems', 'Protocols, TCP/IP, WebSockets, and latency optimization.');
      stmtCat.finalize();

      const stmtQuiz = database.prepare(
        'INSERT INTO quizzes (quiz_id, title, description, category_id, duration_minutes, total_marks, negative_marking, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      stmtQuiz.run(1, 'DBMS Relational Algebra & Normalization', 'Test your understanding of Functional Dependencies, 1NF to BCNF, and ACID transactions.', 1, 15, 25.0, 0.25, 'active', 1);
      stmtQuiz.run(2, 'Redis In-Memory Architectures & Leaderboards', 'Evaluate skills on Redis data types, Sorted Sets (ZSET), and TTL session caching.', 2, 10, 20.0, 0.0, 'active', 1);
      stmtQuiz.run(3, 'MongoDB Document Design & Aggregations', 'Master document nesting, indexing, and multi-stage aggregation pipelines.', 2, 15, 20.0, 0.5, 'active', 1);
      stmtQuiz.finalize();

      // Seed Questions for Quiz 1
      const stmtQ = database.prepare(
        'INSERT INTO questions (question_id, quiz_id, question_text, question_type, marks, negative_marks, question_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      stmtQ.run(1, 1, 'Which normal form eliminates partial dependency of non-prime attributes on any candidate key?', 'mcq', 5.0, 1.25, 1);
      stmtQ.run(2, 1, 'What does the "I" stand for in the ACID properties of relational databases?', 'mcq', 5.0, 1.25, 2);
      stmtQ.run(3, 1, 'In relational algebra, which operator performs a Cartesian product followed by a selection condition?', 'mcq', 5.0, 1.25, 3);
      stmtQ.run(4, 1, 'Which database index structure is most commonly utilized in MySQL InnoDB for primary keys?', 'mcq', 5.0, 1.25, 4);
      stmtQ.run(5, 1, 'A relation is in Boyce-Codd Normal Form (BCNF) if and only if for every non-trivial functional dependency X -> Y:', 'mcq', 5.0, 1.25, 5);
      stmtQ.finalize();

      // Seed Options for Quiz 1
      const stmtOpt = database.prepare(
        'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)'
      );
      stmtOpt.run(1, 'First Normal Form (1NF)', 0);
      stmtOpt.run(1, 'Second Normal Form (2NF)', 1);
      stmtOpt.run(1, 'Third Normal Form (3NF)', 0);
      stmtOpt.run(1, 'Fourth Normal Form (4NF)', 0);

      stmtOpt.run(2, 'Integrity', 0);
      stmtOpt.run(2, 'Isolation', 1);
      stmtOpt.run(2, 'Iteration', 0);
      stmtOpt.run(2, 'Immutability', 0);

      stmtOpt.run(3, 'Theta Join (Condition Join)', 1);
      stmtOpt.run(3, 'Projection', 0);
      stmtOpt.run(3, 'Natural Difference', 0);
      stmtOpt.run(3, 'Outer Union', 0);

      stmtOpt.run(4, 'Hash Index', 0);
      stmtOpt.run(4, 'B+ Tree Index', 1);
      stmtOpt.run(4, 'Bitmap Index', 0);
      stmtOpt.run(4, 'R-Tree Index', 0);

      stmtOpt.run(5, 'Y is a prime attribute', 0);
      stmtOpt.run(5, 'X is a Superkey', 1);
      stmtOpt.run(5, 'X is a foreign key', 0);
      stmtOpt.run(5, 'Y functionally determines X', 0);
      stmtOpt.finalize();

      // Initial results
      const stmtRes = database.prepare(
        'INSERT INTO quiz_results (quiz_id, user_id, score, total_questions, correct_answers, incorrect_answers, unanswered_questions, time_taken_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      stmtRes.run(1, 2, 23.75, 5, 5, 0, 0, 412);
      stmtRes.run(1, 3, 18.5, 5, 4, 1, 0, 530);
      stmtRes.finalize((err) => {
        if (err) return reject(err);
        console.log('✅ [Relational Engine] Local 3NF relational schema and demo data initialized.');
        resolve();
      });
    });
  });
}

/**
 * Normalizes SQL queries across MySQL and SQLite syntaxes
 */
function translateQuery(sql) {
  let cleaned = sql;

  // Adapt MySQL ON DUPLICATE KEY UPDATE in quiz_participants
  if (cleaned.includes('ON DUPLICATE KEY UPDATE status = VALUES(status)')) {
    cleaned = cleaned.replace(
      'ON DUPLICATE KEY UPDATE status = VALUES(status)',
      'ON CONFLICT(quiz_id, user_id) DO UPDATE SET status = excluded.status'
    );
  }

  // Adapt MySQL ON DUPLICATE KEY UPDATE in quiz_results
  if (cleaned.includes('ON DUPLICATE KEY UPDATE')) {
    cleaned = cleaned.replace(
      /ON DUPLICATE KEY UPDATE[\s\S]*$/,
      `ON CONFLICT(quiz_id, user_id) DO UPDATE SET
        score = excluded.score,
        total_questions = excluded.total_questions,
        correct_answers = excluded.correct_answers,
        incorrect_answers = excluded.incorrect_answers,
        unanswered_questions = excluded.unanswered_questions,
        time_taken_seconds = excluded.time_taken_seconds,
        submitted_at = CURRENT_TIMESTAMP`
    );
  }

  return cleaned;
}

function querySqlite(sql, params = []) {
  const database = getDb();
  const translated = translateQuery(sql);
  const trimmed = translated.trim();
  const isSelect = /^SELECT\b/i.test(trimmed);

  return new Promise((resolve, reject) => {
    if (isSelect) {
      database.all(translated, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    } else {
      database.run(translated, params, function (err) {
        if (err) return reject(err);
        resolve({
          insertId: this.lastID,
          affectedRows: this.changes,
        });
      });
    }
  });
}

async function withTransactionSqlite(callback) {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.serialize(async () => {
      database.run('BEGIN TRANSACTION', async (beginErr) => {
        if (beginErr) return reject(beginErr);

        const connectionProxy = {
          execute: async (sql, params = []) => {
            const res = await querySqlite(sql, params);
            return [res];
          },
        };

        try {
          const result = await callback(connectionProxy);
          database.run('COMMIT', (commitErr) => {
            if (commitErr) return reject(commitErr);
            resolve(result);
          });
        } catch (execErr) {
          database.run('ROLLBACK', () => {
            reject(execErr);
          });
        }
      });
    });
  });
}

module.exports = {
  initSqlite,
  querySqlite,
  withTransactionSqlite,
};
