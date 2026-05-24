import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "hsl(228 14% 6%)",
          subtle: "hsl(228 14% 8%)",
          panel: "hsl(228 14% 10%)",
          elevated: "hsl(228 14% 12%)",
        },
        line: {
          DEFAULT: "hsl(228 10% 18%)",
          subtle: "hsl(228 10% 14%)",
        },
        fg: {
          DEFAULT: "hsl(220 14% 96%)",
          muted: "hsl(220 8% 64%)",
          subtle: "hsl(220 6% 44%)",
        },
        accent: {
          DEFAULT: "hsl(258 90% 66%)",
          soft: "hsl(258 90% 66% / 0.15)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(258 90% 66% / 0.4), 0 8px 32px -8px hsl(258 90% 66% / 0.3)",
        panel: "0 1px 0 0 hsl(0 0% 100% / 0.04) inset, 0 8px 24px -12px hsl(0 0% 0% / 0.6)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse_dot: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        shimmer: "shimmer 2s linear infinite",
        "pulse-dot": "pulse_dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
