# Issue #105 — Navegar desde el TS al .pelela

## Goal

Poder presionar F12 (Go to Definition) en un archivo `.ts` de ViewModel para navegar a su uso en el `.pelela`:

1. **Sobre la clase** → `<pelela view-model="NombreClase">` en el `.pelela`
2. **Sobre un atributo/getter/método** → primer lugar donde se usa en bindings/eventos del `.pelela`

## Design decisions

1. **Additivo, no sustitutivo:** El provider se registra para TypeScript pero NO reemplaza el provider nativo de TS. VS Code muestra ambos resultados si hay match.
2. **Convención de archivo compañero:** `App.ts` → `App.pelela` (misma ruta, extensión cambiada). Si no existe, retorna `null`.
3. **Heurística de contexto vía análisis de línea:** Para determinar si el cursor está sobre la declaración de una clase vs. un miembro, se analiza la línea actual con regex (no se implementa brace-depth tracking completo — es innecesario para este feature).
4. **Scope acotado a VS Code extension:** No hay cambios en `packages/core`, `vite-plugin` ni ejemplos.

## Implementation steps

### 1. `src/utils/fileUtils.ts` — añadir `findPelelaFile`

```typescript
export function findPelelaFile(tsPath: string): string | null
```

Inversa de `findViewModelFile`: reemplaza extensión `.ts` por `.pelela`, verifica existencia.

### 2. `src/parsers/pelelaFinder.ts` — CREATE

Tres funciones exportadas:

| Función | Busca en `.pelela` |
|---------|-------------------|
| `findViewModelTag(pelelaFilePath, className)` | `<pelela view-model="ClassName">` / `<component view-model="ClassName">` |
| `findPropertyUsage(pelelaFilePath, propName)` | 1er match en: `bind-*="...propName..."`, `if="propName"`, `for-each="... of propName"`, `const-propName` |
| `findMethodUsage(pelelaFilePath, methodName)` | 1er `click="methodName"` o `enter="methodName"` |

Consideraciones:
- `findPropertyUsage` también matchea paths anidados (`user.name` → match para `name` si es parte del path)
- `findMethodUsage` requiere match exacto (no substrings)
- Todas retornan `vscode.Location | null`

### 3. `src/providers/tsDefinitionProvider.ts` — CREATE

```typescript
export function createTypeScriptDefinitionProvider(): vscode.Disposable
```

Registra `DefinitionProvider` para `{ language: 'typescript', scheme: 'file' }`.

Lógica de `provideDefinition`:

```
1. Obtener word en cursor (document.getWordRangeAtPosition)
2. Si la línea coincide con class declaration:
   → findPelelaFile → findViewModelTag
3. Si la línea coincide con member declaration (prop/getter/method):
   → findPelelaFile → findPropertyUsage || findMethodUsage
4. Sino → null
```

**Heurísticas de detección de línea:**

- **Class declaration:** `/^\s*(export\s+)?(default\s+)?class\s+(Word)\b/`
- **Property / getter:** `/^\s*(public\s+|private\s+|protected\s+)?(get\s+)?(Word)\s*[=:(]/`
- **Method:** `/^\s*(public\s+|private\s+|protected\s+)?(Word)\s*\(/`

### 4. `src/extension.ts` — MODIFY

Agregar import y registro:

```typescript
import { createTypeScriptDefinitionProvider } from './providers/tsDefinitionProvider'

// en activate():
context.subscriptions.push(createTypeScriptDefinitionProvider())
```

### 5. Tests

#### `test/parsers/pelelaFinder.test.ts` — CREATE

Con fixtures temporarios `.pelela`:

- `findViewModelTag` — encontrado / no encontrado / múltiples etiquetas
- `findPropertyUsage` — bind-content, bind-value, bind-class, bind-style, bind-src, bind-alt, bind-enabled, if, for-each collection, const-*, path anidado
- `findMethodUsage` — click, enter, sin match

#### `test/providers/tsDefinitionProvider.test.ts` — CREATE

Con fixtures temporarios `.ts` + `.pelela`:

- Sobre class declaration → navega a view-model tag
- Sobre property → navega a su bind-*
- Sobre getter → navega a su bind-*
- Sobre método → navega a su click/enter
- Sin archivo `.pelela` compañero → null
- Palabra no encontrada en `.pelela` → null

### 6. `test/utils/fileUtils.test.ts` — MODIFY

Agregar test para `findPelelaFile`.

## Files affected summary

| File | Action |
|------|--------|
| `tools/pelela-vscode/src/utils/fileUtils.ts` | MODIFY |
| `tools/pelela-vscode/src/parsers/pelelaFinder.ts` | **CREATE** |
| `tools/pelela-vscode/src/providers/tsDefinitionProvider.ts` | **CREATE** |
| `tools/pelela-vscode/src/extension.ts` | MODIFY |
| `tools/pelela-vscode/test/parsers/pelelaFinder.test.ts` | **CREATE** |
| `tools/pelela-vscode/test/providers/tsDefinitionProvider.test.ts` | **CREATE** |
| `tools/pelela-vscode/test/utils/fileUtils.test.ts` | MODIFY (add test for `findPelelaFile`) |

## Not in scope

- Navegación desde `.ts` a múltiples `.pelela` (solo el compañero por naming convention)
- Referencias (Find All References) — solo Go to Definition
- Hover provider, rename, etc.
- Soporte para `link-*` / `prop-*` como usage de propiedades
- Cambios en `packages/core`, `vite-plugin`, ejemplos

## Verification

- `pnpm run test --run` dentro de `tools/pelela-vscode/` — todos los tests pasan
- `pnpm run typecheck` — sin errores
- `pnpm run biome:check` — limpio
