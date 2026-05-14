<p align="center">
  <img src="icons/pelela.png" alt="PelelaJS Logo" width="300">
</p>

# PelelaJS

A didactic framework for building simple web UI applications

## Getting Started (for Students)

### Install PelelaJS globally

```bash
pnpm add -g pelelajs
```

This installs both the library and the `pelela` CLI tool.

### Requirements

- **Node.js >= 22.0.0**
- **pnpm** (recommended package manager)

## Development (for Contributors)

If you are looking to contribute to the framework, understand its architecture, or see how to publish new releases, please refer to our **[Developer Documentation](./docs/README.md)**.


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
