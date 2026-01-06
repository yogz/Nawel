/**
 * Design Tokens - Source of Truth for Design System
 * These tokens ensure consistency across the entire application
 */

export const designTokens = {
  spacing: {
    xs: "0.5rem", // 8px
    sm: "0.75rem", // 12px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
    "2xl": "3rem", // 48px
    "3xl": "4rem", // 64px
  },
  borderRadius: {
    sm: "0.5rem", // 8px
    md: "0.75rem", // 12px
    lg: "1rem", // 16px
    xl: "1.5rem", // 24px
    "2xl": "1.5rem", // 24px - same as xl for consistency
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    accent: "0 4px 20px rgba(var(--accent-rgb, 0, 0, 0), 0.2)",
    "accent-lg": "0 8px 30px rgba(var(--accent-rgb, 0, 0, 0), 0.3)",
  },
  transitions: {
    fast: "150ms",
    normal: "300ms",
    slow: "500ms",
    slower: "800ms",
  },
  typography: {
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      black: 900,
    },
    sizes: {
      xs: "0.75rem", // 12px
      sm: "0.875rem", // 14px
      base: "1rem", // 16px
      lg: "1.125rem", // 18px
      xl: "1.25rem", // 20px
      "2xl": "1.5rem", // 24px
      "3xl": "1.875rem", // 30px
      "4xl": "2.25rem", // 36px
    },
  },
  colors: {
    semantic: {
      success: "142 76% 36%",
      warning: "38 92% 50%",
      error: "0 84% 60%",
      info: "217 91% 60%",
    },
  },
  touchTarget: {
    min: "44px", // Minimum touch target size for mobile
  },
} as const;

/**
 * Helper function to get spacing value
 */
export function getSpacing(key: keyof typeof designTokens.spacing): string {
  return designTokens.spacing[key];
}

/**
 * Helper function to get transition duration
 */
export function getTransition(key: keyof typeof designTokens.transitions): string {
  return designTokens.transitions[key];
}
