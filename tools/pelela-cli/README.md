# Pelela CLI

Command-line tool to bootstrap new PelelaJS projects quickly and easily.

## Installation

### Global installation (recommended)

```bash
pnpm add -g @pelelajs/cli
```

After installation, the `pelela` command will be available globally.

### Development mode (within this workspace)

```bash
pnpm -C tools/pelela-cli build
pnpm -C tools/pelela-cli dev
```

## Usage

### Initialize a new project

Create a new project with the default name "Example":

```bash
pelela init
```

Create a new project with a custom name:

```bash
pelela init MyProject
```

This command will:
1. Create a new directory with your project name
2. Copy a minimal PelelaJS template (based on `basic-converter`)
3. Update the project's `package.json` with your project name
4. Display next steps for development

### Available Commands

```bash
# Initialize a new project
pelela init [projectName]

# Show version
pelela --version

# Show help
pelela --help
```

## Quick Start After Initialization

After running `pelela init MyProject`:

```bash
cd MyProject
pnpm install
pnpm dev
```

Then open `http://localhost:5173` in your browser.

## Development

### Build the CLI

```bash
pnpm -C tools/pelela-cli build
```

### Watch mode

```bash
pnpm -C tools/pelela-cli dev
```

### Run tests

```bash
pnpm -C tools/pelela-cli test:run
```

### Lint and format

```bash
pnpm -C tools/pelela-cli biome:check:fix
```

## Features

- **Project scaffolding** - Quickly create new PelelaJS projects from a template
- **Automatic configuration** - Project name is automatically set in `package.json`
- **Version management** - Checks for available updates from NPM registry
- **Clear feedback** - Helpful messages guide you through the process

## Architecture

The CLI is organized into logical modules:

- **`commands/init.ts`** - Project initialization logic
- **`utils/version.ts`** - Version checking against NPM registry
- **`utils/shell.ts`** - Shell utilities (file operations, directory management)
- **`utils/templates.ts`** - Template copying and project setup

Each module has a single responsibility and is independently testable.
