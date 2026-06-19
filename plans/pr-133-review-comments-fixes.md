# Plan de ataque TDD — Review comments de nicovillamonte en PR #133

## Contexto

nicovillamonte aprobó el PR #133 pero dejó 5 comentarios inline en el review. Este plan detalla cómo atacar cada uno con metodología TDD: primero escribir el test que falla, después implementar el fix.

---

## 🥇 Issue #1 — `bindValue.ts` | select pierde el tipo numérico

**Archivo**: `packages/core/src/bindings/bindValue.test.ts` (test) + `packages/core/src/bindings/bindValue.ts` (fix)

**Problema**: `handleSelectWithWeakMap()` usa siempre `selectedOption.value` (string) cuando la option no tiene WeakMap. Si el view model tenía `number`, después del select queda string.

### Test (FAILING primero)

```ts
it('should preserve numeric type when selecting a static option', () => {
  container.innerHTML = `
    <select bind-value="selectedValue">
      <option value="1">Monotributo</option>
      <option value="2">Responsable Inscripto</option>
    </select>
  `
  const viewModel = { selectedValue: 1 }

  setupValueBindings(container, viewModel)

  const select = container.querySelector('select')!
  select.value = '2'
  select.dispatchEvent(new Event('input'))

  expect(viewModel.selectedValue).toBe(2)
  expect(typeof viewModel.selectedValue).toBe('number')
})
```

### Fix

En `handleSelectWithWeakMap`, chequear `typeof currentValue === 'number'` y convertir:

```ts
function handleSelectWithWeakMap<T extends object>(
  target: HTMLSelectElement,
  viewModel: ViewModel<T>,
  propertyName: string,
): void {
  const selectedOption = target.options[target.selectedIndex]
  if (!selectedOption) {
    setNestedProperty(viewModel, propertyName, undefined)
    return
  }

  if (hasOptionValue(selectedOption)) {
    setNestedProperty(viewModel, propertyName, getOptionValue(selectedOption))
  } else {
    const currentValue = getNestedProperty(viewModel, propertyName)
    const rawValue = selectedOption.value
    if (typeof currentValue === 'number') {
      setNestedProperty(viewModel, propertyName, Number(rawValue))
    } else {
      setNestedProperty(viewModel, propertyName, rawValue)
    }
  }
}
```

---

## 🥇 Issue #2 — `router.ts` + `bootstrap.ts` | `isRouterActive` no se resetea en error

**Archivos**: `packages/core/src/bootstrap/bootstrap.ts`, `packages/core/src/router/router.ts`, `packages/core/src/router/router.test.ts`

**Problema**: `router.start()` llama `setRouterActive()` (true). Si `resolveAndRender()` falla, se llama `resetRouter()` que limpia el estado del router pero **no** resetea `isRouterActive`. Bootstrap después saltea carga de CSS porque cree que el router sigue activo.

### Test (FAILING primero)

En `router.test.ts`:

```ts
it('should reset isRouterActive when resetRouter is called', () => {
  setRouterActive()
  expect(getRouterActive()).toBe(true)

  resetRouter()

  expect(getRouterActive()).toBe(false)
})
```

Requiere importar `setRouterActive`, `getRouterActive` desde `'../bootstrap/bootstrap'` y `resetRouter` desde `'../router/router'`.

### Fix (2 pasos)

1. En `bootstrap.ts`, agregar:
   ```ts
   export function resetRouterActive(): void {
     isRouterActive = false
   }
   ```

2. En `router.ts`, importar y llamar `resetRouterActive()` en `resetRouter()`:
   ```ts
   import { resetRouterActive } from '../bootstrap/bootstrap'

   export function resetRouter(): void {
     // ... existing cleanup ...
     resetRouterActive()
   }
   ```

---

## 🥇 Issues #3 y #4 — `index.ts:111,182` | `attribute` vs `{{attr}}` en i18n

**Archivo**: `packages/vite-plugin-pelelajs/src/index.test.ts` (test) + `packages/vite-plugin-pelelajs/src/index.ts` (fix)

**Problema**: La traducción `forbiddenRootAttribute` usa `{{attr}}` en el template, pero los dos `t()` calls pasan `attribute` como key. El placeholder queda sin interpolar.

Ocurre en dos funciones:
- `validateNoForbiddenHtmlAttributes` (line 108-113)
- `validateNoForbiddenRootAttributes` (line 179-183)

### Test (FAILING primero)

En `index.test.ts`, dentro del `describe('validation')`:

```ts
it('should interpolate attribute name correctly in forbiddenRootAttribute error', () => {
  const pelelaPath = path.join(tempDir, 'forbidden-attr.pelela')
  fs.writeFileSync(
    pelelaPath,
    '<pelela view-model="Home" link-value="x"></pelela>',
  )

  const errors: string[] = []
  const errorFn = (msg: string | Error) => errors.push(String(msg))

  const plugin = pelelajsPlugin()
  const handler = getHandler(plugin.load!)
  handler.call({ error: errorFn } as never, pelelaPath, {} as never)

  expect(errors[0]).toContain('"link-value"')
  expect(errors[0]).not.toContain('{{attr}}')
  expect(errors[0]).not.toContain('undefined')
})
```

### Fix

En ambos `t()` calls: cambiar `attribute:` por `attr:`.

