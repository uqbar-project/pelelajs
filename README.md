# PelelaJS

A didactic framework for building simple web UI applications

### Installation

⚠️ **This project requires pnpm** (uses the `workspace:*` protocol which npm doesn't support)

#### Install pnpm

```bash
npm install -g pnpm
```

#### Setup the project

```bash
nvm use
pnpm install --frozen-lockfile
pnpm run install:vscode
```

Restart VSCode or reload window and you'll be able to test pelela examples in your VSCode.

### Managing Dependencies

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
pnpm test -- --coverage
```

Coverage report will be generated in `packages/core/coverage/`.

### Test CI workflows locally

For detailed information on testing CI workflows locally (both quick validation and full GitHub Actions simulation), see the wiki guide on [Running CI Locally](https://github.com/uqbar-project/pelelajs/wiki/Running-CI-Locally).
