
# PelelaJS

A didactic framework for building simple web UI applications

## Developer environment

### Installation

```bash
nvm use
pnpm install
pnpm run install:vscode
```

Restart VSCode or reload window and you'll be able to test pelela examples in your VSCode.

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
