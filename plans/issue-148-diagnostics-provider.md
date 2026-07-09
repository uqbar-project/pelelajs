# Plan: Validador de `.pelela` con diagnóstico en Problems

Issue: https://github.com/uqbar-project/pelelajs/issues/148

## Objetivo

Agregar un **Diagnostic Provider** que publique errores en el panel **Problems** de VSCode mientras se editan archivos `.pelela`.

## Validaciones

1. **ViewModel inexistente** — `view-model="Foo"` pero `Foo` no es una clase exportada en el `.ts` compañero.
2. **Propiedad de binding inexistente** — `bind-content="nombre"` pero `nombre` no es propiedad/getter del ViewModel (incluye `bind-*`, `if`, `prop-*`, `link-*`, y rutas anidadas como `persona.direccion.calle`). `const-*` se saltea (son constantes).
3. **Método de evento inexistente** — `click="handleClick"` pero `handleClick` no es método del ViewModel (incluye `enter`).
4. **Atributo HTML desconocido** — `foo="bar"` donde `foo` no es atributo HTML estándar, no es atributo Pelela, y no empieza con `data-`/`aria-`.

## Sistema i18n

Sigue el mismo patrón que `packages/core/src/commons/locales/`:

```
src/i18n/
  translationSchema.ts   # type contract (objeto anidado con strings)
  en.ts                  # English messages con {{param}} syntax
  es.ts                  # Spanish messages con {{param}} syntax
  index.ts               # t(key, params?) resuelve dot path contra el locale (es por defecto)
```

## Arquitectura final

```
src/
  i18n/
    translationSchema.ts
    en.ts
    es.ts
    index.ts

  diagnostics/
    types.ts                  # AttrInfo (name, value, nameRange, valueRange) + TagInfo
    scanDocument.ts           # Un solo scan del documento, devuelve TagInfo[]
    createDiagnostic.ts       # makeDiagnostic() compartido, elimina repetition de source='pelela'
    diagnosticsProvider.ts    # Orquestador: colección, eventos, debounce 300ms
    viewModelValidator.ts     # 3 funciones exportadas + 3 helpers internos
    attributeValidator.ts     # 2 funciones exportadas

test/
  diagnostics/
    viewModelValidator.test.ts
    attributeValidator.test.ts
```

## Enfoque

- Los validadores reciben `TagInfo[]` ya parseados (no hacen su propio scan del documento).
- `scanDocument()` se llama una vez desde el orquestador, los validadores son puros (solo filtran y mapean).
- El scan extrae atributos SOLO del substring de attributes de cada tag (no de toda la línea).
- TypeScript compiler API (`viewModelParser.ts`) para obtener properties/methods del ViewModel.
- `definitionFinder.ts` para verificar existencia de clases.
- `htmlUtils.ts` para listas de atributos/elementos conocidos.

## Firmas finales de las funciones

### `scanDocument.ts`

```ts
export function scanDocument(document: TextDocument): TagInfo[]
```

### `attributeValidator.ts`

```ts
export function validateUnknownAttributes(tags: TagInfo[]): Diagnostic[]
export function validateTagRestrictions(tags: TagInfo[]): Diagnostic[]
```

### `viewModelValidator.ts`

```ts
export function validateViewModelExistence(tags: TagInfo[], tsPath: string): Diagnostic[]
export function validateBindingProperties(tags: TagInfo[], tsPath: string, members: ViewModelMembers, document: TextDocument): Diagnostic[]
export function validateEventMethods(tags: TagInfo[], members: ViewModelMembers): Diagnostic[]
```

### `diagnosticsProvider.ts`

```ts
export function createDiagnosticsProvider(): Disposable
```

## Integración

En `src/extension.ts`:

```ts
import { createDiagnosticsProvider } from './diagnostics/diagnosticsProvider'
context.subscriptions.push(createDiagnosticsProvider())
```

## Archivos creados

| Archivo | Propósito |
|---|---|
| `src/i18n/translationSchema.ts` | Schema type para traducciones |
| `src/i18n/en.ts` | Mensajes en inglés con `{{param}}` |
| `src/i18n/es.ts` | Mensajes en español con `{{param}}` |
| `src/i18n/index.ts` | Función `t(key, params?)` con lookup por dot path |
| `src/diagnostics/types.ts` | Interfaces `AttrInfo` y `TagInfo` |
| `src/diagnostics/scanDocument.ts` | Escaneo del documento, devuelve `TagInfo[]` |
| `src/diagnostics/createDiagnostic.ts` | Factory `makeDiagnostic()` con `source='pelela'` |
| `src/diagnostics/diagnosticsProvider.ts` | Orquestador con `DiagnosticCollection` + debounce 300ms |
| `src/diagnostics/attributeValidator.ts` | `validateUnknownAttributes` + `validateTagRestrictions` |
| `src/diagnostics/viewModelValidator.ts` | `validateViewModelExistence` + `validateBindingProperties` + `validateEventMethods` |
| `test/diagnostics/attributeValidator.test.ts` | 19 tests |
| `test/diagnostics/viewModelValidator.test.ts` | 12 tests |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/extension.ts` | Import y registro de `createDiagnosticsProvider()` |
| `test/vscode-stub.ts` | Stubs de `Diagnostic`, `DiagnosticSeverity`, `DiagnosticCollection`, eventos `onDidChangeTextDocument`/`onDidCloseTextDocument` |
| `test/utils/htmlUtils.test.ts` | Fix tests de cantidad de atributos Pelela (13 → 16) |

## Resultados

191 tests pasando, 0 failing. `pnpm biome:check` limpio. 