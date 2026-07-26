/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0D1117',
        surface: '#161B22',
        border: '#30363D',
        textPrimary: '#E6EDF3',
        textSecondary: '#8B949E',
        nominal: '#3FB950',
        warning: '#D29922',
        critical: '#F85149',
        advisory: '#58A6FF',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
