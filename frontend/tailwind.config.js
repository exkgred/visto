/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#120c07',
          900: '#1a140c',
          800: '#241c12',
          700: '#352818',
          500: '#a39480',
          300: '#efe6d6',
        },
        accent: {
          DEFAULT: '#d4a017',
          hover: '#b8860b',
        },
        paper: {
          DEFAULT: '#f4efe6',
          ink: '#2a2218',
          muted: '#6b5e4e',
        },
      },
      boxShadow: {
        glow: '0 20px 60px rgba(212, 160, 23, 0.14)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
