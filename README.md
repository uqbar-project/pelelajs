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
```

### VSCode Extension

To develop and test the Pelela VSCode extension:

#### 1. Debugging (Recommended)

1. Open this monorepo in VSCode.
2. Press **F5** (or go to **Run and Debug** -> **Launch Pelela Extension**).
3. A new window will open with the extension active. You can test it using the `examples/hello-world` folder which is opened by default.

#### 2. Manual Installation (.vsix)

If you prefer to generate and install the extension manually:

1. Build and package the extension:
   ```bash
   pnpm -C tools/pelela-vscode package
   ```
2. In VSCode, go to the **Extensions** view, click the `...` (Views and More Actions), and select **Install from VSIX...**.
3. Select the generated `.vsix` file in `tools/pelela-vscode/`.

## Getting Started with CLI

The `pelela` CLI helps you bootstrap new PelelaJS projects quickly.

### Initialize a new project

```bash
# Create a new project with default name "Example"
pelela init

# Or specify a custom project name
pelela init MyAwesomeApp
```

This command creates a new directory with a minimal PelelaJS project structure based on the `basic-converter` template.

For detailed CLI documentation, see [tools/pelela-cli](./tools/pelela-cli/README.md).

## Linting and Formatting

This project uses [Biome](https://biomejs.dev/) for linting, formatting, and import organization.

```bash
# All-in-one
pnpm biome:check        # Check linting + format + imports
pnpm biome:check:fix    # Auto-fix everything (lint + format + organize imports)

# Individual commands
pnpm biome:lint         # Run linter only
pnpm biome:lint:fix     # Auto-fix linting issues
pnpm biome:format       # Check code formatting
pnpm biome:format:fix   # Auto-fix formatting
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
