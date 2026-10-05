/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base:     '#ffffff',
        additive: '#f2f2f2',
        primary:  '#0f0f0f',
        secondary:'#606060',
        selected: '#0f0f0f',
        /* Todo priority colors — functional, kept as-is */
        urgent: { text: '#a32d2d', bg: '#fcebeb' },
        mid:    { text: '#854f0b', bg: '#faeeda' },
        low:    { text: '#0f6e56', bg: '#e1f5ee' },
      },
      fontFamily: {
        sans: ['"Roboto"', '"Apple SD Gothic Neo"', '"Pretendard"', '"Malgun Gothic"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
