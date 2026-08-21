/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0A0D14',
          card: '#111726',
          'card-glass': 'rgba(17, 23, 38, 0.75)',
          surface: '#182238',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-active': 'rgba(244, 63, 94, 0.4)',
          purple: '#8B5CF6',
          pink: '#EC4899',
          cyan: '#06B6D4'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif']
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'equalizer': 'equalize 1.2s ease-in-out infinite alternate',
        'bounce-subtle': 'bounceSubtle 2s infinite'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 0.8, transform: 'scale(1)', filter: 'drop-shadow(0 0 15px rgba(244, 63, 94, 0.4))' },
          '50%': { opacity: 1, transform: 'scale(1.02)', filter: 'drop-shadow(0 0 25px rgba(244, 63, 94, 0.7))' }
        },
        equalize: {
          '0%': { height: '20%' },
          '50%': { height: '100%' },
          '100%': { height: '40%' }
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' }
        }
      }
    },
  },
  plugins: [],
}
