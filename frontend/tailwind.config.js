/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Diocese de Imperatriz — paleta oficial
        'photo-primary':       '#6D2077',
        'photo-primary-dark':  '#461356',
        'photo-primary-light': 'rgba(109, 32, 119, 0.08)',

        'photo-accent':        '#F7C848',
        'photo-accent-light':  'rgba(247, 200, 72, 0.10)',
        'photo-accent-dark':   '#C8A020',

        'photo-success':       '#3C7A5A',
        'photo-success-light': 'rgba(60, 122, 90, 0.08)',

        'photo-paper':         '#FAF6EF',
        'photo-ink':           '#18150F',

        // Neutros adicionais
        'photo-bone':          '#F4EDE0',
        'photo-grafite':       '#5C5347',
        'photo-sepia':         '#9C8E7E',
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
