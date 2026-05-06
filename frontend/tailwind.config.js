/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Derivada para Foto Venda
        // Roxo Magenta (Liturgical, mais quente)
        'photo-primary': '#8B3E7A',
        'photo-primary-dark': '#5C2650',
        'photo-primary-light': 'rgba(139, 62, 122, 0.08)',

        // Ouro Saturado (Liturgical Gold++)
        'photo-accent': '#E8B923',
        'photo-accent-light': '#FFD966',
        'photo-accent-dark': '#B8860B',

        // Status & Semantic
        'photo-success': '#2B7A8E',      // Teal para confirmação
        'photo-success-light': 'rgba(43, 122, 142, 0.08)',
        'photo-paper': '#F9F5F0',        // Warm cream
        'photo-ink': '#1A1410',          // Near-black

        // Derivado do padrão paróquia mas ajustado
        'photo-green': '#2B7A8E',
      },
      fontFamily: {
        'display': '"Playfair Display", Georgia, serif',
        'body': '"Nunito", system-ui, -apple-system, sans-serif',
        'mono': '"JetBrains Mono", ui-monospace, Menlo, monospace',
      },
      fontSize: {
        'display': 'clamp(2.5rem, 5vw, 4rem)',
        'h1': 'clamp(1.875rem, 3vw, 2.5rem)',
        'h2': 'clamp(1.5rem, 2.5vw, 2rem)',
        'h3': '1.25rem',
        'h4': '1.125rem',
        'eyebrow': '0.75rem',
        'body': '1rem',
        'body-sm': '0.875rem',
        'caption': '0.75rem',
      },
      lineHeight: {
        'tight': '1.15',
        'snug': '1.3',
        'normal': '1.5',
        'relaxed': '1.65',
      },
      letterSpacing: {
        'tight': '-0.01em',
        'normal': '0',
        'wide': '0.05em',
        'widest': '0.20em',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '16px',
        '2xl': '24px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.10)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [],
};
