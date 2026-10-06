/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f3efe8',
        surface: '#fffcf7',
        divider: '#e4ddd2',
        ink: {
          DEFAULT: '#1a1814',
          muted: '#6e675c',
          faint: '#9a9286',
        },
        seal: {
          DEFAULT: '#7c2430',
          hover: '#5f1b25',
          soft: '#f4e6e8',
        },
      },
      boxShadow: {
        sheet: '0 24px 60px -28px rgba(40, 28, 18, 0.28)',
        card: '0 1px 0 rgba(255,255,255,0.8), 0 12px 32px -18px rgba(40, 28, 18, 0.18)',
      },
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
