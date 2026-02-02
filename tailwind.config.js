/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#1a1a1a',
        'dark-card': '#2a2a2a',
        'dark-border': '#3a3a3a',
        'dark-text': '#e0e0e0',
        'accent': '#ff6b6b',
      },
    },
  },
  plugins: [],
}
