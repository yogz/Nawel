"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext<{
  christmas: boolean;
  toggle: () => void;
}>({ christmas: false, toggle: () => {} });

const STORAGE_KEY = "christmas-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [christmas, setChristmas] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setChristmas(stored === "on");
    }
  }, []);

  useEffect(() => {
    if (christmas) {
      document.body.classList.add("theme-christmas");
    } else {
      document.body.classList.remove("theme-christmas");
    }
    localStorage.setItem(STORAGE_KEY, christmas ? "on" : "off");
  }, [christmas]);

  return (
    <ThemeContext.Provider value={{ christmas, toggle: () => setChristmas((c) => !c) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeContext);
