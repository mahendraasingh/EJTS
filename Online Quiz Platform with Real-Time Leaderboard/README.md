# 🏆 Online Quiz Platform with Real-Time Leaderboard

A modern, full-stack enterprise web application specifically engineered as a **College Database Management Systems (DBMS) Capstone Project**. It explicitly demonstrates the distinct roles, integration patterns, and architectural advantages of **three database paradigms**:

1. **MySQL 8 (Relational DBMS)**: 3NF normalized tables for structured business entities, foreign keys, constraints, and ACID transactions for certified results.
2. **Redis 7 (In-Memory Key-Value & Data Structures)**: $O(\log N)$ real-time leaderboard rankings using Sorted Sets (ZSET) with deterministic tie-breaking, ephemeral quiz sessions using TTL expiration, and metadata caching.
3. **MongoDB 7 (Document Database)**: Granular student attempt documents, question-level response audits, and multi-stage analytical aggregation pipelines (`$match`, `$group`, `$unwind`, `$lookup`, `$avg`).

---

## 🌟 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router DOM, Axios, Socket.IO Client, Recharts, Lucide React |
| **Backend** | Node.js, Express.js, Socket.IO, JWT, bcryptjs, Morgan, Express-Validator |
| **Relational Database** | MySQL 8 with `mysql2/promise` connection pooling & managed transactions |
| **In-Memory Database** | Redis 7 with `ioredis` Sorted Sets & TTL |
| **Document Database** | MongoDB 7 with `mongoose` & Aggregation Framework |
| **DevOps & Tooling** | Docker Compose, Postman Collection, Git |

---

## 🏗️ Tri-Database Separation of Responsibilities

```
                                      +------------------------------------+
                                      |          React 18 Client           |
                                      +-----------------+------------------+
                                                        |
                                           REST API & WebSockets
                                                        v
                                      +-----------------+------------------+
                                      |      Node.js / Express Server      |
                                      +---+-------------+--------------+---+
                                          |             |              |
                      +-------------------+             |              +-------------------+
                      | (Relational / ACID)             | (In-Memory)                      | (Documents / Analytics)
                      v                                 v                                  v
+-----------------------------+       +-----------------------------+       +-----------------------------+
|           MySQL 8           |       |           Redis 7           |       |          MongoDB 7          |
+-----------------------------+       +-----------------------------+       +-----------------------------+
| • users (Authentication)    |       | • leaderboard:quiz:{id}     |       | • quiz_attempts             |
| • categories                |       |   (Sorted Sets - ZSET)      |       |   (Detailed question audits)|
| • quizzes & questions       |       | • quiz:session:{uid}:{qid}  |       | • Aggregation Pipelines:    |
| • options (Answers hidden)  |       |   (TTL Auto-Expiration)     |       |   - $unwind: "$answers"     |
| • quiz_results (ACID commit)|       | • cache:quiz:{id}           |       |   - $group: Question Acc%   |
+-----------------------------+       +-----------------------------+       +-----------------------------+
```

---

## ⚡ Quick Start Guide

### Option 1: Using Docker Compose (Recommended)

1. Ensure Docker Desktop is running.
2. In the project root, execute:
   ```bash
   docker-compose up -d --build
   ```
3. Access services:
   - **Frontend Application**: `http://localhost:5173`
   - **Backend REST API**: `http://localhost:5000`
   - **MySQL Relational DB**: `localhost:3306`
   - **Redis Cache**: `localhost:6379`
   - **MongoDB Document DB**: `localhost:27017`

---

### Option 2: Running Locally on Windows / Host

#### 1. Setup Backend:
```powershell
cd server
npm install
copy .env.example .env
```
Ensure your local MySQL, Redis, and MongoDB services are active, then run the database seeder:
```powershell
npm run seed
```
Start the development server:
```powershell
npm run dev
```

#### 2. Setup Frontend:
Open a separate terminal window:
```powershell
cd client
npm install
copy .env.example .env
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔑 Pre-Configured Demo Accounts

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@quiz.com` | `password123` | Full access: Create/edit quizzes, questions, view aggregation analytics |
| **Student 1** | `rahul@student.com` | `password123` | Attempt quizzes, live timer, leaderboard rankings, history |
| **Student 2** | `priya@student.com` | `password123` | Attempt quizzes, live timer, leaderboard rankings, history |

*(You can also click the quick **Demo Admin** or **Demo Student** autofill buttons on the login screen).*

---

## 📚 Academic DBMS Defense Concepts Demonstrated

1. **Relational Schema Normalization (3NF)**:
   - Eliminates insertion, update, and deletion anomalies.
   - Questions and options are normalized into separate relational tables rather than embedded comma-separated arrays.
2. **ACID Transactions**:
   - `resultRepository.saveResultTransactional()` employs managed `START TRANSACTION`, `COMMIT`, and `ROLLBACK` blocks to ensure results and participant state commit atomically.
3. **Redis Sorted Sets (ZSET) & Tie-Breaking**:
   - Calculates ranking in $O(\log N)$ time using `ZADD` and `ZREVRANGE ... WITHSCORES`.
   - Deterministic tie-breaking formula: $\text{Raw Score} + \frac{2\times 10^{12} - \text{Timestamp}}{10^{13}}$ ensures that equal scores rank by earlier submission timestamp.
4. **Redis Ephemeral Sessions via TTL**:
   - Creates `quiz:session:{userId}:{quizId}` with automatic key expiration (`SETEX`), preventing abandoned sessions from leaking server memory.
5. **MongoDB Aggregation Pipelines**:
   - Multi-stage pipelines using `$match`, `$group`, `$unwind`, and `$project` to calculate question-level accuracy percentages and category distributions.

---

## 📁 Repository Documentation Deliverables

- [docs/architecture.md](docs/architecture.md): Full architectural diagrams and data flow sequences.
- [docs/database_design.md](docs/database_design.md): ER diagrams in Mermaid, 3NF normalization breakdown, and index tables.
- [docs/api_documentation.md](docs/api_documentation.md): Comprehensive REST API specifications.
- [docs/postman_collection.json](docs/postman_collection.json): Importable Postman collection.
- [database/mysql_schema.sql](database/mysql_schema.sql): Complete MySQL DDL definitions.
- [database/mysql_seed.sql](database/mysql_seed.sql): Rich demo datasets and questions.
- [database/mongodb_sample_data.json](database/mongodb_sample_data.json): Sample attempt documents.
