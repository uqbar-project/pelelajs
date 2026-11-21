import type { Page } from '@playwright/test'

export const ITERATIONS = 50

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
