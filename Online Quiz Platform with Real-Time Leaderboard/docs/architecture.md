# System Architecture & Tri-Database Integration

## 1. Architectural Overview

The **Online Quiz Platform with Real-Time Leaderboard** is an enterprise-grade full-stack web application architected specifically as a college Database Management Systems (DBMS) project. Its primary purpose is to demonstrate the distinct, non-overlapping architectural strengths of three major database paradigms:

1. **MySQL (Relational Database)**: Transactional integrity, ACID guarantees, 3NF schema, referential integrity.
2. **Redis (In-Memory Database)**: High-speed O(log N) Sorted Sets for real-time leaderboards, deterministic tie-breaking, TTL ephemeral session cleanup, and metadata caching.
3. **MongoDB (Document Database)**: Granular attempt history documents, answer audit trails, and multi-stage aggregation reporting pipelines ($match, $group, $unwind, $lookup, $avg).

---

## 2. System Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (React 18 + Vite + Tailwind CSS)"]
        UI_Student["Student UI\n(Dashboard, Quiz Engine, Podium)"]
        UI_Admin["Admin UI\n(Quiz Builder, Question Bank, Analytics)"]
        Socket_Client["Socket.IO Client\n(Real-Time Gateway)"]
    end

    subgraph APILayer ["Application & Gateway Layer (Node.js + Express + Socket.IO)"]
        Auth_Middleware["JWT Auth & Role Guard"]
        REST_Routers["REST API Routers\n(/quizzes, /attempts, /leaderboard)"]
        Socket_Server["Socket.IO Real-Time Engine\n(Rooms: quiz:id, leaderboard:id)"]
        Orchestrator["Submission Orchestrator & Reconciler"]
    end

    subgraph DataLayer ["Tri-Database Layer (Separation of Concerns)"]
        subgraph MySQL_DB ["MySQL 8 (Relational Core)"]
            T_Users["users"]
            T_Quizzes["quizzes"]
            T_Questions["questions & options"]
            T_Results["quiz_results (ACID)"]
        end

        subgraph Redis_DB ["Redis 7 (In-Memory Ephemeral & ZSET)"]
            K_Session["quiz:session:{user}:{quiz}\n(TTL Expiration)"]
            K_Leaderboard["leaderboard:quiz:{quiz}\n(ZSET with Tie-Breaker)"]
            K_Cache["cache:quiz:{id}\n(Metadata Cache)"]
        end

        subgraph Mongo_DB ["MongoDB 7 (Document & Aggregations)"]
            C_Attempts["quiz_attempts\n(Deep Answer Audits)"]
            C_Aggregations["Aggregation Engine\n($match, $group, $unwind)"]
        end
    end

    UI_Student -->|REST Calls| REST_Routers
    UI_Admin -->|REST Calls| REST_Routers
    Socket_Client <-->|WebSockets| Socket_Server

    REST_Routers --> Auth_Middleware
    Auth_Middleware --> Orchestrator

    Orchestrator -->|ACID Transactions| MySQL_DB
    Orchestrator -->|TTL Sessions & ZADD| Redis_DB
    Orchestrator -->|Audit Documents & Aggregations| Mongo_DB

    Orchestrator -->|Broadcast Event| Socket_Server
    Socket_Server -->|leaderboard_updated| Socket_Client
```

---

## 3. Separation of Database Responsibilities

| Dimension | MySQL 8 | Redis 7 | MongoDB 7 |
| :--- | :--- | :--- | :--- |
| **Data Model** | Relational Tables (Normalized 3NF) | Key-Value, Sorted Sets (ZSET), Hashes | Flexible Document JSON/BSON |
| **Primary Responsibility** | System of Record, User Accounts, Questions, Options, ACID Results | Sub-millisecond Leaderboard Ranking & Ephemeral TTL Sessions | Deep Question-Level Attempt Audit & Complex Analytical Aggregations |
| **Storage Mechanism** | Persistent Disk with InnoDB Buffer Pool | In-Memory with AOF / RDB Persistence | Memory-Mapped Persistent B-Trees |
| **Concurrency / ACID** | Full ACID (Atomicity, Consistency, Isolation, Durability) | Single-threaded atomic command execution | Document-level atomicity |
| **Academic Justification** | Prevents double submissions and ensures foreign key referential integrity | Eliminates costly SQL ORDER BY re-sorting on every live submission | Accommodates polymorphic question answer sets and unrolls arrays for item-level analysis |

---

## 4. Real-Time Data Flow During Quiz Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant React as React Client
    participant Express as Backend Express
    participant Redis as Redis (In-Memory)
    participant MySQL as MySQL (Relational)
    participant Mongo as MongoDB (Document)
    participant Sockets as Socket.IO Hub

    Student->>React: Clicks "Start Quiz"
    React->>Express: POST /api/attempts/:id/join
    Express->>MySQL: Check eligibility & fetch quiz metadata
    Express->>Redis: SETEX quiz:session:{uid}:{qid} TTL sessionData
    Express-->>React: Deliver questions (Answers MASKED)

    loop Answering Questions
        Student->>React: Selects Option A
        React->>Express: POST /api/attempts/:id/answer
        Express->>Redis: Update temporary answers map in session
    end

    Student->>React: Clicks "Submit Quiz"
    React->>Express: POST /api/attempts/:id/submit
    Express->>MySQL: Fetch correct answer key & evaluate score
    Express->>MySQL: START TRANSACTION -> INSERT quiz_results -> COMMIT
    Express->>Mongo: INSERT quiz_attempts (Full question responses)
    Express->>Redis: ZADD leaderboard:quiz:{id} compositeScore {uid}
    Express->>Redis: DEL quiz:session:{uid}:{qid}
    Express->>Sockets: Broadcast leaderboard_updated event
    Sockets-->>React: Real-time update to all connected leaderboard spectators
    Express-->>React: Certified score, rank, and metrics
```

---

## 5. Cross-Database Synchronization & Fault Tolerance

Because distributed transactions (two-phase commits) across relational, in-memory, and document stores introduce excessive latency, the system employs an **Idempotent Dual-Phase Architecture**:

1. **Authoritative Commitment**: The MySQL transaction commits first. If MySQL fails, the operation aborts cleanly and nothing is permanently recorded.
2. **Eventual Document & Cache Synchronization**:
   - MongoDB attempt insertion is executed within a try/catch guard.
   - Redis Sorted Set updates are executed next.
   - In the event of a cache or document network glitch, MySQL's certified result record remains intact. The `hydrateLeaderboardFromMySQL()` fallback method reconstructs Redis Sorted Sets on demand upon cache misses.

