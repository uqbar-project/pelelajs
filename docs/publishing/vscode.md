# Publishing Process for pelela-vscode Extension

This document describes how to publish a new version of the `pelela-vscode` extension to [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=uqbar.pelela-vscode) and [OpenVSX](https://open-vsx.org/).

## Prerequisites

- Node.js >= 22.0.0
- pnpm (workspace package manager)
- Publisher `uqbar` registered in both [VSCode Marketplace](https://marketplace.visualstudio.com/manage/publishers/uqbar) and [OpenVSX](https://open-vsx.org/).
- Secrets configured in GitHub repository settings:
  - `VSCE_PAT` — Azure DevOps Personal Access Token with `Marketplace (Manage)` scope.
  - `OVSX_PAT` — OpenVSX access token.

---

## Automated Publishing (Recommended)

This method uses GitHub Actions and is the preferred way to publish.

### Run the Workflow

1. Go to the **Actions** tab in the GitHub repository.
2. Select the **"Deploy VSCode Extension"** workflow.
3. Click **"Run workflow"**.
4. Choose the version increment type: `patch`, `minor`, or `major`.
5. Click **"Run workflow"**.

The workflow will:
- Install all dependencies.
- Run extension tests.
- Handle versioning automatically based on input.
- Build and package the extension (.vsix).
- Publish to **VSCode Marketplace** (via `vsce`).
- Publish to **OpenVSX** (via `ovsx`).
- Push the new version tag (`vscode-v*`) back to GitHub.

> **Note:** The VSCode extension version is **independent** from the NPM package version. Each has its own `package.json` and versioning lifecycle.

---

## Manual Publishing

Use this method only for emergency hotfixes or local testing.

### 1. Run the Release Script

Execute from the root directory:

```bash
pnpm run release:vscode
```

The script will:

- **Validate Git Status**: Ensures your working directory is clean and you're on `main`.
- **Run Extension Tests**: Executes the Mocha test suite.
- **Prompt for Version**: Asks you to select `patch`, `minor`, or `major`.
- **Build & Package**: Compiles the extension and generates a `.vsix` file.
- **Publish**: Deploys to both VSCode Marketplace and OpenVSX.
- **Commit, Tag & Push**: Creates a release commit, a git tag (e.g., `vscode-v0.1.0`), and pushes to `main`.

### 2. Environment Variables

For manual publishing, you must set the following environment variables:

```bash
export VSCE_PAT="your-azure-devops-pat"
export OVSX_PAT="your-openvsx-pat"
```

---

## Installing the Extension

### From VSCode Marketplace (Recommended)

1. Open VSCode.
2. Go to the **Extensions** view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for **"Pelela Templates"**.
4. Click **Install**.

### From OpenVSX (for non-Microsoft editors)

The extension is also available on [OpenVSX](https://open-vsx.org/) for editors like VSCodium.

### From VSIX (Development)

For local development or testing, see the [root README](../../README.md#vscode-extension).

---

## Configuring Secrets

### VSCE_PAT (VSCode Marketplace)

1. Go to [Azure DevOps](https://dev.azure.com/) → User Settings → Personal access tokens.
2. Create a new token with:
   - **Organization**: `All accessible organizations`
   - **Scopes**: `Marketplace > Manage`
3. Copy the token and add it as a GitHub secret named `VSCE_PAT`.

### OVSX_PAT (OpenVSX)

1. Go to [OpenVSX](https://open-vsx.org/) and sign in.
2. Go to **Settings** → **Access Tokens** → **Create new token**.
3. Copy the token and add it as a GitHub secret named `OVSX_PAT`.
