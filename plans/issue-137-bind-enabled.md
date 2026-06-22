# Plan: Issue #137 — Agregar `bind-enabled` para controles de carga de datos

## Resumen

Implementar `bind-enabled`, un binding que mapea una propiedad booleana del ViewModel a la propiedad `disabled` de elementos de formulario. Cuando la propiedad es `true`, el control está habilitado; cuando es `false`, está deshabilitado.

**Elementos soportados:** `input`, `select`, `button`, `textarea`, `optgroup`, `option`, `fieldset`

---

## 1. Core: Nueva binding `bind-enabled`

### 1a. Tipo `EnabledBinding` en `types.ts`

```typescript
export type EnabledBinding = {
  element: HTMLElement
  propertyName: string
}
```

Usa `HTMLElement` genérico porque aplica a múltiples tipos de elementos.

### 1b. Agregar `enabledBindings` a `BindingsCollection`

```typescript
export type BindingsCollection = {
  valueBindings: ValueBinding[]
  contentBindings: ContentBinding[]
  srcBindings: SrcBinding[]
  altBindings: AltBinding[]
  enabledBindings: EnabledBinding[]
  ifBindings: IfBinding[]
  classBindings: ClassBinding[]
  styleBindings: StyleBinding[]
  forEachBindings: ForEachBinding[]
  componentBindings: ComponentBinding[]
}
```

### 1c. Nuevo archivo `bindEnabled.ts`

Sigue el patrón de `bindAlt.ts` con diferencias clave:

**`setupSingleEnabledBinding()`:**
```typescript
const VALID_TAGS = ['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA', 'OPTGROUP', 'OPTION', 'FIELDSET']

function setupSingleEnabledBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): EnabledBinding | null {
  const propertyName = element.getAttribute('bind-enabled')
  if (!propertyName?.trim()) return null

  if (!VALID_TAGS.includes(element.tagName)) {
    throw new Error(t('errors.bindings.enabledOnlyForFormControls', {
      tag: element.tagName.toLowerCase(),
    }))
  }

  assertViewModelProperty(viewModel, propertyName, 'bind-enabled', element)

  return { element, propertyName }
}
```

**`renderSingleEnabledBinding()`:**
```typescript
function renderSingleEnabledBinding<T extends object>(
  binding: EnabledBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName)

  if (value === null || value === undefined) {
    binding.element.disabled = true
    return
  }

  if (typeof value !== 'boolean') {
    throw new InvalidPropertyTypeError({
      propertyName: binding.propertyName,
      bindingKind: 'bind-enabled',
      expectedType: 'a boolean',
      viewModelName: viewModel.constructor?.name ?? 'Unknown',
      elementSnippet: extractElementSnippet(binding.element),
    })
  }

  binding.element.disabled = !value
}
```

`element.disabled` es la propiedad reflejada: `disabled = true` agrega el atributo, `disabled = false` lo remueve.

### 1d. Registrar en `setupBindings.ts`

- Import: `import { renderEnabledBindings, setupEnabledBindings } from './bindEnabled'`
- Setup: `enabledBindings: setupEnabledBindings(root, viewModel),`
- Dependency tracker:
  ```typescript
  { list: bindings.enabledBindings, getPath: (binding) => (binding as EnabledBinding).propertyName }
  ```
- Render pipeline:
  ```typescript
  { condition: () => targetBindings.enabledBindings.length > 0, render: () => renderEnabledBindings(...) }
  ```

### 1e. Registrar en `bindForEach.ts`

En `setupBindingsForElement`: setup + render, igual que las otras bindings.

---

## 2. Validación y constantes

### 2a. `bindingAttributeUtils.ts`

Agregar `'bind-enabled'` a `BIND_PREFIX_ATTRIBUTES`.

### 2b. `PropertyValidationError.ts`

Agregar `'bind-enabled'` a `BindingKind`.

### 2c. `InvalidPropertyTypeError.ts`

No requiere cambios — `ExpectedType` ya incluye `'a boolean'`.

---

## 3. i18n / Locales

### `translationSchema.ts`

```typescript
errors.bindings.enabledOnlyForFormControls: string
```

### `en.ts`

```typescript
enabledOnlyForFormControls:
  'bind-enabled can only be used on form controls (input, select, button, textarea, optgroup, option, fieldset). Found on <{{tag}}>.'
```

### `es.ts`

```typescript
enabledOnlyForFormControls:
  'bind-enabled solo puede usarse en controles de formulario (input, select, button, textarea, optgroup, option, fieldset). Se encontró en <{{tag}}>.'
```

**Nota:** El error de tipo booleano ya está cubierto por el mensaje genérico `errors.properties.invalidType` con `expectedType: 'a boolean'`.

---

## 4. VS Code Extension: Syntax Highlighting + Autocomplete

### 4a. `html-custom-data.json`

Agregar `bind-enabled` a `globalAttributes`.

### 4b. `pelela.tmLanguage.json`

No requiere cambios — el regex `bind-[a-zA-Z0-9_-]+` ya captura cualquier `bind-*`.

### 4c. `snippets/pelela.json`

Agregar snippet con prefix `bindenabled`.

---

## 5. Tests (TDD)

### 5a. `bindEnabled.test.ts`

