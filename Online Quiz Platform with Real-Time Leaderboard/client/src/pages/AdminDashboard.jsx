import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI, quizAPI } from '../services/api';
import {
  ShieldCheck,
  Users,
  BookOpen,
  Award,
  BarChart3,
  PlusCircle,
  Database,
  Zap,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const [ovRes, stRes] = await Promise.all([
          analyticsAPI.getAdminOverview(),
          analyticsAPI.getAllStudents(),
        ]);
        if (ovRes.success) setOverview(ovRes.data);
        if (stRes.success) setStudents(stRes.data);
      } catch (err) {
        console.error('Failed to load admin stats:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Administrative Control Center
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System & DBMS Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage quizzes, questions, view student metrics, and audit cross-database aggregations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/quizzes"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Manage & Create Quizzes
          </Link>
          <Link
            to="/admin/analytics"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Aggregation Analytics
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Registered Students</p>
            <h3 className="text-2xl font-bold text-white">{overview?.totalStudents || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Active Quizzes</p>
            <h3 className="text-2xl font-bold text-white">{overview?.totalQuizzes || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Completed Attempts</p>
            <h3 className="text-2xl font-bold text-white">{overview?.totalAttempts || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Platform Average Score</p>
            <h3 className="text-2xl font-bold text-white">{overview?.averageScore || 0} <span className="text-xs text-slate-400 font-normal">pts</span></h3>
          </div>
        </div>
      </div>

      {/* Tri-Database Responsibilities Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white">Tri-Database Integration Health & Responsibilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-xs uppercase">
              <Database className="w-4 h-4" />
              MySQL 8 Engine
            </div>
            <p className="text-xs text-slate-300">Active Source of Truth for Users, Quizzes, Questions, Options, and ACID Results.</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Connection Pool Healthy
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-red-500/30">
            <div className="flex items-center gap-2 mb-2 text-red-400 font-bold text-xs uppercase">
              <Zap className="w-4 h-4" />
              Redis 7 In-Memory
            </div>
            <p className="text-xs text-slate-300">Sorted Sets for live leaderboard tie-breaking and TTL key expiration for sessions.</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              ZSET Gateway Active
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-xs uppercase">
              <FileSpreadsheet className="w-4 h-4" />
              MongoDB 7 Store
            </div>
            <p className="text-xs text-slate-300">Stores granular question-level audit documents and executes analytical aggregation pipelines.</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Pipeline Aggregators Ready
            </div>
          </div>
        </div>
      </div>

      {/* Registered Students Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Registered Students Directory</h2>
            <p className="text-xs text-slate-400">Relational SQL query joined with completed attempts</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/70 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-6">User ID</th>
                <th className="py-3 px-6">Name</th>
                <th className="py-3 px-6">Email</th>
                <th className="py-3 px-6">Quizzes Completed</th>
                <th className="py-3 px-6">Avg Score</th>
                <th className="py-3 px-6 text-right">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {students.length > 0 ? (
                students.map((st) => (
                  <tr key={st.user_id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-slate-500">#{st.user_id}</td>
                    <td className="py-3.5 px-6 font-bold text-white">{st.name}</td>
                    <td className="py-3.5 px-6 font-mono text-slate-400">{st.email}</td>
                    <td className="py-3.5 px-6 font-mono">{st.quizzes_completed}</td>
                    <td className="py-3.5 px-6 font-mono font-bold text-emerald-400">
                      {parseFloat(st.average_score).toFixed(2)} pts
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-400">
                      {new Date(st.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No students registered yet.
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

