# Performance Testing

PelelaJS is a teaching framework: the goal is not to support millions of concurrent nodes, but to keep DOM updates, teardown, and startup predictable on a student's machine and on CI.

Every performance check in this repository is a real test with `expect` assertions. There is no standalone benchmark script and no informational-only number: if a metric cannot be asserted, it is not part of the suite.

## Categories

| Category | Question it answers | Instrumentation | Limit |
| --- | --- | --- | --- |
| **A. DOM updates** | Is the update surgical, does it keep focus, and does it avoid blocking the main thread? | `performance.now()` around a batch; `document.activeElement` | Batch of 50 < 50 ms; focus preserved |
| **B. Lifecycle and memory** | Is everything that was mounted released? | CDP `JSHeapUsedSize` with forced GC | `afterDestroy / baseline <= 1.2` |
| **C. Startup** | When does the page paint and when are bindings active? How much does composition cost? | Paint timing + `performance.mark`, with 4x CPU throttling for the paint check | FCP and mark < 2000 ms; composition mount < 200 ms |

All five tests live in `tools/pelela-performance/tests/performance.spec.ts`. They run against three independent fixtures: `index.html` (the 100-row grid), `for-each.html`, and `components.html`.

## A. DOM updates

### A batch of selective updates stays below the main-thread limit

- **What it measures:** the cost of 50 sequential updates to a single row, repeated over 3 rounds. The spec asserts the final value is `150`, so it also verifies that every mutation reached the view.

- **Instrumentation:** `performance.now()` in the page, taken immediately before and after each batch. The reported number is the **worst** batch, not the average. Averages hide a single long task that the user would feel as a stutter.

- **Limit:** `MAX_BATCH_DURATION_MS = 50`. The fixture mutates one row per iteration on purpose: with 100 rows per iteration the proxy emits 300 notifications per batch and the limit stops measuring responsiveness.

- **If it fails:** look for work that scales with the whole grid. Typical causes are a binding that re-renders every row, a full `innerHTML` rebuild, or an expensive computation inside the reactive path. The `[propagation]` log in the test output shows all three batch durations.

### Updating the model preserves the focused input

- **What it measures:** a structural property instead of a duration. The test focuses the `<input>` bound to `rows.0.value`, mutates that row, and asserts the same element is still focused and its value changed from `0` to `1`.

- **Instrumentation:** Playwright's `toBeFocused()` and `toHaveValue()` assertions against the real DOM.

- **Limit:** none beyond correctness. This is a deterministic signal: there is no timing threshold to tune.

- **If it fails:** the update path replaced the existing node instead of writing to it. `renderSingleValueBinding` in `packages/core/src/bindings/bindValue.ts` assigns `input.value` when it differs, which preserves focus. A regression here usually means someone swapped selective propagation for a full re-mount.

## B. Lifecycle and memory

### Destroy keeps the heap flat and stops further updates

- **What it measures:** two things in one test. First, that repeated mount + `render.destroy()` cycles do not grow the heap. Second, that after `destroy()` a model mutation no longer touches the DOM.

- **Instrumentation:** a CDP session sends `Performance.enable`, `HeapProfiler.enable`, and `HeapProfiler.collectGarbage` before each reading, then reads `JSHeapUsedSize` from `Performance.getMetrics`. Forcing GC on both sides is what makes the two numbers comparable. The fixture runs 10 mount + destroy cycles between readings.

- **Limit:** `MAX_MEMORY_GROWTH_RATIO = 1.2`. It allows for normal allocator noise while still catching a listener or closure that survives teardown.

- **If it fails:** check `render.destroy()` in `packages/core/src/bindings/setupBindings.ts` and the `removeListener` functions returned by the event binding setup. The `[memory]` log shows both raw heap sizes, so you can tell whether the leak is large or just above the ratio. The second half of the test is the functional counterpart: if it fails, the problem is not memory but a listener that was never removed.

## C. Startup

### First paint and bindings happen quickly under CPU throttling

- **What it measures:** `first-contentful-paint` and the moment PelelaJS finished wiring the bindings. The fixture emits `performance.mark('pelela-ready')` right after `setupBindings` in `tools/pelela-performance/src/main.ts`; it records binding initialization only, not TTI and not readiness to respond to interactions.

- **Instrumentation:** CDP `Emulation.setCPUThrottlingRate({ rate: 4 })` is applied **before** `page.goto('/')`, so both the paint and the binding setup happen on a throttled CPU. The helper waits for both timing entries to exist before reading them: `goto` resolves on `load`, but Chromium records the paint entry on a later frame, and that gap grows under throttling. The throttle is restored and the session detached in `finally`.

- **Limit:** `MAX_STARTUP_MS = 2000` for each value. This is a guard against catastrophic regressions, not a responsiveness target. The `[startup]` log reports both numbers.

