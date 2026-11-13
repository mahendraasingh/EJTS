import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { leaderboardAPI, quizAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Users,
  Zap,
  Radio,
  ArrowLeft,
  Clock,
  Sparkles,
} from 'lucide-react';

export const LiveLeaderboard = () => {
  const { quizId } = useParams();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdateText, setLastUpdateText] = useState('Syncing...');

  // 1. Initial REST Hydration
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [lbRes, qRes] = await Promise.all([
          leaderboardAPI.getQuizLeaderboard(quizId, 20),
          quizAPI.getById(quizId),
        ]);

        if (lbRes.success) {
          setLeaderboard(lbRes.data.leaderboard || []);
          setCurrentUserRank(lbRes.data.currentUser);
          setTotalParticipants(lbRes.data.totalParticipants || 0);
          setLastUpdateText('Live Redis Snapshot Active');
        }
        if (qRes.success) setQuiz(qRes.data);
      } catch (err) {
        console.error('Failed to load leaderboard:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, [quizId]);

  // 2. Real-Time Socket.IO Synchronization
  useEffect(() => {
    if (!socket) return;

    // Join room for this quiz leaderboard
    socket.emit('join_leaderboard', { quizId });

    const handleUpdate = (payload) => {
      if (parseInt(payload.quizId, 10) === parseInt(quizId, 10)) {
        if (payload.top10) {
          setLeaderboard(payload.top10);
        }
        if (payload.lastSubmitter) {
          setLastUpdateText(`Updated just now by ${payload.lastSubmitter}`);
        } else {
          setLastUpdateText('Updated via live socket broadcast');
        }
      }
    };

    socket.on('leaderboard_updated', handleUpdate);

    return () => {
      socket.off('leaderboard_updated', handleUpdate);
    };
  }, [socket, quizId]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Split top 3 for podium
  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const restParticipants = leaderboard.slice(3);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/quizzes"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Quizzes
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Live Real-Time Leaderboard
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Redis ZSET
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {quiz?.title} · {totalParticipants} Active Competitor{totalParticipants === 1 ? '' : 's'}
          </p>
        </div>

        {/* Real-time Status Badge */}
        <div className="glass-panel px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-2 text-xs font-mono">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-slate-300">{lastUpdateText}</span>
        </div>
      </div>

      {/* Top 3 Podium Styling */}
      {leaderboard.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end pt-8 pb-4 max-w-2xl mx-auto">
          {/* #2 Silver Podium */}
          <div className="flex flex-col items-center">
            {top2 ? (
              <>
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 border-2 border-slate-400 flex items-center justify-center text-slate-300 font-extrabold text-sm sm:text-lg shadow-lg mb-2">
                  🥈
                </div>
                <p className="text-xs font-bold text-white text-center truncate max-w-[90px] sm:max-w-none">
                  {top2.name}
                </p>
                <p className="text-xs font-mono font-bold text-slate-400">{top2.score} pts</p>
                <div className="w-full h-24 sm:h-32 bg-gradient-to-t from-slate-900 to-slate-800 rounded-t-2xl border-t-4 border-slate-400 flex items-center justify-center mt-2 shadow-xl">
                  <span className="font-extrabold text-xl sm:text-2xl text-slate-400">#2</span>
                </div>
              </>
            ) : (
              <div className="w-full h-24 bg-slate-900/30 rounded-t-2xl border-t-2 border-slate-800" />
            )}
          </div>

          {/* #1 Gold Podium */}
          <div className="flex flex-col items-center -mt-6">
            {top1 ? (
              <>
                <Crown className="w-6 h-6 text-yellow-400 animate-bounce mb-1" />
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-extrabold text-base sm:text-xl shadow-xl shadow-amber-500/20 mb-2 border-2 border-yellow-200">
                  👑
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-white text-center truncate max-w-[100px] sm:max-w-none">
                  {top1.name}
                </p>
                <p className="text-xs sm:text-sm font-mono font-extrabold text-yellow-400">{top1.score} pts</p>
                <div className="w-full h-32 sm:h-44 bg-gradient-to-t from-amber-950/40 via-slate-900 to-slate-800 rounded-t-2xl border-t-4 border-yellow-400 flex items-center justify-center mt-2 shadow-2xl">
                  <span className="font-extrabold text-2xl sm:text-4xl text-yellow-400">#1</span>
                </div>
              </>
            ) : null}
          </div>

          {/* #3 Bronze Podium */}
          <div className="flex flex-col items-center">
            {top3 ? (
              <>
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-900/40 border-2 border-amber-600 flex items-center justify-center text-amber-500 font-extrabold text-sm sm:text-lg shadow-lg mb-2">
                  🥉
                </div>
                <p className="text-xs font-bold text-white text-center truncate max-w-[90px] sm:max-w-none">
                  {top3.name}
                </p>
                <p className="text-xs font-mono font-bold text-amber-500">{top3.score} pts</p>
                <div className="w-full h-16 sm:h-24 bg-gradient-to-t from-slate-900 to-slate-800 rounded-t-2xl border-t-4 border-amber-600 flex items-center justify-center mt-2 shadow-xl">
                  <span className="font-extrabold text-lg sm:text-xl text-amber-600">#3</span>
                </div>
              </>
            ) : (
              <div className="w-full h-16 bg-slate-900/30 rounded-t-2xl border-t-2 border-slate-800" />
            )}
          </div>
        </div>
      )}

      {/* Ranked Participants Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Complete Ranked Standings
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Sorted Set: O(log N) Ranking
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/70 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-6 w-20">Rank</th>
                <th className="py-3 px-6">Student Participant</th>
                <th className="py-3 px-6">Certified Score</th>
                <th className="py-3 px-6 text-right">Ranking Mechanism</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
              {leaderboard.length > 0 ? (
                leaderboard.map((item) => {
                  const isCurrent = user && item.userId === user.userId;
                  return (
                    <tr
                      key={item.userId}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-emerald-500/10 border-l-4 border-emerald-500 text-white font-bold'
                          : 'hover:bg-slate-900/40'
                      }`}
                    >
                      <td className="py-3.5 px-6 font-mono">
                        {item.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-400 font-bold">1</span>
                        ) : item.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 font-bold">2</span>
                        ) : item.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600/20 text-amber-500 font-bold">3</span>
                        ) : (
                          <span className="text-slate-500 font-bold">#{item.rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{item.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">{item.email}</span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="font-mono text-sm font-bold text-emerald-400">{item.score}</span>
                        <span className="text-slate-500 text-[11px]"> pts</span>
                      </td>
                      <td className="py-3.5 px-6 text-right text-slate-400 font-mono text-[11px]">
                        Redis ZSET Tie-Breaker
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    No participants have completed this quiz yet. Be the first to conquer the leaderboard!
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
