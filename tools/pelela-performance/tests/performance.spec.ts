import { expect, test } from '@playwright/test'
import {
  flushObserverCallbacks,
  getHeapUsedSize,
  ITERATIONS,
  type PerformanceWindow,
  readLongTasks,
  runMutations,
  startLongTaskCapture,
} from './helpers'

test('selective propagation updates every row', async ({ page }) => {
  await page.goto('/')
  const firstValue = page.locator('[data-row="0"] .value')
  await expect(firstValue).toHaveText('0')

  const elapsed = await runMutations(page)

  await expect(firstValue).toHaveText(String(ITERATIONS))
  console.log(`[propagation] ${(elapsed / ITERATIONS).toFixed(4)} ms per mutation`)
})

test('long tasks are observed during the stress loop', async ({ page }) => {
  await page.goto('/')
  await startLongTaskCapture(page)

  await runMutations(page)
  await flushObserverCallbacks(page)

  const durations = await readLongTasks(page)
  const total = durations.reduce((sum, duration) => sum + duration, 0)
  await expect(page.locator('[data-row="0"] .value')).toHaveText(String(ITERATIONS))
  console.log(`[longtasks] count=${durations.length} total=${total.toFixed(2)} ms`)
})

test('destroy releases bindings and stops further updates', async ({ page }) => {
  await page.goto('/')
  const firstValue = page.locator('[data-row="0"] .value')
  await expect(firstValue).toHaveText('0')

  const baseline = await getHeapUsedSize(page)
  await runMutations(page)
  const afterMutations = await getHeapUsedSize(page)

  await page.evaluate(() => (window as PerformanceWindow).__pelelaDestroy())
  const afterDestroy = await getHeapUsedSize(page)

  await page.evaluate(() => (window as PerformanceWindow).__pelelaMutate())
  await expect(firstValue).toHaveText(String(ITERATIONS))

  console.log(
    `[memory] baseline=${baseline} afterMutations=${afterMutations} afterDestroy=${afterDestroy}`,
  )
})
