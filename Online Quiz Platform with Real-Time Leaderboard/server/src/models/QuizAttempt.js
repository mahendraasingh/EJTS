/**
 * MongoDB QuizAttempt Model
 * Stores comprehensive audit records of completed student attempts,
 * question-level responses, and provides data source for aggregation reporting pipelines.
 */
const mongoose = require('mongoose');

const AnswerRecordSchema = new mongoose.Schema(
  {
    questionId: {
      type: Number,
      required: true,
      index: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    selectedOptionId: {
      type: Number,
      default: null,
    },
    isCorrect: {
      type: Boolean,
      required: true,
      default: false,
    },
    marksAwarded: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const QuizAttemptSchema = new mongoose.Schema(
  {
    attemptId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    quizId: {
      type: Number,
      required: true,
      index: true,
    },
    quizTitle: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: 'General',
    },
    startedAt: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    timeTaken: {
      type: Number,
      required: true,
      default: 0, // In seconds
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    incorrectCount: {
      type: Number,
      default: 0,
    },
    unansweredCount: {
      type: Number,
      default: 0,
    },
    answers: [AnswerRecordSchema],
  },
  {
    timestamps: true,
    collection: 'quiz_attempts',
  }
);

// Compound indexes for analytical queries and performance
QuizAttemptSchema.index({ userId: 1, quizId: 1 });
QuizAttemptSchema.index({ quizId: 1, score: -1, timeTaken: 1 });
QuizAttemptSchema.index({ quizId: 1, submittedAt: -1 });

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);
