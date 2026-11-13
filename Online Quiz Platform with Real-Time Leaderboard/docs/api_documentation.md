# REST API Documentation

**Base URL**: `http://localhost:5000/api`  
**Authentication**: Bearer Token (`Authorization: Bearer <JWT_TOKEN>`)

---

## 1. Authentication Endpoints (`/auth`)

### 1.1 Register User
- **Method**: `POST /auth/register`
- **Body**:
  ```json
  {
    "name": "Rahul Sharma",
    "email": "rahul@student.com",
    "password": "password123",
    "role": "student"
  }
  ```
- **Response** `201 Created`:
  ```json
  {
    "success": true,
    "message": "Registration successful.",
    "data": {
      "user": { "userId": 2, "name": "Rahul Sharma", "email": "rahul@student.com", "role": "student" },
      "token": "eyJhbGciOiJIUz..."
    }
  }
  ```

### 1.2 Login User
- **Method**: `POST /auth/login`
- **Body**:
  ```json
  {
    "email": "admin@quiz.com",
    "password": "password123"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "data": {
      "user": { "userId": 1, "name": "Admin Professor", "email": "admin@quiz.com", "role": "admin" },
      "token": "eyJhbGciOiJIUz..."
    }
  }
  ```

---

## 2. Quiz Management (`/quizzes`)

### 2.1 Get All Quizzes
- **Method**: `GET /quizzes?categoryId=1&search=normalization`
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "quiz_id": 1,
        "title": "DBMS Relational Algebra & Normalization",
        "category_name": "Database Management Systems",
        "duration_minutes": 15,
        "total_marks": 25.0,
        "negative_marking": 0.25,
        "status": "active"
      }
    ]
  }
  ```

### 2.2 Create Quiz (Admin Only)
- **Method**: `POST /quizzes`
- **Headers**: `Authorization: Bearer <ADMIN_JWT>`
- **Body**:
  ```json
  {
    "title": "Distributed Query Processing",
    "description": "Two-phase commit, distributed transactions & sharding.",
    "categoryId": 1,
    "durationMinutes": 20,
    "totalMarks": 30.0,
    "negativeMarking": 0.5,
    "status": "active"
  }
  ```

---

## 3. Quiz Participation & Redis Session (`/attempts`)

### 3.1 Join Quiz (Creates Redis TTL Session)
- **Method**: `POST /attempts/:quizId/join`
- **Headers**: `Authorization: Bearer <STUDENT_JWT>`
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "message": "Quiz session started successfully.",
    "data": {
      "quiz": { "quizId": 1, "title": "DBMS Normalization", "durationMinutes": 15 },
      "session": { "startTime": 1731510000000, "deadline": 1731510900000, "remainingSeconds": 900 },
      "questions": [
        {
          "question_id": 1,
          "question_text": "Which normal form eliminates partial dependency...",
          "marks": 5.0,
          "options": [
            { "option_id": 1, "option_text": "1NF" },
            { "option_id": 2, "option_text": "2NF" }
          ]
        }
      ]
    }
  }
  ```
  *(Note: `is_correct` attribute is strictly omitted to prevent answer tampering).*

### 3.2 Record Ephemeral Answer (Redis Session)
- **Method**: `POST /attempts/:quizId/answer`
- **Body**:
  ```json
  {
    "questionId": 1,
    "selectedOptionId": 2
  }
  ```

### 3.3 Submit Quiz (ACID MySQL + MongoDB Audit + Redis ZSET)
- **Method**: `POST /attempts/:quizId/submit`
- **Body**:
  ```json
  {
    "answers": {
      "1": 2,
      "2": 6
    }
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "score": 25.0,
      "totalMarks": 25.0,
      "correctAnswers": 5,
      "incorrectAnswers": 0,
      "rank": 1,
      "totalParticipants": 14
    }
  }
  ```

---

## 4. Leaderboard (`/leaderboard`)

### 4.1 Get Top 10 Live Leaderboard
- **Method**: `GET /leaderboard/:quizId?limit=10`
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "quizId": 1,
      "totalParticipants": 2,
      "leaderboard": [
        { "rank": 1, "userId": 2, "name": "Rahul Sharma", "score": 23.75 },
        { "rank": 2, "userId": 3, "name": "Priya Patel", "score": 18.5 }
      ]
    }
  }
  ```
