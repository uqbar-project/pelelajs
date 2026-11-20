import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const CURRENT_REPORT_PATH = 'benchmarks/current.json'
const BASELINE_PATH = 'benchmarks/baseline.json'
const BUDGETS_PATH = 'performance-budgets.json'
const MARGIN_PERCENT = 20
const MARGIN_MULTIPLIER = 1 + MARGIN_PERCENT / 100
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype']

export type BenchmarkResult = {
  name?: string
  mean?: number
}

export type BenchmarkReport = {
  files: Array<{
    groups: Array<{ benchmarks: BenchmarkResult[] }>
  }>
}

export type BudgetFile = {
  version: number
  marginPercent: number
  budgets: Record<string, number>
}

export type NamedBenchmark = BenchmarkResult & { name: string; mean: number }

export type BudgetEvaluation = {
  name: string
  mean: number
  budget: number
  exceeded: boolean
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

function isBenchmarkReport(value: unknown): value is BenchmarkReport {
  return (
    typeof value === 'object' && value !== null && Array.isArray((value as BenchmarkReport).files)
  )
}

function isBudgetFile(value: unknown): value is BudgetFile {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.version === 'number' &&
    typeof candidate.marginPercent === 'number' &&
    typeof candidate.budgets === 'object' &&
    candidate.budgets !== null
  )
}

function isNamedBenchmark(result: BenchmarkResult): result is NamedBenchmark {
  return (
    typeof result.name === 'string' &&
    typeof result.mean === 'number' &&
    Number.isFinite(result.mean)
  )
}

function isSafeKey(key: string): boolean {
  return !FORBIDDEN_KEYS.includes(key)
}

function getBudget(budgets: Record<string, number>, name: string): number | undefined {
  return isSafeKey(name) && Object.hasOwn(budgets, name) ? budgets[name] : undefined
}

export function collectBenchmarks(report: BenchmarkReport): NamedBenchmark[] {
  return report.files
    .flatMap((file) => file.groups)
    .flatMap((group) => group.benchmarks)
    .filter(isNamedBenchmark)
}

export function evaluateBudgets(
  benchmarks: NamedBenchmark[],
  budgetFile: BudgetFile,
): BudgetEvaluation[] {
  return benchmarks.flatMap((benchmark) => {
    const budget = getBudget(budgetFile.budgets, benchmark.name)
    if (budget === undefined) return []
    return [
      { name: benchmark.name, mean: benchmark.mean, budget, exceeded: benchmark.mean > budget },
    ]
  })
}

function fail(message: string): void {
  console.error(message)
  process.exit(1)
}

function updateBaseline(report: BenchmarkReport, benchmarks: NamedBenchmark[]): void {
  const budgets = Object.fromEntries(
    benchmarks
      .filter((benchmark) => isSafeKey(benchmark.name))
      .map((benchmark) => [benchmark.name, benchmark.mean * MARGIN_MULTIPLIER]),
  )
  const budgetFile: BudgetFile = {
    version: 1,
    marginPercent: MARGIN_PERCENT,
    budgets,
  }

  mkdirSync(dirname(BASELINE_PATH), { recursive: true })
  writeFileSync(BASELINE_PATH, `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(BUDGETS_PATH, `${JSON.stringify(budgetFile, null, 2)}\n`)

  console.log(`Baseline written to ${BASELINE_PATH}`)
  console.log(`Budgets written to ${BUDGETS_PATH} (${MARGIN_PERCENT}% over each mean)`)
}

function checkBudgets(benchmarks: NamedBenchmark[], budgetFile: BudgetFile): void {
  const budgetNames = Object.keys(budgetFile.budgets).filter(isSafeKey)
  if (budgetNames.length === 0) {
    console.warn('No calibrated budgets yet. Run `pnpm run bench:baseline` on the CI runner first.')
    return
  }

  const measuredNames = new Set(benchmarks.map((benchmark) => benchmark.name))
  const missingNames = budgetNames.filter((name) => !measuredNames.has(name))
  if (missingNames.length > 0) {
    fail(`Budgets without a measurement: ${missingNames.join(', ')}`)
  }

  const evaluations = evaluateBudgets(benchmarks, budgetFile)
  evaluations.forEach((evaluation) => {
    const status = evaluation.exceeded ? 'FAIL' : 'OK'
    console.log(
      `${status} ${evaluation.name}: ${evaluation.mean.toFixed(4)} ms ` +
        `(max ${evaluation.budget.toFixed(4)} ms)`,
    )
  })

  const exceededNames = evaluations
    .filter((evaluation) => evaluation.exceeded)
    .map((evaluation) => evaluation.name)
  if (exceededNames.length > 0) {
    const names = exceededNames.join(', ')
    fail(`${exceededNames.length} benchmark(s) exceeded the ${MARGIN_PERCENT}% margin: ${names}`)
  }
}

export function main(): void {
  if (!existsSync(CURRENT_REPORT_PATH)) {
    fail(`Benchmark report not found: ${CURRENT_REPORT_PATH}. Run \`pnpm run bench\` first.`)
  }

  const report = readJson(CURRENT_REPORT_PATH)
  if (!isBenchmarkReport(report)) {
    fail(`Invalid benchmark report: ${CURRENT_REPORT_PATH}`)
  }

  const benchmarks = collectBenchmarks(report)
  if (benchmarks.length === 0) {
    fail(`No benchmark results found in ${CURRENT_REPORT_PATH}`)
  }

  const shouldUpdate =
    process.argv.includes('--update') || process.env.BENCH_UPDATE_BASELINE === '1'
  if (shouldUpdate) {
    updateBaseline(report, benchmarks)
    return
  }

  if (!existsSync(BUDGETS_PATH)) {
    fail(`Budget file not found: ${BUDGETS_PATH}. Run \`pnpm run bench:baseline\` first.`)
  }

  const budgetFile = readJson(BUDGETS_PATH)
  if (!isBudgetFile(budgetFile)) {
    fail(`Invalid budget file: ${BUDGETS_PATH}`)
  }

  checkBudgets(benchmarks, budgetFile)
}

const isEntryPoint =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isEntryPoint) main()