Escribir el test **antes** de la implementación. Cada test debe fallar primero (red), luego implementar (green).

Reglas de ./AGENTS.md aplicadas:
- **Prohibido magic strings**: los valores de prueba deben ser constantes o variables con nombre significativo, no strings literales esparcidos.
- **Prohibido `includes`/`endsWith` en mocks**: las verificaciones de mocks deben ser exactas (`toHaveBeenCalledWith`), no parciales.
- **Prohibido `not.toBeNull()`**: preferir `toBeInstanceOf(HTMLInputElement)` o `toBeNull()`.
- **Prohibido `for`/`break`/`continue`**: usar `forEach`, `map`, `filter`, `reduce`.
- **afterEach para cleanup**: evitar repetir cleanup en cada test.

#### Test cases (orden TDD):

**Setup:**

1. `should collect elements with bind-enabled` — crea `<input bind-enabled="prop">`, verifica `bindings[0].propertyName === 'prop'` y `bindings[0].element` es `HTMLInputElement`. Usar constantes para valores.

2. `should throw error on unsupported elements` — `<div bind-enabled="prop">`. Verificar mensaje exacto con `toThrow()`. Crear constante `UNSUPPORTED_TAG` = `'div'`. Verificar que el error contenga la key de traducción esperada (comparando contra el mensaje interpolado usando `t()` o un valor conocido).

3. `should throw error if property does not exist in viewModel` — `<input bind-enabled="missing">` con viewModel vacío. Verificar `toThrow(PropertyValidationError)`.

4. `should ignore empty bind-enabled attributes` — `<input bind-enabled="">`. Verificar `bindings.length === 0`.

5. `should accept all valid tags` — iterar el array `VALID_TAGS` que debe estar exportado desde `bindEnabled.ts` (o definido localmente en el test), crear un elemento por cada tag y verificar que setup no lance error.

**Render:**

6. `should enable element when value is true` — setup con `enabled: true`, render, verificar `element.disabled === false`.

7. `should disable element when value is false` — setup con `enabled: false`, render, verificar `element.disabled === true`.

8. `should disable element when value is null or undefined` — setup con `enabled: null` y luego `enabled: undefined`. Verificar `element.disabled === true`.

9. `should throw InvalidPropertyTypeError when value is not boolean` — setup con `enabled: 'string'`, render debe lanzar `InvalidPropertyTypeError` con `expectedType: 'a boolean'`. Verificar con constante `EXPECTED_TYPE = 'a boolean'`.

10. `should work with nested property path` — `<input bind-enabled="form.enabled">` con viewModel `{ form: { enabled: true } }`. Verificar `disabled === false`.

11. `should not update if value has not changed` — spyOn property, render con mismo valor, verificar que no se llamó el setter (comparación exacta con `toHaveBeenCalledTimes` o `not.toHaveBeenCalled`).

---

## 6. Ejemplo

Modificar `examples/basic-converter/`:

**`Converter.ts`** — agregar propiedad `inputEnabled = true`

**`Converter.pelela`** — agregar sección al final del `<pelela>`:
```html
<hr/>

<h2>bind-enabled demo</h2>

<label>
  <input type="checkbox" bind-value="inputEnabled" />
  Enable input
</label>

<input bind-enabled="inputEnabled" value="This can be disabled" />
```

Checkbox marcado → `inputEnabled = true` → input habilitado.
Checkbox desmarcado → `inputEnabled = false` → input deshabilitado.

---

## 7. Orden de implementación (TDD)

1. **Failing test**: Escribir `bindEnabled.test.ts`
2. **Implementar `bindEnabled.ts`**
3. **Registrar en `setupBindings.ts`**
4. **Registrar en `bindForEach.ts`**
5. **Actualizar constantes + i18n** (bindingAttributeUtils, PropertyValidationError, locales)
6. **VS Code** (html-custom-data.json, snippets)
7. **Ejemplo** (basic-converter)
8. **Verificar**: `pnpm run biome:check && pnpm run typecheck && pnpm run test --run`

---

## 8. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `packages/core/src/bindings/bindEnabled.ts` | **Nuevo** |
| `packages/core/src/bindings/bindEnabled.test.ts` | **Nuevo** |
| `packages/core/src/bindings/types.ts` | +`EnabledBinding`, +`enabledBindings` en `BindingsCollection` |
| `packages/core/src/bindings/setupBindings.ts` | Import + registro setup/render/deps |
| `packages/core/src/bindings/bindForEach.ts` | +enabledBindings en `setupBindingsForElement` |
| `packages/core/src/validation/bindingAttributeUtils.ts` | +`'bind-enabled'` |
| `packages/core/src/errors/PropertyValidationError.ts` | +`'bind-enabled'` |
| `packages/core/src/commons/locales/translationSchema.ts` | +`enabledOnlyForFormControls` |
| `packages/core/src/commons/locales/en.ts` | Traducción EN |
| `packages/core/src/commons/locales/es.ts` | Traducción ES |
| `tools/pelela-vscode/html-custom-data.json` | +`bind-enabled` |
| `tools/pelela-vscode/snippets/pelela.json` | +snippet |
| `examples/basic-converter/src/Converter.ts` | +`inputEnabled` |
| `examples/basic-converter/src/Converter.pelela` | +checkbox + input con bind-enabled |