- Line 111: `attribute: match.attributeName` → `attr: match.attributeName`
- Line 182: `attribute: foundAttribute` → `attr: foundAttribute`

---

## 🥈 Issue #5 — Circular dependency `assertValidBindingAttribute` ↔ `bindForEach`

**Archivos**: `packages/core/src/validation/assertValidBindingAttribute.ts`, `packages/core/src/bindings/bindForEach.ts`, nuevo `packages/core/src/validation/bindingAttributeUtils.ts`

**Problema**: 
- `assertValidBindingAttribute.ts:1` importa `isBindingAttribute` de `'../bindings/bindForEach'`
- `bindForEach.ts:16` importa `assertValidBindingAttribute` de `'../validation/assertValidBindingAttribute'`

Es un ciclo: `validation` → `bindings` → `validation`.

**Test**: No hay un test que rompa (CJS tolera ciclos). La estrategia es refactorizar y verificar que los tests existentes sigan pasando.

### Fix

Extraer `isBindingAttribute` a un módulo neutral:

1. Crear `packages/core/src/validation/bindingAttributeUtils.ts`:
   ```ts
   import { LINK_PREFIX, PROP_PREFIX } from '../commons/dom'

   const EXACT_BINDING_ATTRIBUTES = ['click', 'if', 'for-each', 'index'] as const
   const BIND_PREFIX_ATTRIBUTES = [
     'bind-value', 'bind-content', 'bind-src', 'bind-class', 'bind-style',
   ] as const

   export function isBindingAttribute(attrName: string): boolean {
     if (
       /^aria-/.test(attrName) ||
       /^data-/.test(attrName) ||
       attrName === 'role' ||
       /^xml-/.test(attrName)
     ) {
       return false
     }
     return (
       BIND_PREFIX_ATTRIBUTES.includes(attrName as never) ||
       attrName.startsWith(LINK_PREFIX) ||
       attrName.startsWith(PROP_PREFIX) ||
       EXACT_BINDING_ATTRIBUTES.includes(attrName as never)
     )
   }
   ```

2. En `bindForEach.ts`:
   - Eliminar `export function isBindingAttribute(...)` y su lógica asociada
   - Reemplazar import con `import { isBindingAttribute } from '../validation/bindingAttributeUtils'`
   - Mantener las constantes `EXACT_BINDING_ATTRIBUTES`, `BIND_PREFIX_ATTRIBUTES` y tipos si se usan internamente

3. En `assertValidBindingAttribute.ts`:
   - Cambiar import de `'../bindings/bindForEach'` a `'./bindingAttributeUtils'`

4. Verificar que no queden imports cíclicos.

---

## 📋 Orden de implementación sugerido

| Paso | Issue | Archivos | Cambio | Riesgo |
|------|-------|----------|--------|--------|
| 1 | #3 + #4 | `index.ts` | `attribute:` → `attr:` (2 líneas) | 🟢 Bajo |
| 2 | #5 | Nuevo + `bindForEach.ts` + `assertValidBindingAttribute.ts` | Extraer `isBindingAttribute` | 🟡 Medio |
| 3 | #1 | `bindValue.ts` | Type-check numérico en `handleSelectWithWeakMap` | 🟢 Bajo |
| 4 | #2 | `bootstrap.ts` + `router.ts` | Resetear flag en `resetRouter()` | 🟢 Bajo |

## ✅ Implementación completada — Resumen final

### Paso 1 (Issues #3 y #4) — i18n fix
- **`packages/vite-plugin-pelelajs/src/index.test.ts`**: nuevo test que verifica que `{{attr}}` se interpola y no queda literal
- **`packages/vite-plugin-pelelajs/src/index.ts`**: `attribute:` → `attr:` en ambos `t()` calls (líneas 111, 182)

### Paso 2 (Issue #5) — Circular dependency
- **Nuevo**: `packages/core/src/validation/bindingAttributeUtils.ts` — extrae `isBindingAttribute`
- **`packages/core/src/bindings/bindForEach.ts`**: elimina `isBindingAttribute`, importa desde utils
- **`packages/core/src/validation/assertValidBindingAttribute.ts`**: import desde `'./bindingAttributeUtils'`

### Paso 3 (Issue #1) — Select type coercion
- **`packages/core/src/bindings/bindValue.test.ts`**: test `should preserve numeric type when selecting a static option`
- **`packages/core/src/bindings/bindValue.ts`**: `handleSelectWithWeakMap()` chequea `typeof currentValue === 'number'` y convierte

### Paso 4 (Issue #2) — Router flag + mejoras adicionales
- **`packages/core/src/bootstrap/bootstrap.ts`**: nueva export `resetRouterActive()`
- **`packages/core/src/router/router.ts`**:
  - `resetRouter()` ahora llama `resetRouterActive()`
  - `setRouterActive()` y `validateRoutesHaveTemplates()` movidos dentro del try/catch de `start()`
  - `renderPath()` catch ahora llama `resetRouterActive()` antes de `handleError()`
  - CSS reordenado: se guarda ref a old CSS, se monta template, y solo si ok se muta el DOM del CSS
- **`packages/core/src/router/router.test.ts`**: 6 tests nuevos (reset flag, error en start, error en navigateTo, mountTemplate failure)

### Cobertura final
- **586 tests pasan** (543 core + 43 vite-plugin)
- Todos los 5 comentarios de nicovillamonte resueltos con TDD
