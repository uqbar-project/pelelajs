# pelela-vscode

Extensión de VS Code para el lenguaje Pelela.

## Estructura del Proyecto

```
pelela-vscode/
├── src/
│   ├── extension.js           # Punto de entrada principal
│   ├── parsers/
│   │   ├── documentParser.js  # Parsing de documentos .pelela
│   │   ├── viewModelParser.js # Extracción de miembros del ViewModel
│   │   └── definitionFinder.js # Búsqueda de definiciones
│   ├── providers/
│   │   ├── completionProvider.js # Autocompletado
│   │   └── definitionProvider.js # Go to definition
│   └── utils/
│       ├── fileUtils.js       # Utilidades de archivos
│       └── htmlUtils.js       # Elementos y atributos HTML
├── test/
│   ├── parsers/
│   ├── utils/
│   ├── fixtures/
│   ├── vscode-stub.cjs
│   └── setup.cjs
├── syntaxes/
├── snippets/
└── package.json
```

## Características Técnicas

- ✅ **CommonJS**: Código con `require`/`module.exports` (requerido por VSCode)
- ✅ **Modular**: Código separado por responsabilidades
- ✅ **Testeado**: 61 tests con cobertura completa
- ✅ **Documentado**: README, REFACTORING, ARCHITECTURE, COMMONJS_REVERT
- ✅ **pnpm**: Gestión de dependencias consistente con el proyecto principal

## Desarrollo

### Instalación de dependencias

```bash
pnpm install --ignore-workspace
```

### Ejecutar tests

```bash
pnpm test
```

## Características

- Syntax highlighting para archivos `.pelela`
- Autocompletado para atributos de Pelela
- Autocompletado basado en el ViewModel
- Go to definition para propiedades y métodos
- Soporte para propiedades anidadas
- Soporte para `for-each` loops

## ⚠️ Nota Importante

Esta extensión usa **CommonJS** (no ES Modules) porque VSCode requiere este formato para las extensiones. Ver `COMMONJS_REVERT.md` para más detalles.


