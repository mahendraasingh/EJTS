import React from 'react';
import { Database, Zap, FileSpreadsheet } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950/60 backdrop-blur-md py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* MySQL Card */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <Database className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">MySQL 8 (Relational)</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Maintains 3NF normalized tables for Users, Quizzes, Questions, Options, and ACID-compliant transaction-backed Quiz Results.
            </p>
          </div>

          {/* Redis Card */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex items-center gap-2 mb-2 text-red-400">
              <Zap className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Redis 7 (In-Memory)</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              High-throughput Sorted Sets (ZSET) for live leaderboard rankings, tie-breaker calculation, TTL ephemeral sessions, and metadata caching.
            </p>
          </div>

          {/* MongoDB Card */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">MongoDB (Document)</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Stores comprehensive student attempt histories and granular answer audits. Powers complex multi-stage analytical aggregation pipelines ($match, $group, $unwind).
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <p>© 2026 QuizArena — College DBMS Real-Time Full-Stack Project</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300">FastAPI / Express</span>
            <span>•</span>
            <span className="hover:text-slate-300">Socket.IO</span>
            <span>•</span>
            <span className="hover:text-slate-300">React + Vite</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

