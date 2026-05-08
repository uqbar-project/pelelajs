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

### 1. Update Versions
Update the version in the root `package.json` and in the packages:

```bash
pnpm version [patch|minor|major]
cd packages/core && pnpm version [patch|minor|major]
cd ../../tools/pelela-cli && pnpm version [patch|minor|major]
```

### 2. Run the Validation Script
Execute the release script which will run all checks and build the project:

```bash
pnpm run release
```

### 3. Commit and Push
Commit the version changes:

```bash
git add .
git commit -m "chore: version bump"
git push --follow-tags
```

### 4. Publish to NPM
Enter the core package directory and publish:

```bash
cd packages/core
pnpm publish --no-git-checks --access public
```

> **Note:** The published `pelelajs` package includes both the project library and the `pelela` CLI.

## Installation for Users

Once published, users can install it globally:

```bash
pnpm add -g pelelajs
```
