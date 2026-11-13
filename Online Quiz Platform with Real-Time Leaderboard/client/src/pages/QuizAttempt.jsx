import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

export const QuizAttempt = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [error, setError] = useState('');

  const timerRef = useRef(null);

  // 1. Initialize Quiz Session
  useEffect(() => {
    async function initSession() {
      try {
        const res = await attemptAPI.joinQuiz(quizId);
        if (res.data?.isCompleted) {
          navigate(`/quiz/${quizId}/result`, { replace: true });
          return;
        }

        const { quiz: qData, session, questions: qList } = res.data;
        setQuiz(qData);
        setQuestions(qList);
        setAnswers(session.answers || {});

        const initialRemaining = Math.max(0, Math.floor((session.deadline - Date.now()) / 1000));
        setRemainingSeconds(initialRemaining);

        // Join Socket Room
        if (socket) {
          socket.emit('join_quiz', { quizId });
        }
      } catch (err) {
        setError(err.message || 'Unable to join or initialize quiz session.');
      } finally {
        setLoading(false);
      }
    }
    initSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizId, navigate, socket]);

  // 2. Countdown Timer
  useEffect(() => {
    if (remainingSeconds <= 0 || loading) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [remainingSeconds, loading]);

  // 3. Option Selection & Answer Recording in Redis Session
  const handleSelectOption = async (questionId, optionId) => {
    const updated = { ...answers, [questionId]: optionId };
    setAnswers(updated);

    try {
      // Ephemeral persistence in Redis
      await attemptAPI.recordAnswer(quizId, {
        questionId,
        selectedOptionId: optionId,
      });

      if (socket) {
        socket.emit('submit_answer', {
          quizId,
          questionId,
          selectedOptionId: optionId,
        });
      }
    } catch (err) {
      console.warn('Answer sync error:', err.message);
    }
  };

  // 4. Auto-submit on Timer Expiry
  const handleAutoSubmit = async () => {
    setAutoSubmitted(true);
    await performSubmission();
  };

  // 5. Final Submission
  const performSubmission = async () => {
    setSubmitting(true);
    setShowConfirmModal(false);
    try {
      const res = await attemptAPI.submitQuiz(quizId, { answers });
      if (res.success) {
        navigate(`/quiz/${quizId}/result`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to submit quiz. Please retry.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Initializing Redis session & delivering questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 glass-panel rounded-2xl border border-red-500/20 text-center">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Quiz Access Error</h3>
        <p className="text-xs text-slate-300 mb-6">{error}</p>
        <button
          onClick={() => navigate('/quizzes')}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700"
        >
          Return to Quizzes
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const isTimeCritical = remainingSeconds < 120; // less than 2 mins

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Bar with Timer */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Live Quiz Session
          </span>
          <h1 className="text-lg font-bold text-white mt-1">{quiz?.title}</h1>
        </div>

        {/* Live Countdown Timer */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-bold border transition-all ${
            isTimeCritical
              ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
              : 'bg-slate-900 border-slate-700 text-emerald-400'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{formatTime(remainingSeconds)}</span>
          <span className="text-[10px] text-slate-400 font-normal">Remaining</span>
        </div>
      </div>

      {/* Main Attempt Body */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question & Options Area */}
        <div className="lg:col-span-3 space-y-6">
          {currentQ && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6 text-xs text-slate-400">
                <span className="font-semibold text-slate-200">
                  Question <span className="text-emerald-400 font-bold">{currentIndex + 1}</span> of {questions.length}
                </span>
                <div className="flex items-center gap-3">
                  <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 font-mono text-emerald-400">
                    +{currentQ.marks} Marks
                  </span>
                  {parseFloat(currentQ.negative_marks) > 0 && (
                    <span className="bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 font-mono text-red-400">
                      -{currentQ.negative_marks} Neg
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <h2 className="text-base sm:text-lg font-semibold text-white leading-relaxed mb-8">
                {currentQ.question_text}
              </h2>

              {/* Multiple Choice Options */}
              <div className="space-y-3">
                {currentQ.options?.map((opt, oIdx) => {
                  const isSelected = answers[currentQ.question_id] === opt.option_id;
                  const optionLabel = String.fromCharCode(65 + oIdx); // A, B, C, D

                  return (
                    <button
                      key={opt.option_id}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.question_id, opt.option_id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {optionLabel}
                      </span>
                      <span className="text-sm font-medium pt-0.5 leading-normal">
                        {opt.option_text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-3">
                  {currentIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      Next Question
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      <Send className="w-4 h-4" />
                      Review & Submit
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right-Side Question Navigator Grid */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              Question Navigator
            </h3>

            {/* Grid of question buttons */}
            <div className="grid grid-cols-5 gap-2 mb-6">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.question_id] !== undefined;
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.question_id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg font-mono text-xs font-bold transition-all ${
                      isCurrent
                        ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 bg-emerald-500 text-white'
                        : isAnswered
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/50'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
                  Answered
                </span>
                <span className="font-mono font-bold text-white">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800" />
                  Unanswered
                </span>
                <span className="font-mono font-bold text-white">{unansweredCount}</span>
              </div>
            </div>

            {/* Submit Quiz Button */}
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={submitting}
              className="w-full mt-6 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Finish & Submit Quiz
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-2xl border border-slate-700 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Submit Quiz Attempt?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Once submitted, your responses will be evaluated and ranked on the live leaderboard.
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Total Questions:</span>
                <span className="font-bold text-white">{questions.length}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Answered:</span>
                <span className="font-bold">{answeredCount}</span>
              </div>
              {unansweredCount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Unanswered:</span>
                  <span className="font-bold">{unansweredCount}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
              >
                Continue Quiz
              </button>
              <button
                type="button"
                onClick={performSubmission}
                disabled={submitting}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

