# Plan: Issue #139 — Autocomplete improvements

Issue: https://github.com/uqbar-project/pelelajs/issues/139

## Summary

Two problems in the VSCode extension autocomplete for `.pelela` files:

1. **For-each iteration variables** are not suggested inside the loop scope (e.g., `producto` from `for-each="producto of productos"`)
2. **Class fields with definite assignment (`!:`) are not detected** — only regular `:` or `=` properties and getters appear. `producto!: Producto` stays invisible.

**Root cause:** ViewModel parsing uses brittle line-by-line regex that cannot handle `!:` and does not understand actual code structure. Replace it with the **TypeScript Compiler API** (`ts.createSourceFile` + AST traversal).

All code must be in **English**, use **declarative style** (`map`, `filter`, `reduce`) and avoid imperative loops (`for`, `break`, `continue`).

---

## Files to modify

| File | Change |
|---|---|
| `tools/pelela-vscode/package.json` | Build script + move `typescript` to `dependencies` |
| `tools/pelela-vscode/src/parsers/viewModelParser.ts` | Complete rewrite with TS Compiler API |
| `tools/pelela-vscode/src/parsers/documentParser.ts` | Add `indexName` to `ForEachResult` |
| `tools/pelela-vscode/src/utils/parsingUtils.ts` | Remove dead functions |
| `tools/pelela-vscode/src/providers/completionProvider.ts` | Add for-each variables to basic completions |
| `tools/pelela-vscode/test/utils/parsingUtils.test.ts` | Remove tests for deleted functions |
| `tools/pelela-vscode/test/parsers/viewModelParser.test.ts` | Rewrite with AST-based approach |
| `tools/pelela-vscode/test/parsers/documentParser.test.ts` | Add tests for `indexName` |

---

## 1. `package.json` — dependency & build

