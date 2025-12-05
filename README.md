# PelelaJS

A didactic framework for building simple web UI applications

## Installation

⚠️ **This project requires pnpm** (uses the `workspace:*` protocol which npm doesn't support)

### Install pnpm

```bash
npm install -g pnpm
```

### Setup the project

```bash
nvm use
pnpm build
pnpm install --frozen-lockfile
pnpm run install:vscode
```

Then go to `pelela-vscode-x.y.z.vsix` in `tools/pelela-vscode` folder, right click & select `Install extension VSIX` to install it into VSCode.

Restart VSCode or reload window and you'll be able to test pelela examples in your VSCode.

## Linting and Formatting

This project uses [Biome](https://biomejs.dev/) for linting and formatting.

```bash
pnpm lint

pnpm format

pnpm format:check
```

## Managing Dependencies

Use pnpm commands to add, remove, or update dependencies:

```bash
pnpm add <package>          # Add a dependency
pnpm add -D <package>       # Add a dev dependency
pnpm remove <package>       # Remove a dependency
pnpm update                 # Update all dependencies
```

> **Note:** After resolving merge conflicts in `package.json`, you may need to run `pnpm install` (without `--frozen-lockfile`) to sync the lockfile.

## Testing

### Run tests

```bash
pnpm test
```

### Run tests with coverage

```bash
pnpm test:coverage
```

Coverage report will be generated in `coverage/lcov.info` (consolidated for all packages).

### Adding tests to a new package

To include a new package in the test suite and coverage report:

1. Create `packages/new-package/vitest.config.ts`:
   ```typescript
   import { defineProject } from "vitest/config";

   export default defineProject({
     test: {
       name: "new-package",
       environment: "node", // or "jsdom" if you need DOM APIs
       globals: true,
     },
   });
   ```

2. Write tests in `packages/new-package/**/*.test.ts`

The workspace will automatically detect the new package and include it when running `pnpm test:coverage`.

### Test CI workflows locally

For detailed information on testing CI workflows locally (both quick validation and full GitHub Actions simulation), see the wiki guide on [Running CI Locally](https://github.com/uqbar-project/pelelajs/wiki/Running-CI-Locally).
