import React, { createContext, useContext, useState } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const defaultAdminUser: User = {
  id: 1,
  username: 'admin',
  email: 'admin@security.local',
  full_name: 'SecOps Commander',
  role: 'ADMIN',
  is_active: true,
  created_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useState<User | null>(defaultAdminUser);
  const [token] = useState<string | null>('active-secops-session');
  const [isLoading] = useState<boolean>(false);

  const login = async () => {};
  const register = async () => {};
  const logout = () => {};

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
