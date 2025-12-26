"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeName = "none" | "christmas" | "aurora" | "readable";

const THEMES: { id: ThemeName; label: string; description: string; emoji: string }[] = [
  {
    id: "none",
    label: "Classique",
    description: "Sérious, sobre et minimaliste Noir & Blanc",
    emoji: "⚫️",
  },
  { id: "christmas", label: "Noël", description: "Ambiance festive avec neige", emoji: "🎄" },
  {
    id: "aurora",
    label: "Aurore",
    description: "Vibrant et animé, dégradés magiques",
    emoji: "✨",
  },
  {
    id: "readable",
    label: "Lisibilité",
    description: "Contraste élevé, texte agrandi",
    emoji: "👓",
  },
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

  // Synchronous hydration to avoid theme flash - localStorage is client-only
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState((current) => (current !== stored ? stored : current));
    }
  }, []);

  useEffect(() => {
    // Retirer tous les thèmes
    document.body.classList.remove("theme-christmas", "theme-aurora", "theme-readable");
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
