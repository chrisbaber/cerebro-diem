/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6750A4',
          container: '#EADDFF',
        },
        secondary: {
          DEFAULT: '#625B71',
          container: '#E8DEF8',
        },
        tertiary: {
          DEFAULT: '#7D5260',
        },
        surface: {
          DEFAULT: '#FFFBFE',
          variant: '#E7E0EC',
        },
        background: '#FFFBFE',
        error: '#B3261E',
        outline: '#79747E',
        'on-primary': '#FFFFFF',
        'on-surface': '#1C1B1F',
        'on-surface-variant': '#49454F',
      },
    },
  },
  plugins: [],
}
