import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: ['tests/**', 'node_modules/**'],
    globals: true,
    setupFiles: 'tests/setup.ts',
  },
})