import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#121418",
          850: "#1a1c22",
          800: "#22252b",
        },
        helix: {
          DEFAULT: "#5eead4",
          glow: "rgba(94, 234, 212, 0.35)",
          deep: "#2dd4bf",
        },
        bg: {
          DEFAULT: "hsl(232 22% 5%)",
          subtle: "hsl(232 22% 7%)",
          panel: "hsl(232 20% 9%)",
          elevated: "hsl(232 18% 12%)",
          raised: "hsl(232 16% 15%)",
        },
        line: {
          DEFAULT: "hsl(232 16% 19%)",
          subtle: "hsl(232 16% 14%)",
          strong: "hsl(232 14% 24%)",
        },
        fg: {
          DEFAULT: "hsl(220 18% 96%)",
          muted: "hsl(220 10% 64%)",
          subtle: "hsl(220 8% 44%)",
        },
        accent: {
          DEFAULT: "hsl(258 92% 68%)",
          soft: "hsl(258 90% 66% / 0.15)",
          deep: "hsl(258 80% 56%)",
        },
        violet: {
          glow: "hsl(258 90% 66%)",
          mist: "hsl(258 60% 40%)",
        },
        positive: "hsl(150 60% 56%)",
        warning: "hsl(38 90% 60%)",
        critical: "hsl(0 70% 60%)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(258 90% 66% / 0.4), 0 8px 32px -8px hsl(258 90% 66% / 0.35)",
        "glow-soft": "0 0 30px -10px hsl(258 90% 66% / 0.4)",
        panel:
          "0 1px 0 0 hsl(0 0% 100% / 0.04) inset, 0 8px 28px -16px hsl(0 0% 0% / 0.7)",
        card: "0 1px 0 0 hsl(0 0% 100% / 0.03) inset, 0 16px 40px -24px hsl(0 0% 0% / 0.7)",
        elevated:
          "0 1px 0 0 hsl(0 0% 100% / 0.05) inset, 0 24px 64px -28px hsl(0 0% 0% / 0.8)",
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
        aurora: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(-20px,10px) scale(1.05)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        shimmer: "shimmer 2s linear infinite",
        "pulse-dot": "pulse_dot 1.4s ease-in-out infinite",
        aurora: "aurora 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
