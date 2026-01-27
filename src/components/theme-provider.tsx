"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Use 'mode' instead of 'theme' name for clarity
export type ThemeMode = "light" | "dark" | "system";

// Internal theme class names
type ThemeClass = "aurora" | "dark";

export interface ThemeContextProps {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  // Resolved theme (for UI that needs to know if it's actually dark or light)
  resolvedTheme: ThemeClass;
}

const STORAGE_KEY = "colist-theme-mode";
const DEFAULT_MODE: ThemeMode = "system";

const ThemeContext = createContext<ThemeContextProps>({
  mode: DEFAULT_MODE,
  setMode: () => {},
  resolvedTheme: "aurora",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [resolvedTheme, setResolvedTheme] = useState<ThemeClass>("aurora");

  // Initialize from usage - handling SS mismatch by running effect only on client
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setModeState(stored);
    }
  }, []);

  // Effect to update the DOM and resolved theme
  useEffect(() => {
    const root = window.document.documentElement;
    const body = document.body;

    // Clean up all possible theme classes
    body.classList.remove(
      "theme-aurora",
      "theme-dark",
      "theme-christmas",
      "theme-readable",
      "theme-none"
    );
    root.classList.remove("dark");

    let effectiveTheme: ThemeClass = "aurora";

    if (mode === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      effectiveTheme = systemDark ? "dark" : "aurora";
    } else if (mode === "dark") {
      effectiveTheme = "dark";
    } else {
      effectiveTheme = "aurora";
    }

    setResolvedTheme(effectiveTheme);
    body.classList.add(`theme-${effectiveTheme}`);

    // Add 'dark' class to html/root for Tailwind 'dark:' prefix support
    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    }
  }, [mode]);

  // Listen for system changes if in system mode
  useEffect(() => {
    if (mode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // Trigger update by re-running the main effect (React might batch this but it's safe)
      // Actually simpler to just manually update classes here or force re-render.
      // Easiest is to force mode state update to same value to trigger effect,
      // but simpler is to call a refresh.
      // Let's just duplicate the class logic slightly or extract it?
      // For simplicity, we can just toggle the state safely.
      setModeState((prev) => (prev === "system" ? "system" : prev));
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mode]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeContext);
