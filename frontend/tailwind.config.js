/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Editorial serif for display headings, clean grotesque for body.
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand palette — aubergine/plum + warm gold on a warm paper ground.
        plum: {
          50: '#FBF4F7',
          100: '#F5E6EE',
          200: '#E8C7D8',
          300: '#D49DBA',
          400: '#B96E94',
          500: '#9C4A74',
          600: '#7E3459',
          700: '#6B2C4F',
          800: '#4F2039',
          900: '#3A172A',
        },
        gold: {
          50: '#FBF7EC',
          100: '#F5ECCF',
          200: '#EAD79C',
          300: '#DDBF66',
          400: '#CFA63C',
          500: '#B8860B',
          600: '#996F08',
          700: '#74540A',
          800: '#5A410D',
          900: '#4A360F',
        },
        paper: {
          DEFAULT: '#FCFAF6',
          100: '#F7F3EC',
          200: '#EFE9DD',
        },
        ink: {
          DEFAULT: '#231A1F',
          soft: '#4A3F45',
          muted: '#8A7F85',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(58,23,42,0.04), 0 8px 24px -12px rgba(58,23,42,0.12)',
        lift: '0 12px 40px -12px rgba(58,23,42,0.28)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: 0, transform: 'scale(0.96)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 0.35s ease-out both',
        'scale-in': 'scale-in 0.18s ease-out both',
      },
    },
  },
  plugins: [],
};