- **If it fails:** a high FCP points to work before the first paint (markup size, module graph). A high `bindingsReady` with a normal FCP points to `setupBindings` itself, for example a template with too many bindings or an expensive validation path. A timeout while waiting for the entries means the page never emitted the mark or never painted: check that `main.ts` still produces visible content.

### For-each rows and Pelela components mount below the composition limit

- **What it measures:** the cost of building the same 50-row grid two ways: a single `for-each="row of rows"` template, and 50 registered Pelela components bound with `prop-row`. Both fixtures emit a `pelela-setup-start` mark before `setupBindings` and the existing `pelela-ready` mark after it; the test compares the interval between them and also asserts that 50 rows were actually rendered in each case.

- **Instrumentation:** `readMountDuration` waits for both marks and returns `end.startTime - start.startTime`, so the limit applies to the setup interval rather than to a timestamp relative to navigation start. The startup test keeps reading `pelela-ready` on its own as a timestamp. Both composition fixtures run without CPU throttling, so the 200 ms ceiling is a direct comparison of the two composition strategies on the runner.

- **Limit:** `MAX_COMPOSITION_MS = 200` for each strategy. This is an absolute ceiling, not a ratio: the two paths have different JS/DOM cost profiles, so a ratio between them would move between machines.

- **If it fails:** the `[composition]` log shows both values. If only `components` is high, look at the per-instance work in `setupComponentBindings` (template sanitization and nested `setupBindings`). If both are high, the shared row template or the validation path is the likely cause.

## Instrumentation details

The Playwright config runs a Vite fixture on `127.0.0.1:4174` with `fullyParallel: false` and a single worker. Each test gets its own page, so CPU throttling and CDP sessions cannot leak into another measurement.

Two deliberate choices keep the suite stable across machines:

- **Wall-clock batches instead of `PerformanceObserver` longtasks.** A longtask observer measured a synthetic task and was fragile on CI. The 50 ms batch limit is a direct proxy for "the main thread stayed responsive".

- **Ratios only where hardware cancels out.** The heap limit is a ratio because the baseline depends on the engine. Timing comparisons between two different code paths were removed: JS-heavy and DOM-parser-heavy paths scale differently across CPUs, so the ratio moved between a development Mac and a Linux runner.

## Reference measurements

These are the values from a local run on a development Mac with the bundled Chromium. They are **reference points, not budgets**: runner hardware, Chromium version, and CPU contention will change them. The only enforced values are the limits in the spec.

| Measurement | Observed | Limit |
| --- | --- | --- |
| `first-contentful-paint` (4x throttle) | 92 ms | 2000 ms |
| `pelela-ready` mark (4x throttle) | 66 ms | 2000 ms |
| for-each mount, 50 rows | 3 ms | 200 ms |
| 50 components mount | 4 ms | 200 ms |
| Worst batch of 50 single-row mutations | 5.9 ms | 50 ms |
| Heap growth after 10 mount + destroy cycles | +9.1% (1,960,616 → 2,139,940 bytes) | +20% |

The composition numbers are close enough that neither strategy has a meaningful advantage at this size: the test checks that both stay under the ceiling, not that one wins. The batch and heap limits have similarly wide headroom, so a regression has to be substantial before it fails CI.

## Commands

Run only the browser performance suite (Playwright installs Chromium on the first run):

```bash
pnpm run test:performance
```

Run the full gate. Vitest, the performance suite, and the VS Code extension tests run in that order:

```bash
pnpm test
```

In CI, on `ubuntu-latest`, Chromium is installed with `pnpm --filter @pelelajs/performance exec playwright install --with-deps chromium` before `pnpm run test:performance`. The `--with-deps` flag installs the system libraries that headless Chromium needs on Linux.

## Artifacts

`pnpm run test:performance` writes `tools/pelela-performance/playwright-report/`, which is ignored by git:

- `results.json`: machine-readable durations, assertions, and test status.
- `index.html`: the HTML report, also available locally with `pnpm --filter @pelelajs/performance exec playwright show-report playwright-report`.

CI uploads the same directory as the `playwright-report` artifact, including on failure. The pass/fail decision is always made by the assertions in the spec; the artifact exists to explain *why* a test failed, not to be compared against an external budget.

## Out of scope

These ideas were evaluated and deliberately left out:

- **Standalone benchmarks.** A number without an assertion is not a test, requires an extra command, and never fails CI. Everything worth measuring lives in the spec.
- **Real INP.** It reintroduces the same fragile `PerformanceObserver` that was removed. The 50 ms batch limit is the maintainable proxy.
- **Layout thrashing.** Forced-reflow counters change between Chromium versions. It is a useful DevTools debugging technique, not a stable assertion.
- **Bundle size.** That is a build artifact budget, not runtime performance. If it is ever needed, it belongs in the build pipeline.
