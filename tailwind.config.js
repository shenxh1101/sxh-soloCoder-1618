/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        brand: {
          50: '#FFF3ED',
          100: '#FFE4D4',
          200: '#FFC5A8',
          300: '#FF9D71',
          400: '#FF7A45',
          500: '#E8652E',
          600: '#CC4F1A',
          700: '#A83D13',
          800: '#863217',
          900: '#6E2B16',
        },
        surface: {
          900: '#1E1E2E',
          800: '#262637',
          700: '#2E2E42',
          600: '#3A3A50',
          100: '#FAF8F5',
          50: '#FFFFFF',
        },
        profit: '#2ECC71',
        loss: '#E74C3C',
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
