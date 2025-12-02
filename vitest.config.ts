import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    exclude: ['tests/**', 'node_modules/**'],
    globals: true,
    setupFiles: 'tests/setup.ts',
  },
})