# Publishing Process for PelelaJS

This document describes how to publish a new version of PelelaJS to the NPM registry.

## Prerequisites

- Node.js >= 22.0.0
- NPM/pnpm permissions for the `pelelajs` package.
- A clean workspace and all tests passing.

---

## Automated Publishing (Recommended)

This method uses GitHub Actions and is the preferred way to publish. It is already configured to work with OIDC (OpenID Connect), so **no manual tokens or additional configuration are required**.

### Run the Workflow
1. Go to the **Actions** tab in the GitHub repository.
2. Select the **"Deploy to NPM"** workflow.
3. Click **"Run workflow"**.
4. Choose the version increment type: `patch`, `minor`, or `major`.
5. Click **"Run workflow"**.

The workflow will:
- Run quality checks (Lint, Typecheck, Tests).
- Increment the version in `package.json`.
- Build the unified bundle.
- Publish to NPM with **Provenance** (linking the build to the GitHub commit).
- Push the new version tag back to GitHub.

---

## Manual Publishing

Use this method only for emergency hotfixes or local testing.

### 1. Run the Validation Script
Before any publication, it is mandatory to run the release script to ensure code quality:

```bash
pnpm run release
```

### 2. Increment the Version
If the previous script completes successfully, increment the version in the root `package.json`:

```bash
# Example for a patch release
pnpm version patch
```

### 3. Publish to NPM
Enter the core package directory and publish:

```bash
cd packages/core
pnpm publish --no-git-checks
```

> **Note:** The published `pelelajs` package includes both the project library and the `pelela` CLI.

## Installation for Users

Once published, users can install it globally:

```bash
pnpm add -g pelelajs
```
