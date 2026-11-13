-- =============================================================================
-- Online Quiz Platform with Real-Time Leaderboard
-- MySQL Database Schema Definition (3NF Compliant)
-- Primary Relational Database for Structured Transactional Data
-- =============================================================================

CREATE DATABASE IF NOT EXISTS quiz_platform_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE quiz_platform_db;

-- -----------------------------------------------------------------------------
-- 1. Users Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email),
    INDEX idx_users_role (role),
    INDEX idx_users_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Categories Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_category_name UNIQUE (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Quizzes Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
    quiz_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    category_id INT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 15,
    total_marks DECIMAL(6,2) NOT NULL DEFAULT 100.00,
    negative_marking DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    start_time DATETIME NULL,
    end_time DATETIME NULL,
    status ENUM('draft', 'active', 'inactive', 'archived') NOT NULL DEFAULT 'active',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quizzes_category FOREIGN KEY (category_id) 
        REFERENCES categories(category_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_quizzes_creator FOREIGN KEY (created_by) 
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_quizzes_status (status),
    INDEX idx_quizzes_category (category_id),
    INDEX idx_quizzes_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Questions Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('mcq', 'true_false') NOT NULL DEFAULT 'mcq',
    marks DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    negative_marks DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    question_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_questions_quiz FOREIGN KEY (quiz_id) 
        REFERENCES quizzes(quiz_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_questions_quiz_order (quiz_id, question_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Options Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS options (
    option_id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_options_question FOREIGN KEY (question_id) 
        REFERENCES questions(question_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_options_question (question_id),
    INDEX idx_options_correct (question_id, is_correct)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Quiz Participants Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_participants (
    participant_id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('started', 'completed', 'abandoned', 'expired') NOT NULL DEFAULT 'started',
    CONSTRAINT fk_participants_quiz FOREIGN KEY (quiz_id) 
        REFERENCES quizzes(quiz_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_participants_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_participant_quiz_user UNIQUE (quiz_id, user_id),
    INDEX idx_participants_status (status),
    INDEX idx_participants_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Quiz Results Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_results (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    user_id INT NOT NULL,
    score DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    total_questions INT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    incorrect_answers INT NOT NULL DEFAULT 0,
    unanswered_questions INT NOT NULL DEFAULT 0,
    time_taken_seconds INT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_results_quiz FOREIGN KEY (quiz_id) 
        REFERENCES quizzes(quiz_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_results_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_results_quiz_user UNIQUE (quiz_id, user_id),
    INDEX idx_results_quiz_score (quiz_id, score DESC, time_taken_seconds ASC),
    INDEX idx_results_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

