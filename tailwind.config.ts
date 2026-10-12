import type { Config } from 'tailwindcss'

// Charte graphique Solia (CLAUDE.md) : rose pour les actions, bordeaux pour les titres
// et les fonds forts, orange pour les repères et badges, beige pour les fonds.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rose: {
          DEFAULT: '#E83C71',
          clair: '#FBE2EA',
          fonce: '#C92A5C',
        },
        bordeaux: {
          DEFAULT: '#5A1A2E',
          clair: '#8A4A5E',
          fonce: '#43121F',
        },
        orange: {
          DEFAULT: '#FF8911',
          clair: '#FFE7CF',
        },
        beige: {
          DEFAULT: '#FDF5F0',
          fonce: '#F3E3D9',
        },
      },
      keyframes: {
        // Le PIN saute quand il avance sur la frise.
        saut: {
          '0%, 100%': { transform: 'translateY(0)' },
          '35%': { transform: 'translateY(-18px)' },
          '60%': { transform: 'translateY(0)' },
          '80%': { transform: 'translateY(-6px)' },
        },
        apparition: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        glissement: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        saut: 'saut 0.9s ease-out',
        apparition: 'apparition 0.25s ease-out',
        glissement: 'glissement 0.25s ease-out',
      },
      fontFamily: {
        titre: ['Redotic', 'Poppins', 'sans-serif'],
        label: ['"Lemon Milk"', 'Poppins', 'sans-serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
