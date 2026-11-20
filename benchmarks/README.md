# Benchmark artifacts

`baseline.json` and the budgets in `../performance-budgets.json` are generated on the CI runner with:

```bash
pnpm run bench:baseline
```

`current.json` is produced by every `pnpm run bench` run and is ignored by git. The budget check compares each benchmark mean against `baseline mean × 1.2` and fails when it is exceeded.

Do not regenerate the baseline locally: developer machines and CI runners are not comparable. Use `pnpm run bench:baseline` in CI and commit the resulting files.
