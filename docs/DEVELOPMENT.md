# Development Setup

This guide provides the necessary steps to set up the PelelaJS monorepo for local development. This is intended for **framework contributors**, not end-users building apps with PelelaJS.

[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](../LICENSE.txt)
[![Node.js 24.22](https://img.shields.io/badge/node-24.22-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/-pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Biome](https://img.shields.io/badge/-Biome-60A5FA?logo=biome&logoColor=white)](https://biomejs.dev)
[![Vitest](https://img.shields.io/badge/-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![CI](https://github.com/uqbar-project/pelelajs/actions/workflows/ci.yml/badge.svg)](https://github.com/uqbar-project/pelelajs/actions/workflows/ci.yml)

## Prerequisites

- **Node.js**: Use the recommended version in the root `.nvmrc` with `nvm install` and `nvm use`.
  CI also reads this file. Compatible versions are declared in `engines.node` in
  [package.json](../package.json).

- **pnpm**: This project strictly uses `pnpm` as the package manager (`npm` or `yarn` will fail).

- **VSCode**: Recommended editor for its excellent TypeScript and LSP support.

## Recommended VSCode Extensions

To ensure a smooth development experience and adherence to the project's coding standards, we recommend installing the following extensions:

- **Biome (`biomejs.biome`)**: Mandatory for linting and formatting. The project is configured to auto-format on save using Biome.

- **Pelela Templates (`uqbar.pelela-vscode`)**: Provides syntax highlighting and Intellisense for `.pelela` files. Essential when working on examples or integration tests.

- **Vitest (`vitest.explorer`)**: (Optional) Provides a rich UI for running and debugging tests directly from the editor.

## Initial Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/uqbar-project/pelelajs.git
   cd pelelajs
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

   *Note: This will install dependencies across all workspaces (`packages/core`, `tools/pelela-cli`, `tools/pelela-vscode`, etc.) using the configuration in `pnpm-workspace.yaml`.*

3. **Build the framework:**

   ```bash
   pnpm run build
   ```

## Skills by Area

PelelaJS is a monorepo, so you can start with the area that best matches what you already know. The table below maps each area to the knowledge it requires and to a good first place to read code.

| Area | Knowledge required | Start here |
| --- | --- | --- |
| Core & bindings | Advanced TypeScript, DOM API, reactivity | `packages/core/src/bindings`, `packages/core/src/reactivity` |
| Static analysis | TypeScript Compiler API (no regex) | `packages/core/src/analysis` |
| Vite plugin | Vite plugin API, module transformation | `packages/vite-plugin-pelelajs` |
| CLI | Node.js, project templates, i18n (`t()`) | `tools/pelela-cli` |
| VSCode extension | Language Server Protocol, `vscode` API | `tools/pelela-vscode` |
| Testing & QA | Vitest, Playwright, CDP, Mocha, coverage tooling | `packages/*/test`, `tools/pelela-performance/tests`, `tools/pelela-vscode/test` |

You do not need to master every area. A good way to contribute is to pick one area, read its tests, and start with a small change.

## Recommended Readings

If you are new to some of these topics, the following resources are a good starting point:

- **MVC:** Trygve Reenskaug, *Models-Views-Controllers* (1979), the original pattern description, available through the [Internet Archive](https://web.archive.org/web/2023/http://heim.ifi.uio.no/~trygver/themes/mvc/mvc-index.html).

- **GUI architectures:** Martin Fowler, [GUI Architectures](https://martinfowler.com/eaaDev/uiArchs.html), a comparison of MVC, MVP, and MVVM.

- **MVVM:** John Gossman, [Introduction to Model/View/ViewModel pattern for building WPF apps](https://learn.microsoft.com/en-us/archive/blogs/johngossman/introduction-to-modelviewviewmodel-pattern-for-building-wpf-apps) (2005).

- **Reactivity:** the Vue 2 [reactivity guide](https://v2.vuejs.org/v2/guide/reactivity.html) (based on `Object.defineProperty`) and the Vue 3 [reactivity in depth](https://vuejs.org/guide/extras/reactivity-in-depth.html) guide (based on `Proxy`). Together they explain the trade-offs behind `packages/core/src/reactivity`.

- **TypeScript Compiler API:** [Using the Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API), plus how `packages/core/src/analysis` applies it.

- **Vite plugins:** the official [Plugin API guide](https://vite.dev/guide/api-plugin).

- **Language Server Protocol:** the [official specification](https://microsoft.github.io/language-server-protocol/) and the `vscode.languages` API.

- **Security:** the OWASP [XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html), which motivates our sanitization rules.

## Workflow & Guidelines

The project enforces strict coding standards outlined in `AGENTS.md`.

### Architecture Conventions

- **Module System**: The source is written in ESM; the build emits both ESM and CommonJS (CJS) bundles for compatibility.

- **Type Safety**: Strict typing is mandatory. The use of `any` or `never` is prohibited; prefer `unknown` with type narrowing.

- **Error Handling**: "Fail fast" philosophy. Throw clear exceptions for unexpected states. Do not leave empty `catch` blocks.

- **Localization**: Any user-facing string (especially in the CLI) must use the `t()` internationalization utility.

### Linting & Formatting

PelelaJS uses **Biome** as its primary toolchain for formatting and linting.

- To check for issues:

  ```bash
  pnpm run biome:check
  ```

- To automatically fix format and safe lint errors:

  ```bash
  pnpm run biome:check:fix
  ```

### Type Checking

Strict typing is a priority. While the editor provides real-time feedback, you should run the full type check across all packages before committing:

```bash
pnpm run typecheck
```

### Testing

Testing is a core requirement (>90% coverage). We use **Vitest**.

- Run all tests:

  ```bash
  pnpm run test --run
  ```

- Run tests in watch mode during development:

  ```bash
  pnpm run test:watch
  ```

Browser performance checks are part of `pnpm test`. To run only that suite, use `pnpm run test:performance`; [Performance Testing](./performance/PERFORMANCE_TESTING.md) explains the categories, limits, and artifacts.

Tests are documentation: name them after the behavior they verify, and preferably write the failing test before fixing a bug.

### Working Rules

These rules keep the codebase predictable for students and contributors. They are not style preferences: CI and code review expect them.

#### Prefer declarative code over imperative loops

Use `map`, `filter`, and `reduce` instead of `for`, `break`, or `continue`.

❌ Avoid:

```typescript
const activeNames: string[] = []
for (const user of users) {
  if (user.isActive) {
    activeNames.push(user.name)
  }
}
```

✅ Prefer:

```typescript
const activeNames = users.filter((user) => user.isActive).map((user) => user.name)
```

#### Use `unknown`, never `any`

`any` disables the type checker and hides bugs. Use `unknown` and narrow it explicitly.

❌ Avoid:

```typescript
function normalizeName(raw: any) {
  return raw.trim()
}
```

✅ Prefer:

```typescript
function normalizeName(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new TypeError('Expected a string')
  }
  return raw.trim()
}
```

#### Prefer polymorphism over `instanceof`

Model variations with types and methods, not with conditionals on concrete classes. `instanceof` is only acceptable in error handling.

❌ Avoid:

```typescript
function area(shape: Circle | Square): number {
  if (shape instanceof Circle) return Math.PI * shape.radius ** 2
  return shape.side ** 2
}
```

✅ Prefer:

```typescript
interface Shape {
  area(): number
}

class Circle implements Shape {
  constructor(private readonly radius: number) {}

  area(): number {
    return Math.PI * this.radius ** 2
  }
}

class Square implements Shape {
  constructor(private readonly side: number) {}

  area(): number {
    return this.side ** 2
  }
}

const totalArea = (shapes: Shape[]) => shapes.reduce((sum, shape) => sum + shape.area(), 0)
```

#### Do not fear booleans

Return the comparison directly instead of wrapping it in an `if`.

❌ Avoid:

```typescript
function isSameUser(first: User, second: User): boolean {
  if (first.id === second.id) {
    return true
  }
  return false
}
```

✅ Prefer:

```typescript
const isSameUser = (first: User, second: User): boolean => first.id === second.id
```

#### Comment the *why*, not the *what*

Do not add inline comments inside methods, and avoid comments that restate the code. A method-level comment should explain its purpose or a non-obvious decision.

❌ Avoid:

```typescript
// Increment the counter by one
counter++ // update the counter
```

✅ Prefer:

```typescript
// Bindings are resolved once per element to avoid re-querying the DOM
// on every model update.
bindElement(element)
```

#### Localize every user-facing message

Any message that a student can see must go through `t()`. Do not hardcode Spanish or English text.

❌ Avoid:

```typescript
throw new Error('El template no tiene un elemento raíz <pelela>')
```

✅ Prefer:

```typescript
throw new Error(t('errors.compiler.malformedTemplate', { template }))
```

#### Clean up tests with `afterEach`

Cleanup belongs in `afterEach`, not repeated in every test: it runs even when a test fails.

❌ Avoid:

```typescript
test('registers a component', () => {
  registerComponent(component)
  // ...
  registry.clear()
})

test('rejects a duplicate component', () => {
  registerComponent(component)
  // ...
  registry.clear()
})
```

✅ Prefer:

```typescript
afterEach(() => {
  registry.clear()
})

test('registers a component', () => {
  registerComponent(component)
  // ...
})
```

#### Assert exact values, not fragments

Use exact comparisons with well-named constants. Do not use magic strings or partial checks (`toContain`, `endsWith`) when asserting behavior.

❌ Avoid:

```typescript
expect(error.message).toContain('missing')
```

✅ Prefer:

```typescript
const viewModelName = 'Home'
expect(error.message).toBe(t('errors.viewmodel.registration.missing', { name: viewModelName }))
```

#### Sanitize before touching the DOM

Dynamic content injected through `innerHTML` or similar must be sanitized first. When handling dynamic keys, reject `__proto__`, `constructor`, and `prototype`.

❌ Avoid:

```typescript
element.innerHTML = userProvidedHtml
```

✅ Prefer:

```typescript
element.innerHTML = sanitizeHTML(userProvidedHtml)
```

Never write to `target[key]` before checking it with `hasProperty`, which rejects the `__proto__`, `constructor`, and `prototype` keys.

### How We Work

- **One branch per issue.** Reference the issue in the pull request description, for example `Fix #108`. Keep pull requests focused: unrelated refactors make review harder, and CI must be green before requesting review.

- **Commit messages:** PelelaJS does **not** use conventional commits. Follow the existing style:

  ```text
  Fix #189 - add typecheck test for new Pelela projects
  Feature #190 view model under routing fixes
  ```

  Describe what the commit does in plain language and reference the issue when applicable.

- **Before requesting review**, run the same checks as CI:

  ```bash
  pnpm run biome:check
  pnpm run typecheck
  pnpm run test --run
  pnpm run build
  pnpm exec vitest run --coverage --silent=passed-only
  ```

- **AI assistants:** if you use one, point it to [AGENTS.md](../AGENTS.md) and to the [Graphify setup](../README.md#using-ai-assistants) described in the main README.

## Community

- **Discord:** join us at [https://discord.gg/kym9qqGyx](https://discord.gg/kym9qqGyx) to ask questions, propose ideas, and coordinate contributions.

- **Contributing guide:** read [CONTRIBUTING.md](../CONTRIBUTING.md) for the pull request workflow and commit style.

- **Code of Conduct:** participation in all PelelaJS spaces is covered by our [Code of Conduct](../CODE_OF_CONDUCT.md).
