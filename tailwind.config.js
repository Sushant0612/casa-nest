/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50: '#fbf6f1',
          100: '#f5e9dc',
          200: '#e8cfb4',
          300: '#d9b087',
          400: '#c78d5c',
          500: '#b5703f',
          600: '#9a5a32',
          700: '#7a4528',
          800: '#5e3622',
          900: '#44271a',
        },
      },
    },
  },
  plugins: [],
}
