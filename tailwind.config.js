// tailwind.config.js
const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './resources/js/**/*.{js,jsx,ts,tsx}',
    './resources/views/**/*.blade.php',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
      },
    }
  },
  plugins: [],
};