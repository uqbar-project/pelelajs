# Benchmark artifacts

`pnpm run bench` runs the internal Vitest benchmarks and writes `current.json`, which is ignored by git. The numbers are informational: they help spot broad trends, but they are not compared against a fixed budget because developer machines and CI runners are not comparable.

`pnpm run test:performance` writes `tools/pelela-performance/playwright-report/results.json`, also ignored by git. It contains the Playwright + CDP measurements; the pass/fail decisions happen as assertions inside the spec.
