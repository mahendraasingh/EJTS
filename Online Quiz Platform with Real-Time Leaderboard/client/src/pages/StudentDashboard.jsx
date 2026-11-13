import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { quizAPI, analyticsAPI } from '../services/api';
import {
  Trophy,
  Award,
  Clock,
  Target,
  ArrowRight,
  Play,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsRes, quizzesRes, historyRes] = await Promise.all([
          analyticsAPI.getMyPerformance(),
          quizAPI.getAll({ status: 'active', limit: 4 }),
          analyticsAPI.getMyHistory(),
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (quizzesRes.success) setQuizzes(quizzesRes.data);
        if (historyRes.success) setHistory(historyRes.data);
      } catch (err) {
        console.error('Dashboard loading error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Chart data from attempt history
  const chartData = history
    .slice(0, 7)
    .reverse()
    .map((item, idx) => ({
      name: `Quiz ${idx + 1}`,
      title: item.quizTitle,
      score: item.score,
      total: item.totalMarks,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/20 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
            <Trophy className="w-3.5 h-3.5" />
            Active Competitive Season
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{user?.name}</span>!
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Participate in live timed quizzes, test your database & architecture mastery, and monitor your live rank on the Redis-powered leaderboard.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/quizzes"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              Explore Active Quizzes
            </Link>
            <Link
              to="/history"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-all"
            >
              View Full History
            </Link>
          </div>
        </div>
        {/* Glow decoration */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Quizzes Attempted</p>
            <h3 className="text-2xl font-bold text-white">{stats?.totalQuizzesAttempted || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Average Score</p>
            <h3 className="text-2xl font-bold text-white">{stats?.averageScore || 0} <span className="text-xs text-slate-400 font-normal">pts</span></h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Overall Accuracy</p>
            <h3 className="text-2xl font-bold text-white">{stats?.accuracyRate || 0}%</h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Time Spent</p>
            <h3 className="text-2xl font-bold text-white">
              {Math.round((stats?.totalTimeSpentSeconds || 0) / 60)} <span className="text-xs text-slate-400 font-normal">mins</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Performance Chart & Available Quizzes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart (MongoDB Aggregation Data) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Score Performance Trend
              </h2>
              <p className="text-xs text-slate-400">
                Generated from MongoDB historical audit documents
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#scoreGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-sm">No completed quiz attempts recorded yet.</p>
                <Link to="/quizzes" className="text-xs text-emerald-400 hover:underline mt-1">Take your first quiz</Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Available Quizzes Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Recommended Quizzes</h2>
            <Link to="/quizzes" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {quizzes.map((quiz) => (
              <div
                key={quiz.quiz_id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {quiz.category_name}
                  </span>
                  <h4 className="text-xs font-bold text-white truncate mt-1">{quiz.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{quiz.duration_minutes} mins · {quiz.total_marks} marks</p>
                </div>
                <Link
                  to={`/quiz/${quiz.quiz_id}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition-colors shadow-md shadow-emerald-600/10"
                >
                  Start
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Attempts Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Recent Quiz Attempts</h2>
            <p className="text-xs text-slate-400">Recorded transactional submissions and live rankings</p>
          </div>
          <Link to="/history" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            View All History →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-6">Quiz Title</th>
                <th className="py-3 px-6">Score</th>
                <th className="py-3 px-6">Time Taken</th>
                <th className="py-3 px-6">Submitted Date</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {history.length > 0 ? (
                history.slice(0, 5).map((att) => (
                  <tr key={att.attemptId} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-white">{att.quizTitle}</td>
                    <td className="py-3.5 px-6">
                      <span className="font-bold text-emerald-400">{att.score}</span> / {att.totalMarks}
                    </td>
                    <td className="py-3.5 px-6 text-slate-400">{Math.floor(att.timeTaken / 60)}m {att.timeTaken % 60}s</td>
                    <td className="py-3.5 px-6 text-slate-400">{new Date(att.submittedAt).toLocaleDateString()}</td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        to={`/quiz/${att.quizId}/leaderboard`}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        View Leaderboard
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No completed quiz attempts found. Join a quiz to see your scores!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
