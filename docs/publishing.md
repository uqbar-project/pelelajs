# Publishing Process for PelelaJS

This document describes how to publish a new version of PelelaJS to the NPM registry.

## Prerequisites

- Node.js >= 22.0.0
- Be logged into NPM with an account that has permissions for the `pelelajs` package.
- Have a clean workspace and all tests passing.

## Steps for Publishing

### 1. Run the Validation Script

Before any publication, it is mandatory to run the release script to ensure code quality:

```bash
pnpm run release
```

This script will execute:
- Biome (linting and formatting)
- Typecheck (TypeScript)
- Tests with coverage
- Unified build

### 2. Increment the Version

If the previous script completes successfully, increment the version in the root `package.json`:

```bash
# Example for a patch release
pnpm version patch
```

This will automatically update the version across the monorepo and create a git tag commit.

### 3. Publish to NPM

Enter the core package directory and publish:

```bash
cd packages/core
npm publish
```

> **Note:** The published `pelelajs` package includes both the project library and the `pelela` CLI.

## Installation for Users

Once published, users can install it globally:

```bash
pnpm add -g pelelajs
```

Or add it as a dependency to their projects:

```bash
pnpm add pelelajs
```
