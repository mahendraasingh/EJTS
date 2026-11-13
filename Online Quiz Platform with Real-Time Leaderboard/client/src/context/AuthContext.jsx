import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('quiz_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('quiz_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const res = await authAPI.getMe();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('quiz_user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.warn('Session verification failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    if (res.success && res.data) {
      const { user: loggedUser, token: authToken } = res.data;
      setUser(loggedUser);
      setToken(authToken);
      localStorage.setItem('quiz_token', authToken);
      localStorage.setItem('quiz_user', JSON.stringify(loggedUser));
      return loggedUser;
    }
    throw new Error(res.message || 'Login failed.');
  };

  const register = async (userData) => {
    const res = await authAPI.register(userData);
    if (res.success && res.data) {
      const { user: registeredUser, token: authToken } = res.data;
      setUser(registeredUser);
      setToken(authToken);
      localStorage.setItem('quiz_token', authToken);
      localStorage.setItem('quiz_user', JSON.stringify(registeredUser));
      return registeredUser;
    }
    throw new Error(res.message || 'Registration failed.');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('quiz_token');
    localStorage.removeItem('quiz_user');
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
