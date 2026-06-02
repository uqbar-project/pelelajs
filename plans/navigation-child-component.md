# Plan: Navegación a Componentes Hijos desde Templates `.pelela`

Este plan describe los cambios necesarios para permitir la navegación ("Go to Definition") desde etiquetas de componentes hijos (custom components) en archivos de template `.pelela` hacia su correspondiente archivo `.pelela` que los define.

---

## Contexto

Para el plugin `pelela-vscode`, los estudiantes y desarrolladores deben poder navegar a un componente hijo haciendo click o presionando F12 ("Go to Definition") en la etiqueta del componente dentro del template HTML (por ejemplo, en `<person-row>` o `<counter>`).

Actualmente, `definitionProvider.ts` resuelve definiciones de:
1. `view-model="..."` (Clase TS asociada)
2. `bind-*="..."` (Propiedades/Getters en la clase TS)
3. `click="..."` (Métodos en la clase TS)

Pero no soporta la navegación al archivo del componente hijo en sí mismo (ej. de `<person-row>` a `person-row.pelela`).

---

## Decisiones de diseño

- **Detección de etiqueta**: Identificaremos si la posición del cursor se encuentra sobre el nombre de una etiqueta (abertura o cierre) usando una expresión regular ágil que valide `<\/?([a-zA-Z0-9-]+)`.
- **Filtro de etiquetas estándar HTML**: Para evitar búsquedas y accesos a disco innecesarios, reutilizaremos las funciones `isStandardHtmlTag` e `isPelelaRootTag` provistas por el paquete `@pelelajs/core` (`pelelajs`). Para no introducir overhead de bundle (evitando importar el runtime completo de la UI que además usa APIs de browser/DOM incompatibles con VS Code), usaremos un alias de ruta TypeScript (`pelelajs/dom`) apuntando directamente a `packages/core/src/commons/dom.ts`.
- **Resolución del archivo del componente**:
  1. Primero buscaremos el archivo de manera síncrona en el mismo directorio del documento actual (`tagName.pelela`).
  2. Si no se encuentra, realizaremos una búsqueda asíncrona en todo el workspace usando `vscode.workspace.findFiles('**/tagName.pelela')`.
- **Compatibilidad con Tests**: Actualizaremos el stub `test/vscode-stub.ts` para mockear `vscode.workspace.findFiles` de manera que retorne una promesa vacía por defecto, permitiendo que la suite de tests corra sin romperse.

---

## Plan iterativo

> [!CAUTION]
> **REGLA ESTRICTA**: Al finalizar cada checkpoint, DEBO DETENERME y reportar el progreso al usuario. NO debo realizar modificaciones sin la aprobación explícita.

### Checkpoint 1 — Configuración del alias `pelelajs/dom` y Stub de `findFiles`

#### [MODIFY] [tsconfig.base.json](file:///Users/fernando/workspace/algo3/pelelajs/tsconfig.base.json)

Añadir el alias `"pelelajs/dom": ["./packages/core/src/commons/dom.ts"]` en los `paths` de TypeScript para que la extensión de VS Code pueda importar sólo ese archivo sin dependencias externas.

#### [MODIFY] [vscode-stub.ts](file:///Users/fernando/workspace/algo3/pelelajs/tools/pelela-vscode/test/vscode-stub.ts)

Añadir `findFiles` al mock del objeto `workspace` para que no lance errores de tipo "undefined" al correr la suite de tests.

```typescript
  workspace: {
    onDidOpenTextDocument: () => ({ dispose: () => {} }),
    findFiles: (glob: string) => Promise.resolve([]),
  },
```

### Checkpoint 2 — Implementación de la detección de tags y búsqueda de archivos

#### [MODIFY] [definitionProvider.ts](file:///Users/fernando/workspace/algo3/pelelajs/tools/pelela-vscode/src/providers/definitionProvider.ts)

1. Importar `node:path` y `node:fs`.
2. Importar `isStandardHtmlTag` e `isPelelaRootTag` desde `'pelelajs/dom'`.
3. Implementar `checkComponentTagDefinition(document, position, lineText)`.
4. Integrar `checkComponentTagDefinition` en `provideDefinition` como último fallback tras las validaciones actuales.

### Checkpoint 3 — Tests Unitarios para el Definition Provider

#### [NEW] [definitionProvider.test.ts](file:///Users/fernando/workspace/algo3/pelelajs/tools/pelela-vscode/test/providers/definitionProvider.test.ts)

Crear tests unitarios usando Mocha que validen:
1. No se resuelve navegación para tags HTML estándar (ej: `div`, `p`, `pelela`).
2. Se resuelve correctamente la navegación para un componente local en la misma carpeta (mockeando fs.existsSync o usando archivos reales en fixtures).
3. Se resuelve correctamente la navegación para un componente mediante `findFiles` del workspace (mockeando `vscode.workspace.findFiles`).
4. Funciona tanto al posicionar el cursor sobre el tag de apertura `<counter>` como el de cierre `</counter>`.

---

## Archivos impactados

### `tools/pelela-vscode/`
- **[MODIFY]** `test/vscode-stub.ts`
- **[MODIFY]** `src/providers/definitionProvider.ts`
- **[NEW]** `test/providers/definitionProvider.test.ts`

---

## Plan de Verificación

### Pruebas Automatizadas
- Solicitar al usuario correr la suite de tests de la extensión VS Code:
  ```bash
  pnpm --filter pelela-vscode test
  ```

### Pruebas Manuales
- Una vez verificado por tests, la extensión empaquetada o cargada en desarrollo podrá ser usada en el proyecto de ejemplo para navegar presionando `cmd+click` o `F12` en `<person-row>` o `<counter>` dentro de `home.pelela`.
