# CLI Architecture

The PelelaJS Command Line Interface (`pelela-cli`) is a standalone tool designed to scaffold projects and components seamlessly. It is intended to be run globally via `npx` (e.g., `npx create-pelela-app`).

## Design Philosophy

The CLI is built with **localization (i18n)** and **robustness** in mind. It uses strict typing, semantic exit codes, and provides clear, localized feedback to the user depending on their environment.

## Execution Flow

When a developer invokes the CLI, the execution follows this structured path:

```mermaid
graph TD
    A[User executes CLI command] --> B[Argument Parsing (Commander.js)]
    B --> C{Action Router}
    C -->|Project Generation| D[Template Copier]
    C -->|Component Scaffold| E[Component Generator]
    D --> F[Dependency Installer]
    F --> G[Success / Error Output via i18n]
    E --> G
```

### Key Modules

1. **Parser & Commander:** We rely on standard CLI arg parsing to define strict inputs.
2. **Template Utilities:** The system dynamically copies files from an internal `templates/` directory to the target workspace. It handles token replacement (e.g., replacing `{{projectName}}` in configuration files).
3. **i18n Engine:** All user-facing strings, errors, and success messages are retrieved via the `t()` function, mapped to dictionaries (currently `es.json` and `en.json`), preventing hardcoded language strings.
4. **Version Detectors:** Validates the Node.js environment to ensure compatibility with PelelaJS requirements before executing heavy disk operations.

## Extending the CLI

When contributing to the CLI:
- **Always update the localization files.** Never add hardcoded strings to `console.log`.
- Ensure robust error handling (fail fast) if file system operations (like writing a template) encounter permission issues.
- Provide comprehensive tests mimicking filesystem behavior via virtual mocking, ensuring cross-platform stability.
