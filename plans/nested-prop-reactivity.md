# Fix: reactividad de `prop-*` con propiedades anidadas

## Contexto

Cuando un componente padre pasa una propiedad anidada a un hijo usando la sintaxis `prop-errors="apuesta.errors"`, la reactividad no se dispara al mutar el array `errors` en el padre (por ejemplo, con `.push()` o `.length = 0`).

Hay **dos bugs independientes** que se combinan:

**Bug A — Setup no resuelve paths con punto**  
En `bindComponent.ts` L122:
```typescript
instance[childKey] = (parentViewModel as Record<string, unknown>)[parentKey]
```
`parentKey` es `"apuesta.errors"`, pero el bracket-access no resuelve paths con `.` → devuelve `undefined`. El helper `getNestedProperty` de `nestedProperties.ts` ya existe para esto y no se usa aquí.

**Bug B — `renderComponentBindings` no propaga cambios en colecciones mutadas**  
En `bindComponent.ts` L183:
```typescript
if (parentValue !== childValue) {  // ← falla para arrays mutados
  childViewModel[childKey] = parentValue
}
```
Cuando el array `errors` es mutado in-place (`.push`, `.length = 0`), la referencia es la misma → `parentValue === childValue` → no hay update → el hijo nunca se re-renderiza.

---

## Decisiones de diseño

- **Validación de path**: se valida que **cada segmento intermedio** del path exista en el padre (ej. para `"apuesta.errors"` se verifica que `apuesta` exista, y que `apuesta.errors` también exista). Se soportan **N niveles de anidamiento** (`"a.b.c.d"`, etc.).
- **`link-*` con paths anidados**: se resuelve en el mismo PR, usando `setNestedProperty` para la propagación inversa hijo → padre.

---

## Plan iterativo

> [!CAUTION]
> **REGLA ESTRICTA**: Al finalizar cada checkpoint, DEBO DETENERME y esperar la confirmación explícita ("OK") del usuario antes de avanzar al siguiente. NO debo ejecutar ni editar archivos del siguiente checkpoint hasta recibir luz verde.

### Checkpoint 1 — Ejemplo mínimo que reproduce el bug

#### [NEW] `examples/nested-prop-component/`

Estructura espejada de `examples/components/`:

| Archivo | Descripción |
|---|---|
| `index.html` | HTML raíz con `<div id="app">` |
| `main.ts` | Bootstrap con `router.start` |
| `vite.config.ts` | `pelelajsPlugin()` |
| `package.json` | `pelelajs: workspace:*` |
| `.npmrc` | `shamefully-hoist=true` |
| `routes.ts` | Ruta `/` → `Bet` |
| `src/bet.pelela` | Template del padre: input + botón Bet + `<error-list prop-errors="bet.errors">` |
| `src/bet.ts` | VM padre: `bet = new BetModel()`, método `place()` que valida |
| `src/betModel.ts` | Clase con `errors: string[]`, `amount: string`, `validate()` |
| `src/error-list.pelela` | Template del hijo: `for-each` sobre `errors` |
| `src/error-list.ts` | VM hijo: `errors: string[] = []` |

**Comportamiento esperado al correr `pnpm dev`**: al dejar el input vacío y hacer click en "Bet", el componente `error-list` debería mostrar el error; sin el fix, no lo muestra.

**Punto de control**: levantar el ejemplo y confirmar que el bug es visible en el browser. ✓ → pasar al Checkpoint 2.

---

### Checkpoint 2 — Tests en rojo (TDD)

#### [MODIFY] `packages/core/src/bindings/bindComponent.test.ts`

Agregar dos bloques de tests **que deben fallar** antes del fix:

**Test A — Setup con path anidado**
```
it('should initialize child component with a nested parent property path (prop-errors="bet.errors")')
```
- Crea un padre con `{ bet: { errors: ['error1'] } }`
- Define un hijo que recibe `prop-errors="bet.errors"`
- Verifica que el hijo tenga `errors = ['error1']` tras el setup

**Test B — Re-render del hijo al mutar array pasado como prop anidada**
```
it('should re-render child component when nested array prop is mutated via push()')
it('should re-render child component when nested array prop is cleared via length = 0')
```
- Arranca con `errors = []`
- Llama a `bet.errors.push('Debe ingresar monto')` en el padre (a través del proxy reactivo)
- Verifica que el componente hijo actualizó su contenido

**Punto de control**: `pnpm test` muestra estos tests en rojo. ✓ → pasar al Checkpoint 3.

---

### Checkpoint 3 — Fix A: soporte de paths con punto en el setup

#### [MODIFY] `packages/core/src/bindings/bindComponent.ts`

**Cambio 1 — Lectura inicial con `getNestedProperty`**

```diff
- instance[childKey] = (parentViewModel as Record<string, unknown>)[parentKey]
+ instance[childKey] = parentKey.includes('.')
+   ? getNestedProperty(parentViewModel, parentKey)
+   : (parentViewModel as Record<string, unknown>)[parentKey]
```

**Cambio 2 — Validación de propiedad padre para N niveles**

Se valida que cada segmento previo al último exista en el objeto padre. Se usa `getNestedProperty` para recorrer el path y verificar que ningún segmento intermedio sea `undefined` o `null`:

```diff
- if (!parentKey.includes('.') && !hasProperty(parentViewModel, parentKey)) {
-   throw new Error(...)
- }
+ // Valida todos los segmentos intermedios del path (soporta a.b.c.d)
+ const pathSegments = parentKey.split('.')
+ let current: unknown = parentViewModel
+ for (const segment of pathSegments) {
+   if (!isObject(current) || !hasProperty(current as object, segment)) {
+     throw new Error(t('errors.compiler.missingParentProperty', { tag, parentKey }))
+   }
+   current = (current as Record<string, unknown>)[segment]
+ }
```

