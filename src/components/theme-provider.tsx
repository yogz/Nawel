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

const DEFAULT_THEME: ThemeName = "aurora";
const THEME_MAX_AGE = 90 * 24 * 60 * 60 * 1000; // 90 days

const ThemeContext = createContext<{
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: typeof THEMES;
  // Rétrocompatibilité
  christmas: boolean;
  toggle: () => void;
}>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  themes: THEMES,
  christmas: (DEFAULT_THEME as ThemeName) === "christmas",
  toggle: () => {},
});

const STORAGE_KEY = "colist-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);

  // Synchronous hydration to avoid theme flash - localStorage is client-only
  useEffect(() => {
    const storedStr = localStorage.getItem(STORAGE_KEY);
    if (storedStr) {
      try {
        const stored = JSON.parse(storedStr) as { id: ThemeName; timestamp: number };
        if (stored && THEMES.some((t) => t.id === stored.id)) {
          const isExpired = Date.now() - stored.timestamp > THEME_MAX_AGE;
          if (!isExpired) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setThemeState(stored.id);
          } else {
            // Optionnel: nettoyer l'entrée expirée
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        // Fallback pour l'ancien format (simple string)
        if (THEMES.some((t) => t.id === (storedStr as ThemeName))) {
          // Si c'est l'ancien format, on le considère comme expiré ou on le migre
          // Içi on choisit de laisser le défaut (Aurora) pour tout le monde au début
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }
  }, []);

  useEffect(() => {
    // Retirer tous les thèmes
    document.body.classList.remove("theme-christmas", "theme-aurora", "theme-readable");
    // Ajouter le thème actif
    if (theme !== "none") {
      document.body.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: newTheme, timestamp: Date.now() }));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes: THEMES,
        // Rétrocompatibilité
        christmas: theme === "christmas",
        toggle: () => {
          const newTheme = theme === "christmas" ? "none" : "christmas";
          setTheme(newTheme);
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeContext);
