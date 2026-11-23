import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'pnpm exec vite --port 4174 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
