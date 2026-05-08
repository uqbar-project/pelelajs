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
- Handle versioning automatically based on input.
- Build the unified bundle.
- Publish to NPM with **Provenance**.
- Push the new version tag back to GitHub.

---

## Manual Publishing

Use this method only for emergency hotfixes or local testing.

### 1. Run the Release Script
The release process is fully automated via a single script. Execute it from the root directory:

```bash
pnpm run release:core
```

The script will:
- **Validate Git Status**: Ensures your working directory is clean.
- **Run Quality Checks**: Executes `biome:check`, `typecheck`, and `test:coverage`.
- **Prompt for Version**: Asks you to select `patch`, `minor`, or `major`.
- **Sync Versions**: Automatically updates `package.json` in root, `packages/core`, and `tools/pelela-cli`.
- **Build**: Compiles all packages.
- **Publish**: Deploys `pelelajs` to the NPM registry.
- **Commit, Tag & Push**: Creates a release commit, a git tag (e.g., `v0.5.4`), and pushes everything to GitHub's `main` branch.

---

## Installation for Users

Once published, users can install it globally:

```bash
pnpm add -g pelelajs
```