**Cambio 3 — Propagación inversa en `link-` con `setNestedProperty` (N niveles)**

En el handler de `onChange` del `reactiveInstance`, la asignación de vuelta al padre:
```diff
- (parentViewModel as Record<string, unknown>)[linkBinding.parentKey] = reactiveInstance[changedPath]
+ if (linkBinding.parentKey.includes('.')) {
+   setNestedProperty(parentViewModel, linkBinding.parentKey, reactiveInstance[changedPath])
+ } else {
+   (parentViewModel as Record<string, unknown>)[linkBinding.parentKey] = reactiveInstance[changedPath]
+ }
```
```

**Punto de control**: el Test A pasa, el Test B sigue en rojo. `pnpm test` confirma. ✓ → pasar al Checkpoint 4.

---

### Checkpoint 4 — Fix B: propagación correcta de arrays/objetos mutados

#### [MODIFY] `packages/core/src/bindings/bindComponent.ts` — `renderComponentBindings`

El problema: para colecciones (arrays/objetos) pasadas como prop, la referencia es la misma antes y después de la mutación. La comparación `!==` ignora el cambio.

**Estrategia**: si el valor padre es un array u objeto y la referencia ya es la misma en el hijo, forzar igualmente la notificación al child para que re-renderice sus bindings internos.

```diff
  if (parentValue !== childValue) {
    (binding.childViewModel as Record<string, unknown>)[childKey] = parentValue
+   // Force re-render of child when value changes
+   binding.renderChild?.(childKey)
+ } else if (isObject(parentValue)) {
+   // Misma referencia pero el objeto/array pudo haber sido mutado:
+   // forzar re-render del hijo notificando con el childKey como changedPath
+   binding.renderChild?.(childKey)
  }
```

Para que esto funcione, `ComponentBinding` necesita exponer la función `renderChild` del hijo. Actualmente ese cierre es local a `setupComponentBindings`. Hay que almacenarlo en el binding:

#### [MODIFY] `packages/core/src/bindings/types.ts`

```typescript
interface ComponentBinding {
  childViewModel: ViewModel<object>
  mappings: Array<{ parentKey: string; childKey: string }>
  renderChild: (changedPath?: string) => void   // ← nuevo campo
}
```

Y guardar la referencia al crear el binding en `setupComponentBindings`:
```diff
  bindings.push({
    childViewModel: reactiveInstance,
    mappings: allMappings,
+   renderChild,
  })
```

#### [MODIFY] `packages/core/src/reactivity/reactiveProxy.ts` — `set` handler

Para detectar mutaciones de propiedades de arrays (como `.length = 0`), siempre notificar cambios cuando se asignan propiedades de arrays, incluso si el valor es el mismo:

```diff
  set(targetObject: T, propertyKey: string | symbol, value: unknown, receiver: unknown): boolean {
    const oldValue = Reflect.get(targetObject, propertyKey, receiver)

+   // Always notify for array property assignments (like .length) to catch in-place mutations
+   const isArrayProperty = Array.isArray(targetObject) && typeof propertyKey === 'string'
+   if (!isArrayProperty && oldValue === value) {
+     return true
+   }

    const result = Reflect.set(targetObject, propertyKey, value, receiver)

    if (result) {
      this.notifyChange(propertyKey)
    }

    return result
  }
```

#### [MODIFY] `packages/core/src/bindings/bindComponent.test.ts`

Agregar test para verificar que el DOM del hijo se re-renderiza cuando se muta el array anidado:

```typescript
it('should re-render child DOM when nested array prop is mutated via push()', () => {
  // ... test setup ...
  parentVM.bet.errors.push('Error 1')
  const updatedListItems = childEl.querySelectorAll('li')
  expect(updatedListItems.length).toBe(1)
  expect(updatedListItems[0].textContent).toBe('Error 1')
})
```

**Punto de control**: todos los tests nuevos pasan. `pnpm test --run` verde. ✓ → pasar al Checkpoint 5.

---

### Checkpoint 5 — Verificación integral

1. **Tests existentes**: `pnpm test` sin regresiones en `bindComponent.test.ts`, `nestedProperties.test.ts`, `selectiveRendering.test.ts`, `reactiveProxy.test.ts`.
2. **Ejemplo nuevo**: levantar `examples/nested-prop-component` y confirmar que los errores aparecen al hacer click en "Bet".
3. **Ejemplo existente**: levantar `examples/components` y confirmar que no hay regresiones.

---

## Archivos impactados

### `examples/nested-prop-component/` (nuevo)
- `index.html`, `main.ts`, `vite.config.ts`, `package.json`, `.npmrc`, `routes.ts`
- `src/bet.pelela`, `src/bet.ts`, `src/betModel.ts`
- `src/error-list.pelela`, `src/error-list.ts`

### `packages/core/src/bindings/`
- **[MODIFY]** `bindComponent.ts` — Fix A (nested paths) + Fix B (array mutation)
- **[MODIFY]** `types.ts` — agregar `renderChild` a `ComponentBinding`
- **[MODIFY]** `bindComponent.test.ts` — tests A y B + test de re-render DOM
- **[MODIFY]** `reactiveProxy.ts` — detectar mutaciones de propiedades de arrays

---

## Verification Plan

### Automated Tests
```bash
# Desde la raíz del monorepo
pnpm test
# O específicamente:
pnpm --filter @pelelajs/core test -- bindComponent
```

### Manual Verification
- Levantar `examples/nested-prop-component` y verificar comportamiento en browser
- Levantar `examples/components` y verificar que no hay regresiones
