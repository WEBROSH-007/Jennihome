module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: false,
  theme: {
    extend: {
      fontFamily: {
        sans: ['Mulish', 'sans-serif'],
        mulish: ['var(--font-mulish)'],
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
