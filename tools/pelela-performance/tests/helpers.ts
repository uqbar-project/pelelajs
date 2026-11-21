import type { Page } from '@playwright/test'

export const ITERATIONS = 50

export type PerformanceWindow = Window & {
  __pelelaMutate: () => void
  __pelelaMutateDegraded: () => void
  __pelelaDestroy: () => void
}

type LongTaskWindow = Window & { __pelelaLongTasks?: number[] }
type CdpMetric = { name: string; value: number }
type MutationName = '__pelelaMutate' | '__pelelaMutateDegraded'

function createMutationRunner(mutationName: MutationName) {
  return (page: Page): Promise<number> =>
    page.evaluate(
      ({ iterations, name }) => {
        const harness = window as PerformanceWindow
        const mutate = harness[name]
        const start = performance.now()
        for (let index = 0; index < iterations; index += 1) mutate()
        return performance.now() - start
      },
      { iterations: ITERATIONS, name: mutationName },
    )
}

export const runMutations = createMutationRunner('__pelelaMutate')
export const runDegradedMutations = createMutationRunner('__pelelaMutateDegraded')

export async function startLongTaskCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    const durations: number[] = []
    ;(window as LongTaskWindow).__pelelaLongTasks = durations
    new PerformanceObserver((entries) => {
      entries.getEntries().forEach((entry) => {
        durations.push(entry.duration)
      })
    }).observe({ type: 'longtask', buffered: true } as PerformanceObserverInit)
  })
}

export async function readLongTasks(page: Page): Promise<number[]> {
  return page.evaluate(() => (window as LongTaskWindow).__pelelaLongTasks ?? [])
}

export async function flushObserverCallbacks(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 50)))
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
