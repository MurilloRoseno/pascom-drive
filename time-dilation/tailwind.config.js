/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        "gold": "#c9a84c",
        "gold-light": "#e8c97a",
        "gold-dim": "rgba(201, 168, 76, 0.15)",
        "glow": "rgba(201, 168, 76, 0.35)",
        "deep": "#03050f",
        "void": "#060914",
        "nebula-1": "#0d1b3e",
        "nebula-2": "#0a1628",
        "accent": "#6eb5ff",
        "text-primary": "#e8e4d8",
        "text-muted": "#8A92A8",
        "text-dim": "rgba(232, 228, 216, 0.55)",
        "text-faint": "rgba(232, 228, 216, 0.25)",
        "text-mono": "#C7D2E5",
        "border": "rgba(201, 168, 76, 0.2)",
        "border-subtle": "rgba(232, 228, 216, 0.08)",
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "serif"],
        display: ["Cinzel", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backdropBlur: {
        sm: "4px",
        DEFAULT: "12px",
        lg: "20px",
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "16px",
      },
    },
  },
  plugins: [],
}
