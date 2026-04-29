'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type ThemeName = 'neon' | 'eclipse' | 'crt' | 'rain' | 'stars' | 'dawn' | 'cosmos';

const STORAGE_KEY = 'arcades-theme';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'neon',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('neon');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
      if (saved) setThemeState(saved);
    } catch {}
  }, []);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
