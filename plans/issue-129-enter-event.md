# Issue #129 — Enter event for input

## Goal

Allow users to trigger a ViewModel method when pressing Enter inside an `<input>` element, similar to how `click` works on buttons.

## Design decisions

1. Attribute name: **`enter`** (consistent with `click`, not `on-enter`)
2. Platform: **only `<input>` elements** (not textarea, select, div, img, etc.)
3. Pattern: **non-reactive event listener** (identical to `click`) — not part of `BindingsCollection`

## Implementation steps (TDD)

### 1. BindEnter unit tests — `packages/core/src/bindings/bindEnter.test.ts` (CREATE first)

~10 tests modeled on `bindClick.test.ts`:

1. Calls handler when Enter is pressed
2. Does NOT call handler for other keys (e.g., Space)
3. Passes viewModel and event to handler
4. Ignores empty handler attribute
5. Works with multiple inputs
6. Throws `InvalidHandlerError` when property is not a function
7. Handler can mutate the viewModel
8. Null/undefined handler is safely ignored
9. Does not interfere with unrelated elements

### 2. Runtime — `packages/core/src/bindings/bindEnter.ts` (CREATE)

Modeled on `bindClick.ts`:

- `setupEnterBindings(root, viewModel)` — finds `[enter]` elements, filters to own, wires up each
- `setupSingleEnterBinding(element, viewModel)` — attaches `keydown` listener, checks `event.key === 'Enter'`, looks up handler on viewModel, validates it's a function, calls `handler.call(viewModel, viewModel, event)`

### 3. Orchestration — `setupBindings.ts` (MODIFY)

- Add import: `import { setupEnterBindings } from './bindEnter'`
- Add call after `setupClickBindings(root, viewModel)`:
  `setupEnterBindings(root, viewModel)`

### 4. Attribute validation — `bindingAttributeUtils.ts` (MODIFY)

- Add `'enter'` to `EXACT_BINDING_ATTRIBUTES`

### 5. i18n — translations (MODIFY 3 files)

- `translationSchema.ts` — add `enterOnlyForInput: string` under `errors.compiler`
- `en.ts` — `enterOnlyForInput: 'enter can only be used on <input> elements. Found on <{{tag}}>.'`
- `es.ts` — `enterOnlyForInput: 'enter solo puede usarse en elementos <input>. Se encontró en <{{tag}}>.'`

### 6. Vite plugin — compile-time validation (MODIFY `index.ts`)

Two validations:

- **a)** Add `/\benter\s*=/` to `forbiddenPatterns` in `validateNoForbiddenRootAttributes()`
- **b)** New function `validateInputOnlyEvents()`:
  ```typescript
  const INPUT_ONLY_EVENTS = ['enter'] as const
  function validateInputOnlyEvents(sourceCode, errorFn) {
    // regex: <tag [^>]*enter= — verify tag is 'input'
  }
  ```
  Called in the same pipeline next to `validateBindingElementRestrictions`

### 7. Plugin tests — `vite-plugin-pelelajs/src/index.test.ts` (MODIFY)

Add tests:

- `enter` on root tag → compile error (forbiddenRootAttribute)
- `enter` on `<input>` → no error
- `enter` on `<div>` → compile error (enterOnlyForInput)
- `enter` on `<select>`, `<button>` → compile error

### 8. VS Code extension (MODIFY 5 files)

#### a) `html-custom-data.json`
Add entry:
```json
{
  "name": "enter",
  "description": "Pelela: Ejecuta un método del view model al presionar Enter en un input",
  "valueSet": "v"
}
```

#### b) `pelela.tmLanguage.json`
Copy `click-attribute` section, rename to `enter-attribute`, update regex from `click` to `enter`, and reference it in `#pelela-attributes`.

#### c) `htmlUtils.ts`
Add `'enter'` to `getPelelaAttributes()` array.

#### d) `completionProvider.ts`
- Add `enter` snippet in `attributeSnippets`:
  ```typescript
  enter: {
    text: 'enter="${1:handler}"',
    detail: 'Pelela: ejecuta un método del view model al presionar Enter',
  },
  ```
- Add `'enter'` to `isPelelaAttribute` check in `provideAttributeValueCompletions`
- In `provideBasicViewModelCompletions`, add `attributeName === 'enter'` alongside `attributeName === 'click'` to offer **method** completions

#### e) `definitionProvider.ts`
- Add `ENTER_ATTRIBUTE_PATTERN = /enter=["']([^"']+)["']/g`
- Add `checkEnterAttributeDefinition()` (identical pattern to `checkClickAttributeDefinition`)
- Wire it in `provideDefinition()`: add `checkEnterAttributeDefinition(document, position, lineText)` to the chain

### 9. Example — `examples/basic-converter/` (MODIFY)

Add to the `.pelela` template:

```html
<label>
  Buscar (presioná Enter):
  <input placeholder="Ingresá un término" enter="search" />
</label>
```

And to the ViewModel:

```typescript
search() {
  console.log('Search triggered')
}
```

## Files affected summary

| File | Action |
|------|--------|
| `packages/core/src/bindings/bindEnter.test.ts` | **CREATE (TDD: first)** |
| `packages/core/src/bindings/bindEnter.ts` | **CREATE** |
| `packages/core/src/bindings/setupBindings.ts` | MODIFY |
| `packages/core/src/validation/bindingAttributeUtils.ts` | MODIFY |
| `packages/core/src/commons/locales/translationSchema.ts` | MODIFY |
| `packages/core/src/commons/locales/en.ts` | MODIFY |
| `packages/core/src/commons/locales/es.ts` | MODIFY |
| `packages/vite-plugin-pelelajs/src/index.ts` | MODIFY |
| `packages/vite-plugin-pelelajs/src/index.test.ts` | MODIFY |
| `tools/pelela-vscode/html-custom-data.json` | MODIFY |
| `tools/pelela-vscode/syntaxes/pelela.tmLanguage.json` | MODIFY |
| `tools/pelela-vscode/src/utils/htmlUtils.ts` | MODIFY |
| `tools/pelela-vscode/src/providers/completionProvider.ts` | MODIFY |
| `tools/pelela-vscode/src/providers/definitionProvider.ts` | MODIFY |
| `examples/basic-converter/src/Converter.ts` | MODIFY |
| `examples/basic-converter/src/Converter.pelela` | MODIFY |

## Verification

- `pnpm run test --run` — all tests pass (including new ones)
- `pnpm run typecheck` — no type errors
- `pnpm run biome:check` — clean
