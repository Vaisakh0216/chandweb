/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50:  '#f0f7f4',
          100: '#d9ede6',
          200: '#b5dbce',
          300: '#85c2b0',
          400: '#52a28e',
          500: '#2e7d5e',  // primary
          600: '#246449',
          700: '#1e5039',
          800: '#1a402e',
          900: '#163427',
          950: '#0a1e17',
        },
        cream: {
          50:  '#fdfcf8',
          100: '#faf8f0',
          200: '#f5f0e1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
