import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { quizAPI } from '../services/api';
import {
  Search,
  Filter,
  Clock,
  Award,
  AlertTriangle,
  Play,
  Trophy,
  BookOpen,
  HelpCircle,
} from 'lucide-react';

export const QuizList = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [quizRes, catRes] = await Promise.all([
          quizAPI.getAll(),
          quizAPI.getCategories(),
        ]);
        if (quizRes.success) setQuizzes(quizRes.data);
        if (catRes.success) setCategories(catRes.data);
      } catch (err) {
        console.error('Failed to load quizzes:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesCategory = selectedCategory ? q.category_id === parseInt(selectedCategory, 10) : true;
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.description && q.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-emerald-400" />
            Explore Quizzes
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse available quizzes across Database Management, NoSQL, and Systems Architecture
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quizzes..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="relative w-full sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quiz Cards Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredQuizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.quiz_id}
              className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all hover:shadow-xl hover:shadow-emerald-500/5 group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    {quiz.category_name}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {quiz.duration_minutes}m
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {quiz.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {quiz.description || 'No detailed syllabus description provided.'}
                </p>

                {/* Metadata Pills */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>{quiz.total_marks} Marks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-blue-400" />
                    <span>{quiz.question_count || 5} Questions</span>
                  </div>
                </div>

                {parseFloat(quiz.negative_marking) > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Negative Marking: -{quiz.negative_marking} per wrong answer</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2">
                <Link
                  to={`/quiz/${quiz.quiz_id}`}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Start Quiz
                </Link>
                <Link
                  to={`/quiz/${quiz.quiz_id}/leaderboard`}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-all"
                  title="View Live Leaderboard"
                >
                  <Trophy className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center glass-panel rounded-2xl border border-slate-800">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Quizzes Found</h3>
          <p className="text-xs text-slate-400 mt-1">Try refining your search term or category filter.</p>
        </div>
      )}
    </div>
  );
};
