import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      colors: {
        // Sortie design system — bordeaux primary, or patiné accent, ivoire surface.
        // Kept in the shared config so Tailwind JIT can emit utilities like
        // `bg-bordeaux-600` or `text-or-700`. CoList doesn't reference these
        // names today, so no collision.
        bordeaux: {
          50: "#FBF4F5",
          100: "#F4E3E5",
          200: "#E4BCC1",
          300: "#CC8A92",
          400: "#A85560",
          500: "#8A2C39",
          600: "#6B1F2A",
          700: "#541820",
          800: "#3E1218",
          900: "#2A0C10",
        },
        or: {
          50: "#FBF6EC",
          100: "#F3E7CD",
          200: "#E6D1A3",
          300: "#D4B77A",
          400: "#C4A067",
          500: "#B8935A",
          600: "#9E7B45",
          700: "#7E6133",
          800: "#5E4726",
          900: "#3F2F19",
        },
        ivoire: {
          50: "#FDFBF5",
          100: "#F9F5EC",
          200: "#F5F1E8",
          300: "#EDE5D2",
          400: "#DFD2B4",
        },
        encre: {
          50: "#EFEAE0",
          100: "#D5CCB9",
          200: "#B8AC94",
          300: "#8E8168",
          400: "#6B5F49",
          500: "#4A4132",
          600: "#342D22",
          700: "#231E16",
          800: "#1A1610",
          900: "#12100B",
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
