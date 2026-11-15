# pelela-vscode extension

VS Code extension for the Pelela language.

## Project Structure

```
pelela-vscode/
├── src/
│   ├── extension.ts           # Main entry point
│   ├── commands/              # Rename, move, new component and add testing
│   ├── parsers/               # Parsing logic (.pelela and .ts)
│   ├── providers/             # VSCode LSP providers
│   └── utils/                 # Parsing and file utilities
├── test/
│   ├── commands/              # CLI command tests
│   ├── parsers/               # Parser tests
│   ├── utils/                 # Utility tests
│   ├── setup.ts               # Mocha test setup and module hooking
│   └── vscode-stub.ts         # VSCode API mock
├── syntaxes/                  # TextMate grammar
│   └── pelela.tmLanguage.json # Pelela syntax highlighting definitions
├── snippets/                  # VSCode snippets
├── html-custom-data.json      # Custom HTML data for Pelela attributes in VSCode
├── language-configuration.json# Language configuration rules (comments, auto-closing brackets)
├── package.json               # Manifest and dependencies
├── tsconfig.json              # TypeScript configuration
└── biome.json                 # Linter and formatter
```

### Key Files Explained

- **`syntaxes/pelela.tmLanguage.json`**: This is the heart of the syntax highlighting. It defines a TextMate grammar using regular expressions to tokenize `.pelela` files. It assigns scopes (like `support.class.pelela` or `keyword.control.pelela`) to different parts of the code so the editor can colorize them properly.
- **`html-custom-data.json`**: Extends VS Code's native HTML support by declaring Pelela-specific attributes. This prevents the editor from throwing "Unknown attribute" warnings when using attributes like `click`, `if`, `for-each`, or `view-model` in your elements.
- **`language-configuration.json`**: Defines core editing behaviors for `.pelela` files. For instance, it configures `<!-- -->` as the default syntax for toggling comments (via `Cmd+/` or `Ctrl+/`), and sets up automatic bracket/quote closing behaviors.
- **`test/setup.ts` & `test/vscode-stub.ts`**: The extension depends heavily on the `vscode` module, which is only available at runtime inside the editor. To run unit tests via Mocha purely in Node.js, `setup.ts` intercepts any `require("vscode")` calls and redirects them to `vscode-stub.ts`, which provides safe, mock implementations of VS Code APIs like `vscode.Position` or `vscode.Uri`.


## Technical Features

- ✅ **CLI commands**: Rename, move, create components and add testing from the editor
- ✅ **TypeScript**: Modern DX with static typing
- ✅ **tsx**: Script execution and unit testing
- ✅ **tsup**: Optimized CommonJS bundling (required by VSCode)
- ✅ **CommonJS Compatibility**: Maintains compatibility with Node's assert module and VSCode runtime

## Commands

| Command | Where | CLI invocation |
| --- | --- | --- |
| `Pelela: Rename component` | `.pelela` or `src/**/*.ts` context menu, command palette | `pelela rename <component> <newName>` |
| `Pelela: Move component` | `.pelela` or `src/**/*.ts` context menu, command palette | `pelela move <component> <destination>` |
| `Pelela: New component` | Folder context menu, command palette | `pelela new <folder/name>` |
| `Pelela: Add testing` | Command palette | `pelela add testing` |

The commands run the CLI installed in the project (`node_modules/pelelajs`) with `node`, without a shell, so they behave the same on Windows. A `.ts` file is treated as a component only when its sibling `.pelela` template exists.

Settings:

- `pelela.cli.path`: entrypoint override; empty by default.
- `pelela.cli.nodePath`: Node.js executable; defaults to `node`.

## Development

For instructions on how to build, run, and debug the extension, please refer to the [VSCode extension documentation](../../README.md#vscode-extension).


### Install dependencies

```bash
pnpm install --ignore-workspace
```

### Run tests

```bash
pnpm test
```
