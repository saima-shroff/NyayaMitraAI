/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#0B1120', 900: '#0F172A', 800: '#1E293B', 700: '#334155' },
        gold: { 400: '#F59E0B', 500: '#D97706', 600: '#B45309' },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'], serif: ['Georgia', 'serif'] },
    },
  },
  plugins: [],
}