Move `"typescript"` from `devDependencies` to `dependencies`. Mark it as `external` in tsup so it is not bundled (resolved from the extension's `node_modules` at runtime).

```diff
- "build": "tsup src/extension.ts --format cjs --external vscode --clean",
+ "build": "tsup src/extension.ts --format cjs --external vscode --external typescript --clean",
```

---

## 2. `viewModelParser.ts` — rewrite with TS Compiler API

### `extractViewModelMembers(filePath)`

```
content ← readFileContent(filePath)
sourceFile ← ts.createSourceFile(content, ScriptTarget.Latest, true)

function visit(node):
  ts.isClassDeclaration(node) →
    node.members
      .filter(isRelevantMember)    ← PropertyDeclaration | GetAccessor | MethodDeclaration
      .filter(notConstructor)       ← exclude constructor
      .filter(isValidMethodName)    ← exclude "if"
      .map(memberToName)
      .reduce(groupByKind)          ← { properties: string[], methods: string[] }
```

### `extractNestedProperties(filePath, propertyPaths)`

```
propDecl ← findPropertyDeclaration(sourceFile, propertyPaths[0])
typeNode ← propDecl.type ?? inferFromInitializer(propDecl)

function resolveType(typeNode, sourceFile, filePath):
  switch typeNode.kind:
    TypeReference → findDeclaration(typeNode.typeName.text, sourceFile, filePath)
      ├─ search sourceFile: InterfaceDeclaration, ClassDeclaration, TypeAliasDeclaration
      └─ if not found → parseImports(sourceFile)
          → filter(importSpecifier matches name)
          → map(resolveModulePath(filePath, moduleSpecifier))
          → map(parseFile) → findDeclaration in target file
      → extractMembers(declaration)
    ArrayType → resolveType(typeNode.elementType, sourceFile, filePath)
    TypeLiteral → typeNode.members
      .filter(isPropertySignature | isPropertyAssignment)
      .map(propertyName)

propertyPaths.length > 1 → recurse on resolved type
```

### `extractInterfaceProperties(content, interfaceName)`

Reuses `findDeclaration` → returns property names.

### Functions to remove

From the current file: `findPropertyLine`, `extractPropertiesFromObjectPath`, `collectPropertiesAtBraceLevelOne`, `findNestedPropertyRecursive`, `collectInterfaceMembers`.

---

## 3. `parsingUtils.ts` — cleanup

Remove functions only used by `viewModelParser`:

- `findMemberMatch`
- `findPropertyMatch`
- `findGetterMatch`
- `findMethodMatch`
- `isValidMethodName`

Keep (for now): `calculateBraceDepth`, `isClassDeclaration`, `isInterfaceDeclaration`, `isObjectLiteralStart`. Post-implementation, check if they are still imported elsewhere; if not, remove them too.

---

## 4. `documentParser.ts` — `indexName` in for-each

```typescript
export interface ForEachResult {
  itemName: string
  line: number
  itemPos: number
  indexName: string | null
}

const INDEX_ATTR_REGEX = /index\s*=\s*["'](\w+)["']/

export function findForEachInElement(
  document: vscode.TextDocument,
  currentLineIndex: number
): ForEachResult | null {
  const lineIndices = Array.from(
    { length: currentLineIndex + 1 },
    (_, index) => currentLineIndex - index,
  )
  const result = lineIndices
    .map((lineIndex) => {
      const lineText = document.lineAt(lineIndex).text
      const forEachMatch = FOR_EACH_REGEX.exec(lineText)
      if (!forEachMatch) return null
      const itemName = forEachMatch[1]
      const indexMatch = lineText.match(INDEX_ATTR_REGEX)
      const forEachAttributeStart = lineText.indexOf('for-each=')
      const itemPosition = lineText.indexOf(itemName, forEachAttributeStart)
      return { itemName, line: lineIndex, itemPos: itemPosition, indexName: indexMatch?.[1] ?? null }
    })
    .find((result): result is ForEachResult => result !== null)
  return result ?? null
}
```

---

## 5. `completionProvider.ts` — for-each variables

In `provideBasicViewModelCompletions`:

```typescript
function provideBasicViewModelCompletions(
  typescriptFilePath: string,
  attributeName: string,
  document: vscode.TextDocument,
  position: vscode.Position,
): vscode.CompletionItem[] {
  const { properties, methods } = extractViewModelMembers(typescriptFilePath)
  const items: vscode.CompletionItem[] = []

  const forEachInElement = findForEachInElement(document, position.line)
  if (forEachInElement) {
    items.push(createPropertyCompletion(forEachInElement.itemName))
    if (forEachInElement.indexName) {
      items.push(createPropertyCompletion(forEachInElement.indexName))
    }
  }

  if (EVENT_ATTRIBUTES.has(attributeName)) {
    items.push(...methods.map(createMethodCompletion))
  } else {
    items.push(...properties.map(createPropertyCompletion))
  }

  return items
}
```

This requires passing `document` and `position` from `provideAttributeValueCompletions`.

---

## 6. Tests

### `test/utils/parsingUtils.test.ts`

Remove the `describe('findMemberMatch', ...)` block entirely (tests 74-117).

### `test/parsers/viewModelParser.test.ts`

Rewrite tests with a fixture string (no temp files needed since `ts.createSourceFile` accepts a string):

```typescript
const FIXTURE_CONTENT = `
export class ProductRow {
  product!: Product
  currentIndex!: number
  index!: number
  name: string = "test"
  items: Item[] = []

  get delivery() { return this.product.deliveryDate() }
  get price() { return this.product.value }
  get isSelected() { return this.currentIndex + 1 === this.index }

  static create() { return new ProductRow() }
  handleClick() { console.log("click") }
  private helper() { return true }
}

interface Item {
  id: number
  title: string
  completed: boolean
}
`
```

Cover:

- `extractViewModelMembers`:
  - Properties with `!: ` are included (`product`, `currentIndex`, `index`)
  - Properties with `: ` are included (`name`, `items`)
  - Getters are included as properties (`delivery`, `price`, `isSelected`)
  - Methods are included (`handleClick`, `helper`)
  - Constructor and `if` are NOT included
  - Static methods are NOT included
- `extractNestedProperties`:
  - Object literals (`user.address` → returns `street`, `number`)
  - Array type with interface (`items` → returns `id`, `title`, `completed`)
  - Cross-file type resolution (create a secondary fixture file)
- `extractInterfaceProperties`:
  - Returns properties from an existing interface
  - Returns `[]` for a non-existent interface

### `test/parsers/documentParser.test.ts`

Add tests for `findForEachInElement` (needs a real VSCode TextDocument mock):

```typescript
it('should extract index name when present', () => {
  const document = createMockDocument([
    '<div for-each="item of items" index="currentIndex">',
    '  <span bind-content="item.name">',
  ])
  const result = findForEachInElement(document, 1)
  assert.strictEqual(result?.indexName, 'currentIndex')
})

it('should return null indexName when index attribute is absent', () => {
  const document = createMockDocument([
    '<div for-each="item of items">',
    '  <span bind-content="item.name">',
  ])
  const result = findForEachInElement(document, 1)
  assert.strictEqual(result?.indexName, null)
})
```

---

## Performance

`ts.createSourceFile` is parse-only (no type checking). For a file with ~35 members:

| Operation | Estimated time |
|---|---|
| `createSourceFile` (AST parse) | 0.1 – 0.3 ms |
| Traversal + type guards | 0.05 – 0.1 ms |
| Cross-file resolution (read + parse 1 file) | 1 – 5 ms (cold disk) |
| **Total** (no cross-file) | **< 0.5 ms** |

---

## Cross-file resolution scope

- Resolve relative imports with `.ts` extension
- Fallback to `/index.ts` if the specifier is a directory
- NOT resolving path aliases (`@/...`)
- NOT resolving re-exports (`export { X } from './Y'`)
- NOT resolving types from `node_modules`
