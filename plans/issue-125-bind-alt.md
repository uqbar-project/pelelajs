# Plan: Issue #125 — Agregar `bind-alt` para tags `<img>`

## Resumen

Implementar una nueva directiva `bind-alt` que funcione como `bind-src` pero seteando el atributo `alt` en elementos `<img>`, con validación a nivel compilación (vite plugin), syntax highlighting, y autocompletado en VS Code.

---

## 1. Core: Nueva binding `bind-alt` ✅

### 1a. Tipo `AltBinding` en `types.ts` ✅

```typescript
export type AltBinding = {
  element: HTMLImageElement
  propertyName: string
}
```

### 1b. `altBindings` en `BindingsCollection` ✅

### 1c. Nuevo archivo `bindAlt.ts` ✅

Sigue el patrón de `bindSrc.ts`:
- `setupAltBindings()` / `renderAltBindings()`
- Valida solo en `<img>`, propiedad existente, null/undefined safe

### 1d. Registrado en `setupBindings.ts` ✅

Setup, dependency tracker, y render pipeline.

### 1e. Registrado en `bindForEach.ts` ✅

En `setupBindingsForElement` (setup + render).

---

## 2. Validación y constantes ✅

### `bindingAttributeUtils.ts` — agregar `'bind-alt'` a `BIND_PREFIX_ATTRIBUTES`

### `PropertyValidationError.ts` — agregar `'bind-alt'` a `BindingKind`

---

## 3. i18n / Locales ✅

### `translationSchema.ts`, `en.ts`, `es.ts`
- `altOnlyForImg`: error runtime cuando se usa en elemento que no es `<img>`
- `onlyForImg` (en `compiler`): error compile-time en el plugin

---

## 4. Vite Plugin: Highlighting en compilación ✅

### `validateBindingElementRestrictions` en `src/index.ts`

Valida que `bind-src` y `bind-alt` solo se usen en `<img>`. Error visible en terminal durante `vite dev`.

---

## 5. VS Code Extension: Syntax Highlighting + Autocomplete

### 5a. `html-custom-data.json` (Autocomplete/IntelliSense)

Agregar `bind-src` y `bind-alt` a `globalAttributes`:

```json
{
  "name": "bind-src",
  "description": "Pelela: Binds the src attribute to a ViewModel property (for img elements)",
  "valueSet": "v"
},
{
  "name": "bind-alt",
  "description": "Pelela: Binds the alt attribute to a ViewModel property (for img elements, a11y/WCAG)",
  "valueSet": "v"
}
```

### 5b. `pelela.tmLanguage.json` (Syntax Highlighting)

Cambiar `bind-src|bind-[a-zA-Z0-9_-]+` por `bind-alt|bind-src|bind-[a-zA-Z0-9_-]+` en línea 295, para consistencia con `bind-src`.

### 5c. `snippets/pelela.json`

Agregar snippets para `bind-src` y `bind-alt`:

```json
"bind-src": {
  "prefix": "bindsrc",
  "body": ["bind-src=\"$1\""],
  "description": "Atributo bind-src para binding de src en img"
},
"bind-alt": {
  "prefix": "bindalt",
  "body": ["bind-alt=\"$1\""],
  "description": "Atributo bind-alt para binding de alt en img (a11y)"
}
```

---

## 6. Tests ✅

### 6a. `bindAlt.test.ts` — 7 tests

Setup: collect img, throw on non-img, throw on missing property, ignore empty.
Render: update alt, null/undefined remove alt, no-op if unchanged.

### 6b. Plugin validation tests — 3 tests

`bind-alt` en `<img>` ok, `bind-alt` en `<div>` error, `bind-src` en `<div>` error.

---

## 7. Ejemplo (actualizar existente, no crear nuevo)

No crear `examples/bind-alt/`. En su lugar, modificar el ejemplo 10 de `examples/for-each/`:

### `examples/for-each/src/app.ts`

Agregar `alt: string` a la interfaz `Character`:

```typescript
interface Character {
  name: string
  image: string
  alt: string
}
```

Agregar `alt` a cada objeto del array `characters`.

### `examples/for-each/src/app.pelela`

Cambiar `<img bind-src="character.image" alt="character image" ...>` por `<img bind-src="character.image" bind-alt="character.alt" ...>`.

---

## 8. Orden de implementación (lo que falta)

1. `html-custom-data.json` — agregar `bind-src` y `bind-alt`
2. `pelela.tmLanguage.json` — agregar `bind-alt` explícito en regex
3. `snippets/pelela.json` — agregar snippets `bind-src` y `bind-alt`
4. `examples/for-each/src/app.ts` — agregar `alt` a Character + datos
5. `examples/for-each/src/app.pelela` — cambiar `alt="..."` por `bind-alt="character.alt"`
6. Eliminar `examples/bind-alt/`
7. Verificar: `pnpm run biome:check && pnpm run test --run`

---

## 9. Archivos a modificar (resumen)

| Archivo | Cambio | Estado |
|---|---|---|
| `packages/core/src/bindings/types.ts` | Agregar `AltBinding`, `altBindings` en `BindingsCollection` | ✅ |
| `packages/core/src/bindings/bindAlt.ts` | **Nuevo** | ✅ |
| `packages/core/src/bindings/bindAlt.test.ts` | **Nuevo** | ✅ |
| `packages/core/src/bindings/setupBindings.ts` | Importar y registrar | ✅ |
| `packages/core/src/bindings/bindForEach.ts` | Agregar altBindings | ✅ |
| `packages/core/src/validation/bindingAttributeUtils.ts` | Agregar `'bind-alt'` | ✅ |
| `packages/core/src/errors/PropertyValidationError.ts` | Agregar `'bind-alt'` a `BindingKind` | ✅ |
| `packages/core/src/commons/locales/translationSchema.ts` | Agregar `altOnlyForImg`, `onlyForImg` | ✅ |
| `packages/core/src/commons/locales/en.ts` | Traducciones EN | ✅ |
| `packages/core/src/commons/locales/es.ts` | Traducciones ES | ✅ |
| `packages/vite-plugin-pelelajs/src/index.ts` | `validateBindingElementRestrictions` | ✅ |
| `packages/vite-plugin-pelelajs/src/index.test.ts` | Tests plugin | ✅ |
| `tools/pelela-vscode/html-custom-data.json` | Agregar `bind-src`, `bind-alt` | |
| `tools/pelela-vscode/syntaxes/pelela.tmLanguage.json` | Agregar `bind-alt` explícito | |
| `tools/pelela-vscode/snippets/pelela.json` | Agregar snippets | |
| `examples/for-each/src/app.ts` | Agregar `alt` a Character | |
| `examples/for-each/src/app.pelela` | Usar `bind-alt` en img | |
| `examples/bind-alt/` | **Eliminar** | |
