import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Le jeu de démo (src/data/seed.generated.json) forme un fichier d'environ 2 Mo, chargé une fois.
  build: { chunkSizeWarningLimit: 2500 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
