/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // SportSphere "Fuel & Pitch" palette
        paper: { DEFAULT: '#F5F1E8', soft: '#FBF8F1' },
        ink: { DEFAULT: '#0F1417', soft: '#4B5560', faint: '#6B7280' },
        line: '#E4DCCB',
        volt: { DEFAULT: '#B8E639', ink: '#1A2604', soft: '#C7ED44', halo: '#ECF6CE', dark: '#1B2609' },
        pitch: { DEFAULT: '#123B33', dark: '#17473C', soft: '#0C1113' },
        ember: { DEFAULT: '#FF6A3D', dark: '#FF7A45' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'volt': '0 8px 30px -8px rgba(184, 230, 57, 0.35)',
        'ember': '0 8px 30px -8px rgba(255, 106, 61, 0.35)',
        'pitch': '0 14px 40px -12px rgba(18, 59, 51, 0.45)',
        'card': '0 1px 2px rgba(15, 20, 23, 0.04), 0 8px 24px -12px rgba(15, 20, 23, 0.15)',
      },
      backgroundImage: {
        'pitch-field': 'radial-gradient(circle at 50% 120%, rgba(184,230,57,0.16) 0%, transparent 55%)',
        'paper-mesh': 'radial-gradient(at 10% 15%, rgba(184,230,57,0.10) 0, transparent 55%), radial-gradient(at 88% 8%, rgba(255,106,61,0.10) 0, transparent 50%), radial-gradient(at 50% 90%, rgba(18,59,51,0.06) 0, transparent 55%)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        pulsehalo: { '0%,100%': { opacity: 0.4 }, '50%': { opacity: 0.9 } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        marquee: 'marquee 30s linear infinite',
        pulsehalo: 'pulsehalo 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
