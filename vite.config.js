import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite-plus'

// https://viteplus.dev/guide — Vite+ drives dev/build/test/lint/fmt via `vp`
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    globals: true,
  },
  lint: {
    ignorePatterns: ['dist/**', 'node_modules/**', 'convex/_generated/**'],
  },
  fmt: {
    semi: false,
    singleQuote: true,
    ignorePatterns: ['convex/_generated/**'],
  },
})
