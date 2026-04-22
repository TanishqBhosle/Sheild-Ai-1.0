/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aegis: {
          bg: '#0f1117',
          bg2: '#161b27',
          bg3: '#1e2535',
          surface: '#212840',
          border: '#2d3650',
          border2: '#3d4a6a',
          text: '#e8ecf4',
          text2: '#a8b4cc',
          text3: '#6b7a99',
          accent: '#6366f1',
          accent2: '#4f46e5',
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
