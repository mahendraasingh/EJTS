import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI } from '../services/api';
import { History, Award, Clock, ArrowRight, CheckCircle2, XCircle, FileText } from 'lucide-react';

export const StudentHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await analyticsAPI.getMyHistory();
        if (res.success) setHistory(res.data);
      } catch (err) {
        console.error('Failed to load history:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <History className="w-7 h-7 text-emerald-400" />
            My Quiz Attempt History
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Persisted in MongoDB Document Collection (<code className="text-emerald-400 font-mono">quiz_attempts</code>)
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/70 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-6">Attempt ID</th>
                <th className="py-3 px-6">Quiz Title</th>
                <th className="py-3 px-6">Category</th>
                <th className="py-3 px-6">Score</th>
                <th className="py-3 px-6">Correct/Wrong</th>
                <th className="py-3 px-6">Time Taken</th>
                <th className="py-3 px-6">Submitted At</th>
                <th className="py-3 px-6 text-right">Leaderboard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {history.length > 0 ? (
                history.map((att) => (
                  <tr key={att.attemptId} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">{att.attemptId}</td>
                    <td className="py-3.5 px-6 font-semibold text-white">{att.quizTitle}</td>
                    <td className="py-3.5 px-6">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {att.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-bold text-emerald-400 font-mono">
                      {att.score} / {att.totalMarks}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="text-emerald-400 font-bold">{att.correctCount}</span> /{' '}
                      <span className="text-red-400 font-bold">{att.incorrectCount}</span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-400">
                      {Math.floor(att.timeTaken / 60)}m {att.timeTaken % 60}s
                    </td>
                    <td className="py-3.5 px-6 text-slate-400">{new Date(att.submittedAt).toLocaleString()}</td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        to={`/quiz/${att.quizId}/leaderboard`}
                        className="text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline"
                      >
                        View Rank →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No attempts recorded yet.
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

