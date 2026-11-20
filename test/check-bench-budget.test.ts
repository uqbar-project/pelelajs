import { describe, expect, it } from 'vitest'
import {
  type BenchmarkReport,
  type BudgetFile,
  collectBenchmarks,
  evaluateBudgets,
} from '../scripts/check-bench-budget'

const PROPAGATION = 'propagation-flat'
const TRACKER = 'dependency-tracker-lookup'
const MEAN = 0.5

function createReport(): BenchmarkReport {
  return {
    files: [
      {
        groups: [
          {
            benchmarks: [{ name: PROPAGATION, mean: MEAN }, { mean: 10 }],
          },
          {
            benchmarks: [{ name: TRACKER, mean: 2 }],
          },
        ],
      },
    ],
  }
}

function createBudgetFile(budgets: Record<string, number>): BudgetFile {
  return { version: 1, marginPercent: 20, budgets }
}

describe('check-bench-budget', () => {
  describe('collectBenchmarks', () => {
    it('flattens every group and keeps only benchmarks with a name and a finite mean', () => {
      const result = collectBenchmarks(createReport())

      expect(result).toEqual([
        { name: PROPAGATION, mean: MEAN },
        { name: TRACKER, mean: 2 },
      ])
    })
  })

  describe('evaluateBudgets', () => {
    it('does not flag a measurement below its budget', () => {
      const budgetFile = createBudgetFile({ [PROPAGATION]: MEAN * 1.2 })

      const result = evaluateBudgets(collectBenchmarks(createReport()), budgetFile)

      expect(result).toEqual([
        { name: PROPAGATION, mean: MEAN, budget: MEAN * 1.2, exceeded: false },
      ])
    })

    it('flags a regression when the measured mean exceeds the calibrated margin', () => {
      const budget = MEAN * 0.8
      const budgetFile = createBudgetFile({ [PROPAGATION]: budget })

      const result = evaluateBudgets(collectBenchmarks(createReport()), budgetFile)

      expect(result).toEqual([{ name: PROPAGATION, mean: MEAN, budget, exceeded: true }])
    })

    it('ignores unbudgeted benchmarks and prototype-pollution keys', () => {
      const report = createReport()
      report.files[0].groups[0].benchmarks.push({ name: '__proto__', mean: 0 })
      const budgetFile = createBudgetFile({
        [TRACKER]: 2,
        ['__proto__']: 0,
        constructor: 0,
        prototype: 0,
      })

      const result = evaluateBudgets(collectBenchmarks(report), budgetFile)

      expect(result).toEqual([{ name: TRACKER, mean: 2, budget: 2, exceeded: false }])
    })
  })
})
