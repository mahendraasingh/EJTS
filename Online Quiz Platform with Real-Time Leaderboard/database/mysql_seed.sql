-- =============================================================================
-- Online Quiz Platform with Real-Time Leaderboard
-- MySQL Seed Data
-- =============================================================================

USE quiz_platform_db;

-- Clear previous data in correct foreign key order
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE quiz_results;
TRUNCATE TABLE quiz_participants;
TRUNCATE TABLE options;
TRUNCATE TABLE questions;
TRUNCATE TABLE quizzes;
TRUNCATE TABLE categories;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Insert Users (Password is 'password123' for all demo accounts)
-- Bcrypt Hash for 'password123': $2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ekEY5k7rqepV361G2
-- -----------------------------------------------------------------------------
INSERT INTO users (user_id, name, email, password_hash, role) VALUES
(1, 'Admin Professor', 'admin@quiz.com', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ekEY5k7rqepV361G2', 'admin'),
(2, 'Rahul Sharma', 'rahul@student.com', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ekEY5k7rqepV361G2', 'student'),
(3, 'Priya Patel', 'priya@student.com', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ekEY5k7rqepV361G2', 'student'),
(4, 'Amit Verma', 'amit@student.com', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ekEY5k7rqepV361G2', 'student');

-- -----------------------------------------------------------------------------
-- 2. Insert Categories
-- -----------------------------------------------------------------------------
INSERT INTO categories (category_id, category_name, description) VALUES
(1, 'Database Management Systems', 'Relational database concepts, normalization, SQL, transactions, and ACID properties.'),
(2, 'NoSQL & In-Memory Databases', 'Redis key-value patterns, Sorted Sets, MongoDB document modeling, and aggregation pipelines.'),
(3, 'Computer Networks & Distributed Systems', 'Protocols, TCP/IP, WebSockets, client-server models, and latency optimization.');

-- -----------------------------------------------------------------------------
-- 3. Insert Quizzes
-- -----------------------------------------------------------------------------
INSERT INTO quizzes (quiz_id, title, description, category_id, duration_minutes, total_marks, negative_marking, status, created_by) VALUES
(1, 'DBMS Relational Algebra & Normalization', 'Test your understanding of Functional Dependencies, 1NF to BCNF, ACID transactions, and indexing.', 1, 15, 25.00, 0.25, 'active', 1),
(2, 'Redis In-Memory Architectures & Leaderboards', 'Evaluate skills on Redis data types, Sorted Sets (ZSET), TTL session caching, and pub/sub.', 2, 10, 20.00, 0.00, 'active', 1),
(3, 'MongoDB Document Design & Aggregations', 'Master document nesting, indexing, and multi-stage aggregation pipelines ($match, $group, $lookup).', 2, 15, 20.00, 0.50, 'active', 1);

-- -----------------------------------------------------------------------------
-- 4. Questions & Options for Quiz 1: DBMS Normalization (5 Questions, 5 Marks each)
-- -----------------------------------------------------------------------------
INSERT INTO questions (question_id, quiz_id, question_text, question_type, marks, negative_marks, question_order) VALUES
(1, 1, 'Which normal form eliminates partial dependency of non-prime attributes on any candidate key?', 'mcq', 5.00, 1.25, 1),
(2, 1, 'What does the "I" stand for in the ACID properties of relational databases?', 'mcq', 5.00, 1.25, 2),
(3, 1, 'In relational algebra, which operator performs a Cartesian product followed by a selection condition?', 'mcq', 5.00, 1.25, 3),
(4, 1, 'Which database index structure is most commonly utilized in MySQL InnoDB for primary keys?', 'mcq', 5.00, 1.25, 4),
(5, 1, 'A relation is in Boyce-Codd Normal Form (BCNF) if and only if for every non-trivial functional dependency X -> Y:', 'mcq', 5.00, 1.25, 5);

INSERT INTO options (question_id, option_text, is_correct) VALUES
-- Q1 Options
(1, 'First Normal Form (1NF)', FALSE),
(1, 'Second Normal Form (2NF)', TRUE),
(1, 'Third Normal Form (3NF)', FALSE),
(1, 'Fourth Normal Form (4NF)', FALSE),
-- Q2 Options
(2, 'Integrity', FALSE),
(2, 'Isolation', TRUE),
(2, 'Iteration', FALSE),
(2, 'Immutability', FALSE),
-- Q3 Options
(3, 'Theta Join (Condition Join)', TRUE),
(3, 'Projection', FALSE),
(3, 'Natural Difference', FALSE),
(3, 'Outer Union', FALSE),
-- Q4 Options
(4, 'Hash Index', FALSE),
(4, 'B+ Tree Index', TRUE),
(4, 'Bitmap Index', FALSE),
(4, 'R-Tree Index', FALSE),
-- Q5 Options
(5, 'Y is a prime attribute', FALSE),
(5, 'X is a Superkey', TRUE),
(5, 'X is a foreign key', FALSE),
(5, 'Y functionally determines X', FALSE);

-- -----------------------------------------------------------------------------
-- 5. Questions & Options for Quiz 2: Redis (4 Questions, 5 Marks each)
-- -----------------------------------------------------------------------------
INSERT INTO questions (question_id, quiz_id, question_text, question_type, marks, negative_marks, question_order) VALUES
(6, 2, 'Which Redis data structure is optimal for maintaining a real-time sorted leaderboard?', 'mcq', 5.00, 0.00, 1),
(7, 2, 'Which Redis command retrieves members in descending score order with their scores included?', 'mcq', 5.00, 0.00, 2),
(8, 2, 'How is automatic key expiration configured on a temporary session key in Redis?', 'mcq', 5.00, 0.00, 3),
(9, 2, 'What is the time complexity of adding a member to a Redis Sorted Set using ZADD?', 'mcq', 5.00, 0.00, 4);

INSERT INTO options (question_id, option_text, is_correct) VALUES
-- Q6 Options
(6, 'Redis Hash (HSET)', FALSE),
(6, 'Redis Sorted Set (ZSET)', TRUE),
(6, 'Redis List (LPUSH/RPUSH)', FALSE),
(6, 'Redis Bitfield', FALSE),
-- Q7 Options
(7, 'ZRANGEBYSCORE ... WITHSCORES', FALSE),
(7, 'ZREVRANGE ... WITHSCORES', TRUE),
(7, 'HGETALL', FALSE),
(7, 'ZSCAN ... REVERSE', FALSE),
-- Q8 Options
(8, 'SETTIMEOUT key ms', FALSE),
(8, 'EXPIRE key seconds', TRUE),
(8, 'DEL key AFTER seconds', FALSE),
(8, 'TTL SET key seconds', FALSE),
-- Q9 Options
(9, 'O(1)', FALSE),
(9, 'O(log(N)) where N is the number of elements', TRUE),
(9, 'O(N)', FALSE),
(9, 'O(N^2)', FALSE);

-- -----------------------------------------------------------------------------
-- 6. Questions & Options for Quiz 3: MongoDB (4 Questions, 5 Marks each)
-- -----------------------------------------------------------------------------
INSERT INTO questions (question_id, quiz_id, question_text, question_type, marks, negative_marks, question_order) VALUES
(10, 3, 'Which MongoDB aggregation stage is equivalent to an SQL JOIN operation across collections?', 'mcq', 5.00, 1.25, 1),
(11, 3, 'Which aggregation operator deconstructs an array field in documents to output a document for each element?', 'mcq', 5.00, 1.25, 2),
(12, 3, 'Which stage should ideally be placed at the very beginning of a pipeline for query optimization?', 'mcq', 5.00, 1.25, 3),
(13, 3, 'In Mongoose, what is the default unique identifier assigned to every newly created document?', 'mcq', 5.00, 1.25, 4);

INSERT INTO options (question_id, option_text, is_correct) VALUES
-- Q10 Options
(10, '$project', FALSE),
(10, '$lookup', TRUE),
(10, '$merge', FALSE),
(10, '$combine', FALSE),
-- Q11 Options
(11, '$explode', FALSE),
(11, '$unwind', TRUE),
(11, '$split', FALSE),
(11, '$flatten', FALSE),
-- Q12 Options
(12, '$match (to filter early using indexes)', TRUE),
(12, '$sort', FALSE),
(12, '$group', FALSE),
(12, '$project', FALSE),
-- Q13 Options
(13, '_uuid', FALSE),
(13, '_id (ObjectId)', TRUE),
(13, 'document_id', FALSE),
(13, 'primaryKey', FALSE);

-- -----------------------------------------------------------------------------
-- 7. Seed Sample Quiz Participants & Results
-- -----------------------------------------------------------------------------
INSERT INTO quiz_participants (participant_id, quiz_id, user_id, status) VALUES
(1, 1, 2, 'completed'),
(2, 1, 3, 'completed');

INSERT INTO quiz_results (result_id, quiz_id, user_id, score, total_questions, correct_answers, incorrect_answers, unanswered_questions, time_taken_seconds) VALUES
(1, 1, 2, 23.75, 5, 5, 0, 0, 412),
(2, 1, 3, 18.50, 5, 4, 1, 0, 530);
