import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { attemptAPI, leaderboardAPI } from '../services/api';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  Award,
  Zap,
  BarChart,
} from 'lucide-react';

export const QuizResult = () => {
  const { quizId } = useParams();
  const [result, setResult] = useState(null);
  const [rankInfo, setRankInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResult() {
      try {
        const [res, rankRes] = await Promise.all([
          attemptAPI.getResult(quizId),
          leaderboardAPI.getMyRank(quizId),
        ]);
        if (res.success) setResult(res.data);
        if (rankRes.success) setRankInfo(rankRes.data);
      } catch (err) {
        console.error('Error fetching result:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadResult();
  }, [quizId]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 glass-panel rounded-2xl text-center">
        <HelpCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">No Submission Found</h3>
        <p className="text-xs text-slate-400 mt-1 mb-6">You haven't completed this quiz yet.</p>
        <Link to={`/quiz/${quizId}`} className="px-4 py-2 bg-emerald-600 rounded-xl text-xs font-bold text-white">
          Take Quiz Now
        </Link>
      </div>
    );
  }

  const accuracy =
    result.total_questions > 0
      ? Math.round((result.correct_answers / result.total_questions) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Celebration Header Card */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-tr from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/20 shadow-2xl text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 mx-auto mb-4 shadow-xl shadow-amber-500/20">
          <Trophy className="w-10 h-10" />
        </div>
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          Assessment Evaluated & Committed
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">{result.quiz_title}</h1>
        <p className="text-xs text-slate-400 mt-1">
          Relational transaction committed in MySQL · Attempt audited in MongoDB · Ranked in Redis
        </p>

        {/* Big Score Display */}
        <div className="mt-6 inline-flex flex-col items-center bg-slate-900/80 px-8 py-4 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Final Certified Score</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl sm:text-5xl font-extrabold text-emerald-400 font-mono">{result.score}</span>
            <span className="text-slate-500 text-lg font-mono">/ {result.total_marks}</span>
          </div>
        </div>
      </div>

      {/* Metrics Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 text-center">
          <Award className="w-6 h-6 text-amber-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Live Rank</p>
          <h3 className="text-2xl font-extrabold text-white font-mono mt-1">
            {rankInfo?.rank ? `#${rankInfo.rank}` : 'Unranked'}
          </h3>
          <span className="text-[10px] text-slate-500">out of {rankInfo?.totalParticipants || 1}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Correct Answers</p>
          <h3 className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            {result.correct_answers}
          </h3>
          <span className="text-[10px] text-slate-500">+{result.correct_answers * 5} marks</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 text-center">
          <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Incorrect</p>
          <h3 className="text-2xl font-extrabold text-red-400 font-mono mt-1">
            {result.incorrect_answers}
          </h3>
          <span className="text-[10px] text-slate-500">accuracy penalty</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 text-center">
          <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Time Taken</p>
          <h3 className="text-2xl font-extrabold text-white font-mono mt-1">
            {Math.floor(result.time_taken_seconds / 60)}m {result.time_taken_seconds % 60}s
          </h3>
          <span className="text-[10px] text-slate-500">deterministic tie-breaker</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to={`/quiz/${quizId}/leaderboard`}
          className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 transition-all"
        >
          <Trophy className="w-4 h-4" />
          View Live Real-Time Leaderboard
        </Link>
        <Link
          to="/dashboard"
          className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-2 transition-all"
        >
          Back to Dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
