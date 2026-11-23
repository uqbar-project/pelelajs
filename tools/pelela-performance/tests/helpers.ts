import type { CDPSession, Page } from '@playwright/test'

export const ITERATIONS = 50
export const CPU_THROTTLE_RATE = 4

export type PerformanceWindow = Window & {
  __pelelaMutate: () => void
  __pelelaDestroy: () => void
  __pelelaRunCycles: (count: number) => void
}

type CdpMetric = { name: string; value: number }

export async function runMutations(page: Page, rounds: number): Promise<number[]> {
  return page.evaluate(
    ({ iterations, roundCount }) => {
      const harness = window as PerformanceWindow
      const durations: number[] = []
      for (let round = 0; round < roundCount; round += 1) {
        const start = performance.now()
        for (let index = 0; index < iterations; index += 1) harness.__pelelaMutate()
        durations.push(performance.now() - start)
      }
      return durations
    },
    { iterations: ITERATIONS, roundCount: rounds },
  )
}

export async function runCycles(page: Page, count: number): Promise<void> {
  await page.evaluate((cycleCount) => {
    ;(window as PerformanceWindow).__pelelaRunCycles(cycleCount)
  }, count)
}

export type StartupTimings = {
  firstContentfulPaint: number
  bindingsReady: number
}

const STARTUP_ENTRY_TIMEOUT_MS = 5000

export async function startCpuThrottling(page: Page): Promise<CDPSession> {
  const session = await page.context().newCDPSession(page)
  await session.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE_RATE })
  return session
}

export async function stopCpuThrottling(session: CDPSession): Promise<void> {
  await session.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await session.detach()
}

export async function readStartupTimings(page: Page): Promise<StartupTimings> {
  const handle = await page.waitForFunction(
    () => {
      const paint = performance
        .getEntriesByType('paint')
        .find((entry) => entry.name === 'first-contentful-paint')
      const mark = performance.getEntriesByName('pelela-ready')[0]
      if (!paint || !mark) return null
      return { firstContentfulPaint: paint.startTime, bindingsReady: mark.startTime }
    },
    undefined,
    { timeout: STARTUP_ENTRY_TIMEOUT_MS },
  )
  const timings = await handle.jsonValue()
  if (!timings) throw new Error('Startup timings are unavailable')
  return timings
}

export async function readMountDuration(page: Page): Promise<number> {
  const handle = await page.waitForFunction(
    () => {
      const start = performance.getEntriesByName('pelela-setup-start')[0]
      const end = performance.getEntriesByName('pelela-ready')[0]
      if (!start || !end) return null
      return { duration: end.startTime - start.startTime }
    },
    undefined,
    { timeout: STARTUP_ENTRY_TIMEOUT_MS },
  )
  const result = await handle.jsonValue()
  if (result === null) throw new Error('Mount duration is unavailable')
  return result.duration
}

export async function getHeapUsedSize(page: Page): Promise<number> {
  const session = await page.context().newCDPSession(page)
  try {
    await session.send('Performance.enable')
    await session.send('HeapProfiler.enable')
    await session.send('HeapProfiler.collectGarbage')
    const response = (await session.send('Performance.getMetrics')) as { metrics: CdpMetric[] }
    const heapMetric = response.metrics.find(({ name }) => name === 'JSHeapUsedSize')
    if (!heapMetric) throw new Error('JSHeapUsedSize metric is unavailable')
    return heapMetric.value
  } finally {
    await session.detach()
  }
}
