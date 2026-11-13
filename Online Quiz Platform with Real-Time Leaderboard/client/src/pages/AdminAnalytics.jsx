import React, { useState, useEffect } from 'react';
import { analyticsAPI, quizAPI } from '../services/api';
import {
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  HelpCircle,
  Award,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const AdminAnalytics = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [quizAnalytics, setQuizAnalytics] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Colors for Category Pie Chart
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  useEffect(() => {
    async function loadInitial() {
      try {
        const [qRes, catRes] = await Promise.all([
          quizAPI.getAll(),
          analyticsAPI.getCategoryPerformance(),
        ]);
        if (qRes.success && qRes.data.length > 0) {
          setQuizzes(qRes.data);
          setSelectedQuizId(qRes.data[0].quiz_id);
        }
        if (catRes.success) {
          setCategoryData(catRes.data);
        }
      } catch (err) {
        console.error('Failed to load initial analytics:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  useEffect(() => {
    if (!selectedQuizId) return;
    async function loadQuizStats() {
      try {
        const res = await analyticsAPI.getQuizAnalytics(selectedQuizId);
        if (res.success) setQuizAnalytics(res.data);
      } catch (err) {
        console.error('Failed to load quiz analytics:', err.message);
      }
    }
    loadQuizStats();
  }, [selectedQuizId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const accuracyChartData =
    quizAnalytics?.questionAccuracy?.map((qa, idx) => ({
      name: `Q${idx + 1}`,
      question: qa.questionText,
      accuracy: qa.accuracyPercentage,
      correct: qa.correctCount,
      incorrect: qa.incorrectCount,
    })) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            MongoDB Aggregation Pipelines
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Academic DBMS Analytical Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline transformations ($match, $group, $unwind, $lookup, $avg) on MongoDB attempt documents
          </p>
        </div>

        {/* Quiz Selector */}
        <div className="w-full sm:w-72">
          <label className="block text-[11px] font-mono text-slate-400 mb-1">Select Quiz for Drilldown:</label>
          <select
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {quizzes.map((q) => (
              <option key={q.quiz_id} value={q.quiz_id}>
                {q.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards for Selected Quiz */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 text-center">
          <p className="text-xs text-slate-400">Total Submissions</p>
          <h3 className="text-2xl font-extrabold text-white font-mono mt-1">
            {quizAnalytics?.summary?.totalSubmissions || 0}
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">$group & $sum</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 text-center">
          <p className="text-xs text-slate-400">Average Score</p>
          <h3 className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            {parseFloat(quizAnalytics?.summary?.avgScore || 0).toFixed(2)}
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">$avg stage</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 text-center">
          <p className="text-xs text-slate-400">Highest Score</p>
          <h3 className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
            {quizAnalytics?.summary?.maxScore || 0}
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">$max accumulator</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 text-center">
          <p className="text-xs text-slate-400">Lowest Score</p>
          <h3 className="text-2xl font-extrabold text-red-400 font-mono mt-1">
            {quizAnalytics?.summary?.minScore || 0}
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">$min accumulator</span>
        </div>
      </div>

      {/* Charts Grid: Question Accuracy ($unwind) & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Question Accuracy Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="mb-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Question Accuracy Rate (%)
            </h2>
            <p className="text-xs text-slate-400">
              Computed via MongoDB <code className="text-emerald-400 font-mono">$unwind: "$answers"</code> and grouped by questionId
            </p>
          </div>

          <div className="h-72 w-full">
            {accuracyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accuracyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Bar dataKey="accuracy" name="Accuracy %" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No attempt data available to compute question accuracy for this quiz.
              </div>
            )}
          </div>
        </div>

        {/* Category Performance Pie Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Category Breakdown
            </h2>
            <p className="text-xs text-slate-400">
              Volume across curriculum topics
            </p>
          </div>

          <div className="h-56 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="totalAttempts"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={40}
                    paddingAngle={4}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No category data.
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-4 border-t border-slate-800 text-xs">
            {categoryData.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="truncate max-w-[150px]">{c.category}</span>
                </span>
                <span className="font-mono font-bold text-white">{c.totalAttempts} att.</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question Accuracy Detailed Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">Question-wise Granular Accuracy Audit</h2>
          <p className="text-xs text-slate-400">Identifies easiest and hardest questions for curriculum tuning</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/70 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-6">Q#</th>
                <th className="py-3 px-6">Question Text</th>
                <th className="py-3 px-6">Total Responses</th>
                <th className="py-3 px-6">Correct</th>
                <th className="py-3 px-6">Incorrect</th>
                <th className="py-3 px-6 text-right">Accuracy Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {quizAnalytics?.questionAccuracy?.map((qa, idx) => (
                <tr key={qa.questionId} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-6 font-mono text-slate-500">Q{idx + 1}</td>
                  <td className="py-3.5 px-6 font-medium text-white max-w-md truncate">{qa.questionText}</td>
                  <td className="py-3.5 px-6 font-mono">{qa.totalAnswered}</td>
                  <td className="py-3.5 px-6 font-mono text-emerald-400 font-bold">{qa.correctCount}</td>
                  <td className="py-3.5 px-6 font-mono text-red-400 font-bold">{qa.incorrectCount}</td>
                  <td className="py-3.5 px-6 text-right font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        qa.accuracyPercentage >= 70
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : qa.accuracyPercentage >= 40
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {qa.accuracyPercentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
