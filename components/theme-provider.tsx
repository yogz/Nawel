"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeName = "none" | "christmas" | "aurora";

const THEMES: { id: ThemeName; label: string; description: string; emoji: string }[] = [
  { id: "none", label: "Classique", description: "Interface sobre et minimaliste", emoji: "🌙" },
  { id: "christmas", label: "Noël", description: "Ambiance festive avec neige", emoji: "🎄" },
  { id: "aurora", label: "Aurore", description: "Dégradés doux violet et rose", emoji: "🌸" },
];

const ThemeContext = createContext<{
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: typeof THEMES;
  // Rétrocompatibilité
  christmas: boolean;
  toggle: () => void;
}>({
  theme: "christmas",
  setTheme: () => {},
  themes: THEMES,
  christmas: true,
  toggle: () => {},
});

const STORAGE_KEY = "nawel-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("christmas");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    // Retirer tous les thèmes
    document.body.classList.remove("theme-christmas", "theme-aurora");
    // Ajouter le thème actif
    if (theme !== "none") {
      document.body.classList.add(`theme-${theme}`);
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeName) => setThemeState(newTheme);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes: THEMES,
        // Rétrocompatibilité
        christmas: theme === "christmas",
        toggle: () => setThemeState((t) => (t === "christmas" ? "none" : "christmas")),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeContext);
