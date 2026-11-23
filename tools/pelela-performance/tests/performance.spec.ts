import { COMPARISON_ROW_COUNT } from '../src/rows'
import { expect, test } from './fixture'
import {
  CPU_THROTTLE_RATE,
  getHeapUsedSize,
  ITERATIONS,
  type PerformanceWindow,
  readMountDuration,
  readStartupTimings,
  runCycles,
  runMutations,
} from './helpers'

const ROUNDS = 3
const CYCLES = 10
const MAX_STARTUP_MS = 2000
const MAX_COMPOSITION_MS = 200
const MAX_BATCH_DURATION_MS = 50
const MAX_MEMORY_GROWTH_RATIO = 1.2

test('first paint and bindings happen quickly under CPU throttling', async ({ throttledPage }) => {
  const timings = await readStartupTimings(throttledPage)

  console.log(
    `[startup] fcp=${timings.firstContentfulPaint.toFixed(0)} ` +
      `bindingsReady=${timings.bindingsReady.toFixed(0)} ms (${CPU_THROTTLE_RATE}x CPU throttle)`,
  )

  expect(timings.firstContentfulPaint).toBeLessThan(MAX_STARTUP_MS)
  expect(timings.bindingsReady).toBeLessThan(MAX_STARTUP_MS)
})

test('for-each rows and Pelela components mount below the composition limit', async ({ page }) => {
  await page.goto('/for-each.html')
  const forEachMountDuration = await readMountDuration(page)
  await expect(page.locator('.row')).toHaveCount(COMPARISON_ROW_COUNT)

  await page.goto('/components.html')
  const componentMountDuration = await readMountDuration(page)
  const components = page.locator('row-component')
  await expect(components).toHaveCount(COMPARISON_ROW_COUNT)

  const expectedRows = Array.from({ length: COMPARISON_ROW_COUNT }, (_, index) => ({
    testId: `row-${index}`,
    value: String(index),
  }))
  await Promise.all(
    expectedRows.map(async ({ testId, value }) => {
      const row = page.getByTestId(testId)
      await expect(row.locator('input')).toHaveValue(value)
      await expect(row.locator('.value')).toHaveText(value)
      await expect(row.locator('.offset')).toHaveText('0')
    }),
  )

  console.log(
    `[composition] for-each=${forEachMountDuration.toFixed(0)} ` +
      `components=${componentMountDuration.toFixed(0)} ms`,
  )

  expect(forEachMountDuration).toBeLessThan(MAX_COMPOSITION_MS)
  expect(componentMountDuration).toBeLessThan(MAX_COMPOSITION_MS)
})

test('a batch of selective updates stays below the main-thread limit', async ({ fixturePage }) => {
  const firstValue = fixturePage.locator('[data-row="0"] .value')
  await expect(firstValue).toHaveText('0')

  const durations = await runMutations(fixturePage, ROUNDS)
  await expect(firstValue).toHaveText(String(ITERATIONS * ROUNDS))

  expect(Math.max(...durations)).toBeLessThan(MAX_BATCH_DURATION_MS)
  console.log(`[propagation] ${durations.join(' ')} ms per batch`)
})

test('updating the model preserves the focused input', async ({ fixturePage }) => {
  const firstInput = fixturePage.locator('[data-row="0"] input')
  await firstInput.focus()

  await expect(firstInput).toBeFocused()
  await expect(firstInput).toHaveValue('0')

  await fixturePage.evaluate(() => (window as PerformanceWindow).__pelelaMutate())

  await expect(firstInput).toBeFocused()
  await expect(firstInput).toHaveValue('1')
})

test('destroy keeps the heap flat and stops further updates', async ({ fixturePage }) => {
  const firstValue = fixturePage.locator('[data-row="0"] .value')
  await expect(firstValue).toHaveText('0')

  const baseline = await getHeapUsedSize(fixturePage)
  await runCycles(fixturePage, CYCLES)
  const afterDestroy = await getHeapUsedSize(fixturePage)

  expect(afterDestroy / baseline).toBeLessThanOrEqual(MAX_MEMORY_GROWTH_RATIO)

  await fixturePage.evaluate(() => (window as PerformanceWindow).__pelelaDestroy())
  await fixturePage.evaluate(() => (window as PerformanceWindow).__pelelaMutate())
  await expect(firstValue).toHaveText('0')

  console.log(`[memory] baseline=${baseline} afterDestroy=${afterDestroy}`)
})
