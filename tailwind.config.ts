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
      fontFamily: {
        titre: ['Redotic', 'Poppins', 'sans-serif'],
        label: ['"Lemon Milk"', 'Poppins', 'sans-serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
