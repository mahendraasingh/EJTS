import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { quizAPI } from '../services/api';
import {
  HelpCircle,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Save,
  AlertCircle,
} from 'lucide-react';

export const ManageQuestions = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [questionText, setQuestionText] = useState('');
  const [marks, setMarks] = useState(5.0);
  const [negativeMarks, setNegativeMarks] = useState(1.25);
  const [options, setOptions] = useState([
    { optionText: '', isCorrect: true },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
  ]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadQuestions = async () => {
    try {
      const [qRes, listRes] = await Promise.all([
        quizAPI.getById(quizId),
        quizAPI.getQuestions(quizId),
      ]);
      if (qRes.success) setQuiz(qRes.data);
      if (listRes.success) setQuestions(listRes.data);
    } catch (err) {
      console.error('Error fetching questions:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [quizId]);

  const handleOptionChange = (idx, value) => {
    const updated = [...options];
    updated[idx].optionText = value;
    setOptions(updated);
  };

  const handleSetCorrect = (idx) => {
    const updated = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === idx,
    }));
    setOptions(updated);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    const emptyOptions = options.some((opt) => !opt.optionText.trim());
    if (emptyOptions) {
      setError('Please fill in all 4 option texts.');
      return;
    }

    try {
      await quizAPI.addQuestion(quizId, {
        questionText,
        questionType: 'mcq',
        marks: parseFloat(marks),
        negativeMarks: parseFloat(negativeMarks),
        questionOrder: questions.length + 1,
        options,
      });

      setSuccess('Question and options added successfully!');
      setQuestionText('');
      setOptions([
        { optionText: '', isCorrect: true },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
      ]);
      loadQuestions();
    } catch (err) {
      setError(err.message || 'Failed to add question.');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Delete this question and its options?')) {
      try {
        await quizAPI.deleteQuestion(questionId, quizId);
        loadQuestions();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/admin/quizzes"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Quizzes
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <HelpCircle className="w-7 h-7 text-blue-400" />
          Question Bank Management
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Quiz: <strong className="text-white">{quiz?.title}</strong> ({questions.length} Questions)
        </p>
      </div>

      {/* Add New Question Form Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          Add Question with Options
        </h2>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleAddQuestion} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Question Prompt / Statement</label>
            <textarea
              rows={2}
              required
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="e.g. In relational databases, what is the primary role of a foreign key constraint?"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Marks Awarded</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Negative Penalty</label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* 4 Multiple Choice Options with Correct Answer Selector */}
          <div className="space-y-2 pt-2">
            <label className="block text-slate-300 font-semibold">
              Multiple Choice Options (Select radio to designate correct answer)
            </label>

            {options.map((opt, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                  opt.isCorrect
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-slate-900/60 border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="correctOption"
                  checked={opt.isCorrect}
                  onChange={() => handleSetCorrect(idx)}
                  className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="font-mono font-bold text-slate-400 w-6">
                  {String.fromCharCode(65 + idx)}:
                </span>
                <input
                  type="text"
                  required
                  value={opt.optionText}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)} text...`}
                  className="flex-1 bg-transparent border-none text-white focus:outline-none text-xs"
                />
                {opt.isCorrect && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                    Correct
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Question to MySQL
            </button>
          </div>
        </form>
      </div>

      {/* Existing Questions List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">Configured Questions in Quiz ({questions.length})</h2>

        {questions.length > 0 ? (
          questions.map((q, idx) => (
            <div
              key={q.question_id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-relaxed">
                      {q.question_text}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-slate-400">
                      <span>+{q.marks} Marks</span>
                      <span>·</span>
                      <span>-{q.negative_marks} Neg</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteQuestion(q.question_id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Options Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                {q.options?.map((opt, oIdx) => (
                  <div
                    key={opt.option_id}
                    className={`p-2 rounded-lg text-xs flex items-center gap-2 border ${
                      opt.is_correct
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="font-mono text-[10px]">{String.fromCharCode(65 + oIdx)}.</span>
                    <span className="flex-1 truncate">{opt.option_text}</span>
                    {opt.is_correct && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center glass-panel rounded-2xl border border-slate-800 text-slate-500 text-xs">
            No questions configured yet for this quiz. Add your first question above!
          </div>
        )}
      </div>
    </div>
  );
};

