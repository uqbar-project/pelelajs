# Development Setup

This guide provides the necessary steps to set up the PelelaJS monorepo for local development. This is intended for **framework contributors**, not end-users building apps with PelelaJS.

## Prerequisites

- **Node.js**: Ensure you have Node `v20` or higher.

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

## Workflow & Guidelines

The project enforces strict coding standards outlined in `AGENTS.md`.

### Linting & Formatting

PelelaJS uses **Biome** as its primary toolchain for formatting and linting.

- To check for issues:

  ```bash
  pnpm run biome:check
  ```

- To automatically fix format and safe lint errors:

  ```bash
  pnpm run biome:format
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
  pnpm run test
  ```

- Run tests in watch mode during development:

  ```bash
  pnpm run test:watch
  ```

### Architecture Conventions

- **Module System**: We use CommonJS (CJS) for backward compatibility, though modern TS syntax is encouraged.

- **Type Safety**: Strict typing is mandatory. The use of `any` or `never` is prohibited; prefer `unknown` with type narrowing.

- **Error Handling**: "Fail fast" philosophy. Throw clear exceptions for unexpected states. Do not leave empty `catch` blocks.

- **Localization**: Any user-facing string (especially in the CLI) must use the `t()` internationalization utility.
