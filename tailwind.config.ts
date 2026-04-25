import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        // `font-serif` stays for zero-churn in existing className strings,
        // but it now points at Inter Tight (bold-weight display face) — the
        // Sortie rebrand swapped the serif display family for a geometric
        // sans without dropping the token name.
        serif: ["var(--font-inter-tight)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        // Sortie design system — "Cream & Cobalt" rebrand (2026). The token
        // names (`bordeaux`, `or`, `ivoire`, `encre`) are kept for zero-churn
        // but the hex values are now electric cobalt, coral, warm cream and
        // cool ink. Don't rename them blindly — hundreds of className strings
        // depend on these keys. Treat the names as opaque ids.
        bordeaux: {
          50: "#EEF2FF",
          100: "#DDE4FF",
          200: "#BAC9FF",
          300: "#8BA5FF",
          400: "#5A80FF",
          500: "#4269FF",
          600: "#2D5BFF",
          700: "#1F42D6",
          800: "#142FA6",
          900: "#0C1E73",
        },
        or: {
          50: "#FFF3EE",
          100: "#FFDFD1",
          200: "#FFB89E",
          300: "#FF8E6A",
          400: "#FF7250",
          500: "#FF6B4A",
          600: "#E84F2F",
          700: "#B83D23",
          800: "#862B1A",
          900: "#5A1D11",
        },
        ivoire: {
          50: "#FFFDF9",
          100: "#FCFAF4",
          200: "#FAF7F2",
          300: "#F1EAD8",
          400: "#E4DCC4",
        },
        encre: {
          50: "#ECECEE",
          100: "#CBCBD0",
          200: "#9FA0AA",
          300: "#6C6E7D",
          400: "#4A4C5A",
          500: "#2F3140",
          600: "#1E2030",
          700: "#121424",
          800: "#0A0B1A",
          900: "#06070F",
        },
        surface: "var(--surface)",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        accentSoft: "var(--accent-soft)",
        text: "var(--text)",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
          blue: "hsl(var(--chart-blue))",
          cyan: "hsl(var(--chart-cyan))",
          indigo: "hsl(var(--chart-indigo))",
          violet: "hsl(var(--chart-violet))",
          purple: "hsl(var(--chart-purple))",
          pink: "hsl(var(--chart-pink))",
          orange: "hsl(var(--chart-orange))",
          emerald: "hsl(var(--chart-emerald))",
          slate: "hsl(var(--chart-slate))",
        },
        brand: {
          buymeacoffee: "var(--brand-buymeacoffee)",
          revolut: "var(--brand-revolut)",
        },
        success: {
          DEFAULT: "hsl(142 76% 36%)",
          foreground: "hsl(0 0% 100%)",
        },
        warning: {
          DEFAULT: "hsl(38 92% 50%)",
          foreground: "hsl(0 0% 100%)",
        },
        info: {
          DEFAULT: "hsl(217 91% 60%)",
          foreground: "hsl(0 0% 100%)",
        },
      },
      spacing: {
        xs: "0.5rem", // 8px
        sm: "0.75rem", // 12px
        md: "1rem", // 16px
        lg: "1.5rem", // 24px
        xl: "2rem", // 32px
        "2xl": "3rem", // 48px
        "3xl": "4rem", // 64px
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        accent: "0 4px 20px rgba(var(--accent-rgb, 0, 0, 0), 0.2)",
        "accent-lg": "0 8px 30px rgba(var(--accent-rgb, 0, 0, 0), 0.3)",
        sheet: "0 -12px 30px rgba(0,0,0,0.12)",
      },
      borderRadius: {
        sm: "0.5rem", // 8px
        md: "0.75rem", // 12px
        lg: "var(--radius)", // 1.25rem default
        xl: "1.5rem", // 24px
        "2xl": "1.5rem", // 24px
        full: "9999px",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "300ms",
        slow: "500ms",
        slower: "800ms",
        // Sortie motion vocabulary — see DESIGN_SYSTEM.md.
        // `motion-tap` covers `active:scale-*` feedback, `motion-standard`
        // is the default for hover/color/opacity, `motion-emphasized` is
        // for entrances and important state changes.
        "motion-tap": "100ms",
        "motion-standard": "250ms",
        "motion-emphasized": "400ms",
      },
      transitionTimingFunction: {
        // Material 3 standard easings. The standard curve decelerates
        // sharply at the end (feels responsive); the emphasized curve
        // is slower in the middle (feels deliberate, used for entrances).
        "motion-standard": "cubic-bezier(0.2, 0, 0, 1)",
        "motion-emphasized": "cubic-bezier(0.05, 0.7, 0.1, 1)",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "gradient-slow": "gradient 6s ease infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
