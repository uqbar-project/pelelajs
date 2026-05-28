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

5. (Optional) Provide custom notes for the CHANGELOG in the `changelog_notes` input. If left empty, a summary will be automatically generated from the commits.

6. Click **"Run workflow"**.

The workflow will:

- Run quality checks (Lint, Typecheck, Tests).

- Handle versioning automatically based on input.

- Update CHANGELOG with auto-generated summary (or custom notes if provided).

- Build the unified bundle.

- Publish to NPM with **Provenance**.

- Push the new version tag back to GitHub.

---

## Manual Publishing

Use this method only for emergency hotfixes or local testing.

### Prerequisites for Manual Publishing

Before running the release script, ensure:

1. **You are logged in to npm** (or will be prompted to login):
   ```bash
   pnpm login
   ```

### 1. Run the Release Script

Execute from the root directory:

```bash
pnpm run release:npm
```

If you are not already logged in to npm, the script will:

- Detect that you're not authenticated (via `pnpm whoami`).

- **Prompt you to login**: Answer `y` to proceed with `pnpm login` interactively.

- Once authenticated, continue with the release process.

### 2. What the Script Does

The release script will:

1. **Authenticate**: Verifies you are logged in to npm (prompts to login if needed).

2. **Bumps Version**: Automatically increments the version based on release-it prompt.

3. **Updates CHANGELOG**: Generates a summary from recent commits and opens an editor for manual refinement.

4. **Syncs Versions**: Updates `package.json` in `packages/core`, `packages/vite-plugin-pelelajs`, and `tools/pelela-cli`.

5. **Build**: Compiles all packages.

6. **Publish**: Deploys `pelelajs` to the NPM registry.

7. **Git Operations**: Creates a release commit, a git tag (e.g., `npm-v0.5.4`), and pushes to `main` with tags.

---

## Installation for Users

Once published, users can install it globally:

```bash
pnpm add -g pelelajs
```
