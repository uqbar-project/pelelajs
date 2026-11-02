import { resolve } from 'node:path'
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    alias: {
      pelelajs: resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  test: {
    name: 'pelela-cli',
    environment: 'node',
    globals: true,
  },
})
