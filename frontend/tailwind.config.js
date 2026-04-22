/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aegis: {
          bg: 'var(--aegis-bg)',
          bg2: 'var(--aegis-bg2)',
          bg3: 'var(--aegis-bg3)',
          surface: 'var(--aegis-surface)',
          border: 'var(--aegis-border)',
          border2: 'var(--aegis-border2)',
          text: 'var(--aegis-text)',
          text2: 'var(--aegis-text2)',
          text3: 'var(--aegis-text3)',
          accent: 'var(--aegis-accent)',
          accent2: 'var(--aegis-accent2)',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
          pink: '#ec4899',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
