# Plan: Flag `--component` en el comando `pelela new`

## Contexto

El comando `pelela new <ComponentName>` genera tres archivos: `.ts`, `.pelela` y `.css`. El template `.pelela` generado actualmente tiene dos problemas:

1. Envuelve todo en un `<div>` innecesario que no aporta semántica.
2. Solo genera `<pelela>` como tag raíz, pero no hay forma de generar un componente hijo (`<component>`) desde el CLI.

## Cambios propuestos

### `tools/pelela-cli/src/utils/componentFiles.ts`

#### Cambio 1 — Eliminar el `<div>` wrapper y parametrizar el tag raíz

Actualmente:
```typescript
const content = `<div>
  <pelela view-model="${componentName}">
    <h1>${componentName} Component</h1>
    <!-- Add your template here -->
  </pelela>
</div>
`
```

Propuesta: `createPelelaFile` recibe un `rootTag: 'pelela' | 'component'` (default: `'pelela'`):

```typescript
export function createPelelaFile(name: string, targetDir: string, rootTag: 'pelela' | 'component' = 'pelela'): void {
  ...
  const content = `<${rootTag} view-model="${componentName}">
  <h1>${componentName} Component</h1>
  <!-- Add your template here -->
</${rootTag}>
`
```

---

### `tools/pelela-cli/src/commands/new.ts`

#### Cambio 2 — Agregar `component` a `NewCommandOptions` y propagarlo

```typescript
export interface NewCommandOptions {
  componentName: string
  css?: boolean
  component?: boolean   // ← nuevo
}
```

Y pasarlo a `createPelelaFile`:
```typescript
const rootTag = options.component ? 'component' : 'pelela'
createPelelaFile(componentName, targetDir, rootTag)
```

---

### `tools/pelela-cli/src/index.ts`

#### Cambio 3 — Registrar la opción `-c, --component` en Commander

```typescript
.option('-c, --component', t('commands.new.options.component'))
.action(async (componentName: string, options: { css: boolean; component: boolean }) => {
  await newCommand({ componentName, css: options.css, component: options.component })
})
```

---

### `tools/pelela-cli/src/locales/es.json` y `en.json`

#### Cambio 4 — Agregar la clave i18n para la nueva opción

```json
"options": {
  "noCss": "No generar el archivo CSS",
  "component": "Generar con tag raíz <component> en lugar de <pelela>"
}
```

---

### `tools/pelela-cli/test/commands/new.test.ts`

#### Cambio 5 — Actualizar tests existentes y agregar nuevos

- **Actualizar** los tests existentes que chequeaban `<div>` como parte del contenido del `.pelela` (ya no existirá).
- **Agregar** test: sin `--component`, el template usa `<pelela>`.
- **Agregar** test: con `--component`, el template usa `<component>`.
- **Agregar** test: sin `--component`, NO se agrega el componente a routes.ts.
- **Agregar** test: con `--component`, NO se agrega el componente a routes.ts.

---

## Archivos impactados

| Archivo | Acción |
|---|---|
| `src/utils/componentFiles.ts` | Modificar `createPelelaFile`: quitar `<div>`, agregar parámetro `rootTag` |
| `src/commands/new.ts` | Agregar `component?: boolean` a `NewCommandOptions`, propagar a `createPelelaFile` |
| `src/index.ts` | Registrar `-c, --component` en Commander |
| `src/locales/es.json` | Agregar clave `commands.new.options.component` |
| `src/locales/en.json` | Agregar clave `commands.new.options.component` |
| `test/commands/new.test.ts` | Actualizar tests existentes + agregar tests para la nueva opción |

## Verificación

Es manual, NO LO PODES EJECUTAR SI SOS UNA IA. Pedís autorización al usuario.
```bash
pnpm --filter pelela-cli test
pnpm run biome:check
pnpm typecheck
```
