/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#E63946', 50: '#fef2f2', 500: '#E63946', 600: '#cc2f3c', 700: '#b02535' },
        dark: { bg: '#0f172a', card: '#1e293b', border: '#334155', text: '#94a3b8' },
      },
    },
  },
  plugins: [],
};
