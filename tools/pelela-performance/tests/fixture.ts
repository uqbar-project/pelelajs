import { test as base, expect, type Page } from '@playwright/test'
import { startCpuThrottling, stopCpuThrottling } from './helpers'

type Fixtures = {
  fixturePage: Page
  throttledPage: Page
}

export const test = base.extend<Fixtures>({
  fixturePage: async ({ page }, use) => {
    await page.goto('/')
    await use(page)
  },
  throttledPage: async ({ page }, use) => {
    const session = await startCpuThrottling(page)
    try {
      await page.goto('/')
      await use(page)
    } finally {
      await stopCpuThrottling(session)
    }
  },
})

export { expect }
