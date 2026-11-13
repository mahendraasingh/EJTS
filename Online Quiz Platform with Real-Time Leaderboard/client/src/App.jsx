import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './layouts/Navbar';
import { Footer } from './layouts/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { StudentDashboard } from './pages/StudentDashboard';
import { QuizList } from './pages/QuizList';
import { QuizAttempt } from './pages/QuizAttempt';
import { QuizResult } from './pages/QuizResult';
import { LiveLeaderboard } from './pages/LiveLeaderboard';
import { StudentHistory } from './pages/StudentHistory';
import { AdminDashboard } from './pages/AdminDashboard';
import { ManageQuizzes } from './pages/ManageQuizzes';
import { ManageQuestions } from './pages/ManageQuestions';
import { AdminAnalytics } from './pages/AdminAnalytics';

export default function App() {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      <Navbar />

      <main className="flex-1">
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />} />

          {/* Student Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <QuizList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:quizId"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <QuizAttempt />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:quizId/result"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <QuizResult />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:quizId/leaderboard"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <LiveLeaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentHistory />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/quizzes"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ManageQuizzes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/quizzes/:quizId/questions"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ManageQuestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route
            path="*"
            element={
              <Navigate
                to={!isAuthenticated ? '/login' : isAdmin ? '/admin' : '/dashboard'}
                replace
              />
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
