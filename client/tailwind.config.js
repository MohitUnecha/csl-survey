/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        csl: {
          purple: '#C8102E',
          'purple-dark': '#7F111F',
          'purple-light': '#F26B74',
          blue: '#5B1220',
          teal: '#F97316',
          dark: '#1F2937',
          light: '#FFF4F4',
          gray: '#FFF8F8',
        }
      },
      animation: {
        'float-slow': 'float 20s ease-in-out infinite',
        'float-med': 'float 15s ease-in-out infinite reverse',
        'float-fast': 'float 12s ease-in-out infinite',
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '33%': { transform: 'translate(30px, -30px) rotate(5deg)' },
          '66%': { transform: 'translate(-20px, 20px) rotate(-3deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
