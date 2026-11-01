import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('vrpt_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('vrpt_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('vrpt_token');
      if (storedToken) {
        try {
          const me = await api.auth.getMe();
          setUser(me);
          localStorage.setItem('vrpt_user', JSON.stringify(me));
        } catch (err) {
          console.error("Auth check failed:", err);
          logout();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username: string, pass: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', pass);
    const data = await api.auth.login(formData);
    
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('vrpt_token', data.access_token);
    localStorage.setItem('vrpt_user', JSON.stringify(data.user));
  };

  const register = async (userData: any) => {
    await api.auth.register(userData);
    await login(userData.username, userData.password);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('vrpt_token');
    localStorage.removeItem('vrpt_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
