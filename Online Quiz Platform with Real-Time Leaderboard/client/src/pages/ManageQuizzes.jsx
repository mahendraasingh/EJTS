import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { quizAPI } from '../services/api';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  HelpCircle,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  X,
  ExternalLink,
} from 'lucide-react';

export const ManageQuizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: 1,
    durationMinutes: 15,
    totalMarks: 25,
    negativeMarking: 0.25,
    status: 'active',
  });

  const loadData = async () => {
    try {
      const [qRes, cRes] = await Promise.all([
        quizAPI.getAll(),
        quizAPI.getCategories(),
      ]);
      if (qRes.success) setQuizzes(qRes.data);
      if (cRes.success) setCategories(cRes.data);
    } catch (err) {
      console.error('Failed to load quizzes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingQuiz(null);
    setFormData({
      title: '',
      description: '',
      categoryId: categories[0]?.category_id || 1,
      durationMinutes: 15,
      totalMarks: 25,
      negativeMarking: 0.25,
      status: 'active',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (q) => {
    setEditingQuiz(q);
    setFormData({
      title: q.title,
      description: q.description || '',
      categoryId: q.category_id,
      durationMinutes: q.duration_minutes,
      totalMarks: q.total_marks,
      negativeMarking: q.negative_marking,
      status: q.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (quizId) => {
    if (window.confirm('Are you sure you want to delete this quiz? All associated questions and participant results will be cascade-deleted.')) {
      try {
        await quizAPI.delete(quizId);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingQuiz) {
        await quizAPI.update(editingQuiz.quiz_id, formData);
      } else {
        await quizAPI.create(formData);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-blue-400" />
            Manage Examination Quizzes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, update durations, configure negative marking, and manage question banks
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Quiz
        </button>
      </div>

      {/* Quizzes Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/70 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-6">ID</th>
                <th className="py-3 px-6">Quiz Title</th>
                <th className="py-3 px-6">Category</th>
                <th className="py-3 px-6">Duration</th>
                <th className="py-3 px-6">Marks & Penalties</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {quizzes.map((q) => (
                <tr key={q.quiz_id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-4 px-6 font-mono text-slate-500">#{q.quiz_id}</td>
                  <td className="py-4 px-6 font-bold text-white">
                    <div>{q.title}</div>
                    <span className="text-[11px] text-slate-400 font-normal line-clamp-1">{q.description}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                      {q.category_name}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-300">{q.duration_minutes} mins</td>
                  <td className="py-4 px-6 font-mono">
                    <span className="text-emerald-400 font-bold">{q.total_marks}</span> max /{' '}
                    <span className="text-red-400">-{q.negative_marking}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        q.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/quizzes/${q.quiz_id}/questions`}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition-colors"
                        title="Manage Questions"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleOpenEdit(q)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Edit Quiz"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(q.quiz_id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Delete Quiz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-panel p-6 rounded-2xl border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingQuiz ? 'Edit Quiz Parameters' : 'Create New Examination Quiz'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Quiz Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Distributed Database Transactions"
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter syllabus details or examination rules..."
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value, 10) })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value, 10) })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Total Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: parseFloat(e.target.value) })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Negative Marking</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={formData.negativeMarking}
                    onChange={(e) => setFormData({ ...formData, negativeMarking: parseFloat(e.target.value) })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                >
                  {editingQuiz ? 'Save Updates' : 'Publish Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
