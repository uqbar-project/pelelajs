import { expect, test } from '@playwright/test'
import {
  getHeapUsedSize,
  ITERATIONS,
  type PerformanceWindow,
  runCycles,
  runMutations,
} from './helpers'

const ROUNDS = 3
const CYCLES = 10
const MAX_BATCH_DURATION_MS = 50
const MAX_MEMORY_GROWTH_RATIO = 1.2

test('a batch of selective updates stays below the main-thread limit', async ({ page }) => {
  await page.goto('/')
  const firstValue = page.locator('[data-row="0"] .value')
  await expect(firstValue).toHaveText('0')

  const durations = await runMutations(page, ROUNDS)
  await expect(firstValue).toHaveText(String(ITERATIONS * ROUNDS))

  expect(Math.max(...durations)).toBeLessThan(MAX_BATCH_DURATION_MS)
  console.log(`[propagation] ${durations.join(' ')} ms per batch`)
})

test('destroy keeps the heap flat and stops further updates', async ({ page }) => {
  await page.goto('/')
  const firstValue = page.locator('[data-row="0"] .value')
  await expect(firstValue).toHaveText('0')

  const baseline = await getHeapUsedSize(page)
  await runCycles(page, CYCLES)
  const afterDestroy = await getHeapUsedSize(page)

  expect(afterDestroy / baseline).toBeLessThanOrEqual(MAX_MEMORY_GROWTH_RATIO)

  await page.evaluate(() => (window as PerformanceWindow).__pelelaDestroy())
  await page.evaluate(() => (window as PerformanceWindow).__pelelaMutate())
  await expect(firstValue).toHaveText('0')

  console.log(`[memory] baseline=${baseline} afterDestroy=${afterDestroy}`)
})
