import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'bright';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('vrpt_theme') as Theme;
    return saved === 'bright' ? 'bright' : 'dark';
  });

  const applyTheme = (currentTheme: Theme) => {
    const root = document.documentElement;
    if (currentTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('bright');
      document.body.style.backgroundColor = '#000000';
      document.body.style.color = '#f4f4f5';
    } else {
      root.classList.remove('dark');
      root.classList.add('bright');
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  };

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('vrpt_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'bright' : 'dark'));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
