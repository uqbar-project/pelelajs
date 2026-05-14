# PelelaJS Developer Documentation

This documentation is intended for **developers and contributors** working on the PelelaJS framework. It focuses on the architectural design, core mechanisms, and internal tools that power the framework.

If you are looking to understand *how* PelelaJS works under the hood rather than how to use it, you are in the right place.

## Table of Contents

### 1. Core Framework

- [Architecture & Lifecycle](./core/ARCHITECTURE.md): The MVVM approach, the `.pelela` ecosystem, and the bootstrapping process.

- [Binding & Reactivity](./core/BINDING_AND_REACTIVITY.md): How one-way, two-way bindings, event handling, nested properties, and code interpolation (`if`/`for-each`) mechanisms work.

- [Components & Routing](./core/COMPONENTS_AND_ROUTING.md): Component definition, parent-child communication, and the auto-register routing mechanism.

### 2. Tools Ecosystem

- [CLI Architecture](./tools/CLI.md): How the PelelaJS CLI is structured for generating new projects and components.

- [VSCode Extension](./tools/VSCODE.md): High-level overview of the extension's features (highlighting, autocomplete) and architecture.

### 3. Contribution Guide

- [Development Setup](./DEVELOPMENT.md): How to set up the repository locally, including TypeScript, Biome, and pnpm.

- [Publishing to NPM](./publishing/npm.md): Steps to release a new version of the core framework or CLI.

- [Publishing to VSCode Marketplace](./publishing/vscode.md): Steps to release the VSCode extension.
