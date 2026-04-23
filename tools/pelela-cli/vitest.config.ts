import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'pelela-cli',
    environment: 'node',
    globals: true,
  },
})
