# pelela-vscode extension

VS Code extension for the Pelela language.

## Project Structure

```
pelela-vscode/
├── src/
│   ├── extension.js           # Main entry point
│   ├── parsers/
│   │   ├── documentParser.js  # .pelela document parsing
│   │   ├── viewModelParser.js # ViewModel member extraction
│   │   └── definitionFinder.js # Definition search
│   ├── providers/
│   │   ├── completionProvider.js # Autocomplete
│   │   └── definitionProvider.js # Go to definition
│   └── utils/
│       ├── fileUtils.js       # File utilities
│       └── htmlUtils.js       # HTML elements and attributes
├── test/
│   ├── parsers/              # Parser tests
│   ├── utils/                # Utility tests
│   ├── fixtures/             # Temporary test files
│   ├── vscode-stub.cjs       # VSCode API mock
│   └── setup.cjs             # Mocha configuration
├── syntaxes/
├── snippets/
└── package.json
```

## Technical Features

- ✅ **CommonJS**: Code with `require`/`module.exports` (required by VSCode)
- ✅ **pnpm**: Dependency management

## Development

### Install dependencies

```bash
pnpm install --ignore-workspace
```

### Run tests

```bash
pnpm test
```
