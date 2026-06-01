import { defineConfig } from 'vitest/config'

// Unit tests live under src/ (*.test.ts). The tests/e2e/ suite is Playwright
// and must be excluded so vitest doesn't try to load it.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['tests/**', 'node_modules/**'],
  },
})
