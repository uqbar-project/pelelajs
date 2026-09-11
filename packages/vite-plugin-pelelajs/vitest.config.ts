import { resolve } from 'node:path'
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    alias: {
      'pelelajs/analysis': resolve(__dirname, '../core/src/analysis/index.ts'),
      pelelajs: resolve(__dirname, '../core/src/index.ts'),
    },
  },
  test: {
    name: 'vite-plugin-pelelajs',
    environment: 'node',
  },
})
