/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-deep": "#05060A",
        "bg-panel": "#0B0F1A",
        "bg-glass": "rgba(18, 24, 40, 0.55)",
        "text-primary": "#E8ECF5",
        "text-muted": "#8A92A8",
        "text-mono": "#C7D2E5",
        "accent-cyan": "#7DD3FC",
        "accent-amber": "#F5B971",
        "accent-violet": "#A78BFA",
      },
      fontFamily: {
        serif: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
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
