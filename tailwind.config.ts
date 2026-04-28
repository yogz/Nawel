import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // CoList still binds Inter via its own layout. The Sortie route
        // group rebinds `--font-inter` to Space Grotesk and
        // `--font-inter-tight` to Unbounded — same className strings, new
        // typefaces, zero churn. The Tailwind keys stay opaque ids.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-inter-tight)", "var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-pilot-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Sortie design system — "Acid Cabinet". Palette nommée par rôle :
        //   acid    = accent primaire (vert acide, signal "go")
        //   hot     = accent secondaire (rose électrique, ponctuation)
        //   surface = fonds dark (paliers de profondeur des cartes/panneaux)
        //   ink     = échelle foreground texte (du muted au pur blanc)
        // La couche shadcn (`primary`, `accent`, `muted`, `background`,
        // `foreground`, `card`, `popover`, `destructive`) reste branchée sur
        // les CSS vars HSL — préférer celle-ci pour les rôles stables et
        // garder la palette pour les nuances précises.
        acid: {
          50: "#1A2C0A",
          100: "#2E4A12",
          200: "#446F1A",
          300: "#6FA825",
          400: "#9FD632",
          500: "#BDF03A",
          600: "#C7FF3C",
          700: "#A8E62E",
          800: "#7FB320",
          900: "#5A8016",
        },
        hot: {
          50: "#2D0815",
          100: "#4D1024",
          200: "#75173A",
          300: "#A81F50",
          400: "#D6286B",
          500: "#FF3D81",
          600: "#E63577",
          700: "#B82A5F",
          800: "#8A2049",
          900: "#5C1531",
        },
        surface: {
          // `bg-surface` sans shade reste la CSS var CoList (var(--surface)),
          // les shades chiffrés sont les fonds dark de Sortie (Acid Cabinet).
          DEFAULT: "var(--surface)",
          50: "#0F0F0F",
          100: "#161616",
          200: "#1F1F1F",
          300: "#2A2A2A",
          400: "#333333",
        },
        ink: {
          50: "#0F0F0F",
          100: "#1A1A1A",
          200: "#2A2A2A",
          300: "#636366",
          400: "#8E8E93",
          500: "#AEAEB2",
          600: "#D5D5D7",
          700: "#F5F2EB",
          800: "#FAFAFA",
          900: "#FFFFFF",
        },
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
