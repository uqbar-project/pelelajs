# Plan de ataque TDD — Issue #135: WeakMap select con proxy double-wrapping

## Contexto

Issue #135. En `bindForEach.ts`, `setOptionElementValue` recibe el `item` de `collection[index]`, que pasa por el proxy `get` trap → `makeReactive(rawItem)` → devuelve `proxyItem`. Ese `proxyItem` se almacena en el WeakMap (`optionValues.ts`).

Cuando el usuario selecciona, `handleSelectWithWeakMap` lee `proxyItem` del WeakMap y lo setea en el viewModel vía `setNestedProperty`. En la re-renderización, `getNestedProperty` lee ese valor. Como es un objeto, el proxy `get` trap lo pasa por `makeReactive` nuevamente. Pero `makeReactive` recibe `proxyItem` (que ya es un proxy), no el raw object:

```
proxyCache.get(proxyItem) → undefined       (proxyCache mapea raw→proxy, no proxy→proxy)
→ crea un NUEVO Proxy<proxyItem>            (double-wrapping)
```

Esto produce una referencia nueva cada render. `renderSelectWithWeakMap` compara `proxyItem` (WeakMap) con `doubleProxyItem` (viewModel) → `===` false → cae a property comparison como fallback.

---

## 🥇 Test

**Archivo**: `packages/core/src/bindings/bindValue.test.ts`

Agregar import: `import { createReactiveViewModel } from '../reactivity/reactiveProxy'`

Dentro de `describe('SELECT with WeakMap binding')`:

```typescript
it('should select correct option by identity when class has non-enumerable properties', () => {
  container.innerHTML = `
    <select bind-value="selectedMultiplier">
      <option for-each="m of multipliers" bind-content="m.label"></option>
    </select>
  `

  class Multiplier {
    readonly label: string
    readonly factor: number
    constructor(label: string, factor: number) {
      Object.defineProperty(this, 'label', { value: label, enumerable: false })
      Object.defineProperty(this, 'factor', { value: factor, enumerable: false })
    }
    getLabel(): string {
      return `${this.label} x${this.factor}`
    }
  }

  const low = new Multiplier('Low', 2)
  const medium = new Multiplier('Medium', 5)

  const viewModel = createReactiveViewModel(
    { multipliers: [low, medium], selectedMultiplier: medium },
    () => {},
  )

  const forEachBindings = setupForEachBindings(container, viewModel)
  const valueBindings = setupValueBindings(container, viewModel)
  renderForEachBindings(forEachBindings, viewModel)
  renderValueBindings(valueBindings, viewModel)

  const select = container.querySelector('select')!
  expect(select.selectedIndex).toBe(1)

  select.selectedIndex = 0
  select.dispatchEvent(new Event('input'))

  renderForEachBindings(forEachBindings, viewModel)
  renderValueBindings(valueBindings, viewModel)

  expect(select.selectedIndex).toBe(0)
  expect((viewModel as any).selectedMultiplier.getLabel()).toBe('Low x2')
})
```

### Por qué falla sin el fix

1. For-each guarda `proxyItem` (proxied multiplier) en WeakMap
2. `handleSelectWithWeakMap` lee `proxyItem` y lo setea en viewModel (raw target)
3. Re-render: `getNestedProperty(viewModel, 'selectedMultiplier')` → `makeReactive(proxyItem)` SIN FIX crea `doubleProxy` (proxy-of-proxy)
4. `renderSelectWithWeakMap`: WeakMap `proxyItem` ≠ `doubleProxy` → `===` false
5. Property comparison: `Object.keys` → `[]` para ambos (non-enumerable) → `[].every()` vacuous true → match en index 0 siempre!
6. **Resultado**: al seleccionar `Low` (index 0), selectedIndex se queda en 1 por vacuidad de `[].every()`
7. Con el fix: `makeReactive(proxyItem)` → `isProxy(proxyItem)` → true → retorna `proxyItem` directo → `===` match → selectedIndex correcto

### Notas de estilo (AGENTS.md)

- Código en **Inglés**: variables `low`, `medium`, strings `'Low'`, `'Medium'`, `'Low x2'`
- `bind-content` no evalúa métodos, solo paths de propiedades → se usa `bind-content="m.label"` (label es accesible pese a ser non-enumerable)
- El método `getLabel()` se verifica en el assert directamente sobre el viewModel

---

## 🥇 Fix

**Archivo**: `packages/core/src/reactivity/reactiveProxy.ts` — función `makeReactive`

```typescript
function makeReactive<T>(
  target: T,
  onChange: (changedPath: string) => void,
  visited = new WeakSet<object>(),
  parentPath = '',
): T {
  if (!isObject(target)) {
    return target
  }

  if (isProxy(target)) {
    return target as T
  }

  const existingProxy = proxyCache.get(target) as T | undefined
  // ... resto igual
```

### Por qué funciona

`isProxy()` (línea 161) chequea `rawObjectCache.has(value)`. Como `proxyItem` fue creado por `makeReactive` originalmente, está en `rawObjectCache` → `isProxy(proxyItem)` es `true`. Se retorna directamente, sin crear un nuevo proxy ni cachear nada.

---

## 🥇 Example

### `examples/for-each/src/app.ts`

Nueva clase (getter en lugar de método para compatibilidad con `bind-content`):

```typescript
class MultiplierOption {
  readonly label: string
  readonly factor: number
  constructor(label: string, factor: number) {
    Object.defineProperty(this, 'label', { value: label, enumerable: false })
    Object.defineProperty(this, 'factor', { value: factor, enumerable: false })
  }
  get info(): string {
    return `${this.label} x${this.factor}`
  }
}
```

Propiedades en `App`:

```typescript
multipliers: MultiplierOption[] = [
  new MultiplierOption('Low', 2),
  new MultiplierOption('Medium', 5),
  new MultiplierOption('High', 10),
]
selectedMultiplier: MultiplierOption | null = this.multipliers[0]
```

### `examples/for-each/src/app.pelela`

```html
<hr/>

<h2>12) Select con objetos + getter (WeakMap proxy test)</h2>

<p>Seleccioná un multiplicador. Sin el fix, al seleccionar una opción distinta a la primera, el select no la muestra como seleccionada.</p>

<select bind-value="selectedMultiplier">
  <option for-each="multiplier of multipliers" bind-content="multiplier.label"></option>
</select>

<p>Info: <span bind-content="selectedMultiplier.info"></span></p>
```

Nota: el texto UI del ejemplo está en español (para alumnos). Código (clase, getter, propiedades) en inglés.

---

## Orden de implementación

| Paso | Archivos | Cambio | Riesgo |
|------|----------|--------|--------|
| 1 | `bindValue.test.ts` | Test con reactive viewModel + class non-enumerable | 🟡 Medio (nuevo import) |
| 2 | `reactiveProxy.ts` | Guard `isProxy(target)` | 🟢 Bajo |
| 3 | `app.ts` + `app.pelela` | Nuevo ejemplo 12 | 🟢 Bajo |
