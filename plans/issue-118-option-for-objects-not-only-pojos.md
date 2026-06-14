Acá con Claude pensamos en una posible solución e inclusive **cómo extenderlo a otros casos** (ej: una tabla/grilla a la que puedas bindear en un `<tr>` el objeto que no sea POJO)

```md
# Refactor: binding de SELECT usando WeakMap en lugar de serialización devalue

## Contexto

Actualmente, cuando un `<option>` es generado por `for-each` con un objeto como ítem, su atributo `value` se serializa usando `devalue` (`stringify`). Al producirse el evento `input` en el `<select>`, ese string se deserializa con `parse`. Esto implica que solo se pueden bindear POJOs: los objetos con comportamiento (class instances con métodos) pierden su prototipo en el ciclo serialize → deserialize.

Como el framework siempre corre en el mismo navegador (CSR, una sola VM JS), no es necesario pasar por el DOM para preservar la referencia al objeto. Se puede guardar la referencia directamente en un `WeakMap<HTMLOptionElement, unknown>` y recuperarla desde el handler del evento.

**Archivos afectados:**

- `packages/core/src/bindings/optionValues.ts` — **[CREATE]** nuevo módulo con el WeakMap
- `packages/core/src/bindings/bindForEach.ts` — **[MODIFY]** usar el WeakMap al crear/actualizar options
- `packages/core/src/bindings/bindValue.ts` — **[MODIFY]** usar el WeakMap en el handler y en el render de SELECT
- `packages/core/src/bindings/bindForEach.test.ts` — **[MODIFY]** actualizar tests que chequeaban el valor devalue serializado
- `packages/core/src/bindings/bindValue.test.ts` — **[MODIFY]** agregar tests para SELECT con objetos y class instances

---

> [!CAUTION]
> **REGLA ESTRICTA**: Al finalizar cada checkpoint, DEBÉS DETENERTE y esperar la confirmación explícita ("OK") del usuario antes de avanzar al siguiente. NO ejecutes ningún comando `pnpm`, `npm`, ni ningún script de terminal. NO edites archivos del siguiente checkpoint hasta recibir luz verde. Solo podés hacer `ls` o `cat` para explorar el código.

---

## Checkpoint 1 — Crear `optionValues.ts`

### [CREATE] `packages/core/src/bindings/optionValues.ts`

Creá este archivo nuevo con exactamente este contenido:

```typescript
const optionToValue = new WeakMap<HTMLOptionElement, unknown>()

export function setOptionValue(option: HTMLOptionElement, value: unknown): void {
  optionToValue.set(option, value)
}

export function getOptionValue(option: HTMLOptionElement): unknown {
  return optionToValue.get(option)
}

export function hasOptionValue(option: HTMLOptionElement): boolean {
  return optionToValue.has(option)
}
```

**Verificación antes de continuar:**
- El archivo existe en la ruta indicada.
- Tiene exactamente las tres funciones exportadas: `setOptionValue`, `getOptionValue`, `hasOptionValue`.
- No usa `any`. Usa `unknown`.

> **DETENTE aquí. NO ejecutes ningún comando pnpm. Esperá la confirmación del usuario antes de continuar al Checkpoint 2.**

---

## Checkpoint 2 — Modificar `bindForEach.ts`

### [MODIFY] `packages/core/src/bindings/bindForEach.ts`

**Cambio 1 — Reemplazar el import de `devalue`**

Buscá esta línea al inicio del archivo:

```typescript
import { stringify } from 'devalue'
```

Reemplazala por:

```typescript
import { setOptionValue } from './optionValues'
```

**Cambio 2 — Eliminar la función `serializeOptionValue`**

Buscá y eliminá completamente este bloque (las 3 líneas):

```typescript
function serializeOptionValue(item: unknown): string {
  return typeof item === 'object' && item !== null ? stringify(item) : String(item)
}
```

**Cambio 3 — Actualizar `createNewElement` para usar WeakMap**

Buscá este bloque dentro de la función `createNewElement`:

```typescript
  if (element.tagName === 'OPTION') {
    ;(element as HTMLOptionElement).value = serializeOptionValue(item)
  }
```

Reemplazalo por:

```typescript
  if (element.tagName === 'OPTION') {
    const option = element as HTMLOptionElement
    option.value = typeof item === 'object' && item !== null ? String(index) : String(item)
    setOptionValue(option, item)
  }
```

**Cambio 4 — Actualizar `updateExistingElements` para usar WeakMap**

Buscá este bloque dentro de la función `updateExistingElements`:

```typescript
    if (rendered.element.tagName === 'OPTION') {
      ;(rendered.element as HTMLOptionElement).value = serializeOptionValue(collection[index])
    }
```

Reemplazalo por:

```typescript
    if (rendered.element.tagName === 'OPTION') {
      const option = rendered.element as HTMLOptionElement
      const item = collection[index]
      option.value = typeof item === 'object' && item !== null ? String(index) : String(item)
      setOptionValue(option, item)
    }
```

**Verificación antes de continuar:**
- La palabra `serializeOptionValue` no aparece en ningún lugar del archivo (ni como función ni como llamada).
- La palabra `stringify` no aparece en el archivo.
- El import de `devalue` en este archivo no existe más.
- El import de `./optionValues` está al principio del archivo.
- La función `setOptionValue` se usa en dos lugares: dentro de `createNewElement` y dentro de `updateExistingElements`.

> **DETENTE aquí. NO ejecutes ningún comando pnpm. Esperá la confirmación del usuario antes de continuar al Checkpoint 3.**

---

## Checkpoint 3 — Modificar `bindValue.ts`

### [MODIFY] `packages/core/src/bindings/bindValue.ts`

**Cambio 1 — Agregar import de `optionValues`**

Buscá la línea de imports existente al inicio del archivo:

```typescript
import { parse, stringify } from 'devalue'
```

Reemplazala por:

```typescript
import { parse, stringify } from 'devalue'
import { getOptionValue, hasOptionValue } from './optionValues'
```

(Se mantiene el import de `devalue` porque `parse` y `stringify` siguen siendo necesarios para bindings de INPUT/TEXTAREA con objetos.)

**Cambio 2 — Agregar lookup WeakMap en el event handler del SELECT**

Dentro de la función `setupSingleValueBinding`, buscá este bloque exacto en el event handler:

```typescript
    const inputValue = target.value

    if (typeof currentValue === 'object' && currentValue !== null) {
      try {
        const parsed = parse(inputValue)
        setNestedProperty(viewModel, propertyName, parsed)
        return
      } catch {
        setNestedProperty(viewModel, propertyName, inputValue)
        return
      }
    }
```

Reemplazalo por:

```typescript
    if (target instanceof HTMLSelectElement) {
      const selectedOption = target.options[target.selectedIndex]
      if (hasOptionValue(selectedOption)) {
        setNestedProperty(viewModel, propertyName, getOptionValue(selectedOption))
        return
      }
    }

    const inputValue = target.value

    if (typeof currentValue === 'object' && currentValue !== null) {
      try {
        const parsed = parse(inputValue)
        setNestedProperty(viewModel, propertyName, parsed)
        return
      } catch {
        setNestedProperty(viewModel, propertyName, inputValue)
        return
      }
    }
```

**Cambio 3 — Agregar lookup WeakMap en `renderSingleValueBinding`**

Dentro de la función `renderSingleValueBinding`, buscá el bloque `else` completo:

```typescript
  } else {
    const newValue = value ?? ''
    let stringValue = String(newValue)

    if (typeof newValue === 'object' && newValue !== null) {
      stringValue = stringify(newValue)
    }

    if (input.value !== stringValue) {
      input.value = stringValue
    }
  }
```

Reemplazalo por:

```typescript
  } else {
    if (input instanceof HTMLSelectElement) {
      const matchingIndex = Array.from(input.options).findIndex(
        (opt) => hasOptionValue(opt) && getOptionValue(opt) === value,
      )
      if (matchingIndex >= 0) {
        if (input.selectedIndex !== matchingIndex) {
          input.selectedIndex = matchingIndex
        }
        return
      }
    }

    const newValue = value ?? ''
    let stringValue = String(newValue)

    if (typeof newValue === 'object' && newValue !== null) {
      stringValue = stringify(newValue)
    }

    if (input.value !== stringValue) {
      input.value = stringValue
    }
  }
```

**Verificación antes de continuar:**
- El archivo importa `getOptionValue` y `hasOptionValue` desde `./optionValues`.
- El archivo sigue importando `parse` y `stringify` desde `devalue`.
- En el event handler, el bloque `if (target instanceof HTMLSelectElement)` aparece **antes** del bloque `const inputValue = target.value`.
- En `renderSingleValueBinding`, el bloque `if (input instanceof HTMLSelectElement)` aparece **dentro** del `else`, antes de `const newValue = value ?? ''`.

> **DETENTE aquí. NO ejecutes ningún comando pnpm. Esperá la confirmación del usuario antes de continuar al Checkpoint 4.**

---

## Checkpoint 4 — Actualizar `bindForEach.test.ts`

### [MODIFY] `packages/core/src/bindings/bindForEach.test.ts`

**Cambio 1 — Actualizar el test de option value para objetos**

Buscá este test completo:

```typescript
    it('should set option value to the for-each item object', () => {
      container.innerHTML = `
        <select>
          <option for-each="type of types" bind-content="type.description"></option>
        </select>
      `

      const viewModel = {
        types: [
          { description: 'Type A', value: 1 },
          { description: 'Type B', value: 2 },
        ],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const options = container.querySelectorAll('option')
      expect(options).toHaveLength(2)
      expect(options[0].textContent).toBe('Type A')
      expect(options[0].value).toBe('[{"description":1,"value":2},"Type A",1]')
      expect(options[1].textContent).toBe('Type B')
      expect(options[1].value).toBe('[{"description":1,"value":2},"Type B",2]')
    })
```

Reemplazalo por:

```typescript
    it('should set index-based value on options when item is an object', () => {
      container.innerHTML = `
        <select>
          <option for-each="type of types" bind-content="type.description"></option>
        </select>
      `

      const viewModel = {
        types: [
          { description: 'Type A', value: 1 },
          { description: 'Type B', value: 2 },
        ],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const options = container.querySelectorAll('option')
      expect(options).toHaveLength(2)
      expect(options[0].textContent).toBe('Type A')
      expect(options[0].value).toBe('0')
      expect(options[1].textContent).toBe('Type B')
      expect(options[1].value).toBe('1')
    })
```

**Cambio 2 — Agregar import de `getOptionValue` al inicio del archivo**

Buscá la línea de imports al inicio:

```typescript
import {
  createExtendedViewModel,
  isBindingAttribute,
  isCustomComponent,
  renderForEachBindings,
  setupForEachBindings,
  setupSingleForEachBinding,
} from './bindForEach'
```

Reemplazala por:

```typescript
import {
  createExtendedViewModel,
  isBindingAttribute,
  isCustomComponent,
  renderForEachBindings,
  setupForEachBindings,
  setupSingleForEachBinding,
} from './bindForEach'
import { getOptionValue } from './optionValues'
```

**Cambio 3 — Agregar test para class instances con WeakMap**

Buscá el test "should set option value to string when item is not object" y, **inmediatamente después del cierre de ese test** (después del `})`), agregá este nuevo test:

```typescript
    it('should preserve class instance reference through WeakMap when option is selected', () => {
      container.innerHTML = `
        <select bind-value="selectedType">
          <option for-each="type of types" bind-content="type.description"></option>
        </select>
      `

      class BetType {
        constructor(
          public description: string,
          public multiplier: number,
        ) {}

        getLabel(): string {
          return `${this.description} x${this.multiplier}`
        }
      }

      const typeA = new BetType('Type A', 2)
      const typeB = new BetType('Type B', 3)

      const viewModel = {
        types: [typeA, typeB],
        selectedType: null as BetType | null,
      }

      setupBindings(container, viewModel)

      const options = container.querySelectorAll('option')
      expect(options).toHaveLength(2)
      expect(getOptionValue(options[0] as HTMLOptionElement)).toBe(typeA)
      expect(getOptionValue(options[1] as HTMLOptionElement)).toBe(typeB)
    })
```

**Verificación antes de continuar:**
- El test renombrado dice "should set index-based value on options when item is an object".
- Los `expect` del test renombrado usan `'0'` y `'1'` (no strings de devalue).
- El import de `getOptionValue` desde `./optionValues` existe al inicio del archivo.
- El nuevo test con `BetType` existe después del test "should set option value to string when item is not object".

> **DETENTE aquí. NO ejecutes ningún comando pnpm. Esperá la confirmación del usuario antes de continuar al Checkpoint 5.**

---

## Checkpoint 5 — Actualizar `bindValue.test.ts`

### [MODIFY] `packages/core/src/bindings/bindValue.test.ts`

**Cambio 1 — Agregar import de helpers de for-each**

Buscá la línea de imports al inicio del archivo:

```typescript
import { renderValueBindings, setupValueBindings } from './bindValue'
```

Reemplazala por:

```typescript
import { renderForEachBindings, setupForEachBindings } from './bindForEach'
import { renderValueBindings, setupValueBindings } from './bindValue'
```

**Cambio 2 — Agregar bloque de tests para SELECT con WeakMap**

Buscá el cierre del describe `'renderValueBindings'`. Ese bloque termina con el test "should stringify objects when rendering in input":

```typescript
    it('should stringify objects when rendering in input', () => {
      container.innerHTML = '<input bind-value="data" />'
      const viewModel = { data: { key: 'value' } }
      const bindings = setupValueBindings(container, viewModel)

      renderValueBindings(bindings, viewModel)

      const input = container.querySelector('input')!
      expect(input.value).toBe('[{"key":1},"value"]')
    })
  })
})
```

Reemplazá esas últimas líneas (desde ese test hasta el cierre del archivo) por:

```typescript
    it('should stringify objects when rendering in input', () => {
      container.innerHTML = '<input bind-value="data" />'
      const viewModel = { data: { key: 'value' } }
      const bindings = setupValueBindings(container, viewModel)

      renderValueBindings(bindings, viewModel)

      const input = container.querySelector('input')!
      expect(input.value).toBe('[{"key":1},"value"]')
    })
  })

  describe('SELECT with WeakMap binding', () => {
    it('should update viewModel with original object reference when option is selected', () => {
      container.innerHTML = `
        <select bind-value="selectedType">
          <option for-each="type of types" bind-content="type.description"></option>
        </select>
      `

      const viewModel = {
        types: [
          { description: 'Type A', id: 1 },
          { description: 'Type B', id: 2 },
        ],
        selectedType: null as { description: string; id: number } | null,
      }

      const forEachBindings = setupForEachBindings(container, viewModel)
      const valueBindings = setupValueBindings(container, viewModel)
      renderForEachBindings(forEachBindings, viewModel)
      renderValueBindings(valueBindings, viewModel)

      const select = container.querySelector('select')!
      select.selectedIndex = 0
      select.dispatchEvent(new Event('input'))

      expect(viewModel.selectedType).toBe(viewModel.types[0])
    })

    it('should select the correct option when rendering with a matching object reference', () => {
      container.innerHTML = `
        <select bind-value="selectedType">
          <option for-each="type of types" bind-content="type.description"></option>
        </select>
      `

      const viewModel = {
        types: [
          { description: 'Type A', id: 1 },
          { description: 'Type B', id: 2 },
        ],
        selectedType: null as { description: string; id: number } | null,
      }

      const forEachBindings = setupForEachBindings(container, viewModel)
      const valueBindings = setupValueBindings(container, viewModel)
      renderForEachBindings(forEachBindings, viewModel)

      viewModel.selectedType = viewModel.types[1]
      renderValueBindings(valueBindings, viewModel)

      const select = container.querySelector('select')!
      expect(select.selectedIndex).toBe(1)
    })

    it('should preserve class instance methods after select event', () => {
      container.innerHTML = `
        <select bind-value="selectedType">
          <option for-each="type of types" bind-content="type.description"></option>
        </select>
      `

      class BetType {
        constructor(
          public description: string,
          public multiplier: number,
        ) {}

        getLabel(): string {
          return `${this.description} x${this.multiplier}`
        }
      }

      const typeA = new BetType('Type A', 2)
      const typeB = new BetType('Type B', 3)

      const viewModel = {
        types: [typeA, typeB] as BetType[],
        selectedType: null as BetType | null,
      }

      const forEachBindings = setupForEachBindings(container, viewModel)
      const valueBindings = setupValueBindings(container, viewModel)
      renderForEachBindings(forEachBindings, viewModel)
      renderValueBindings(valueBindings, viewModel)

      const select = container.querySelector('select')!
      select.selectedIndex = 1
      select.dispatchEvent(new Event('input'))

      expect(viewModel.selectedType).toBe(typeB)
      expect(viewModel.selectedType?.getLabel()).toBe('Type B x3')
    })
  })
})
```

**Verificación antes de continuar:**
- El import de `renderForEachBindings, setupForEachBindings` desde `./bindForEach` existe al inicio.
- El nuevo `describe('SELECT with WeakMap binding', ...)` contiene exactamente 3 tests.
- El tercer test verifica que `getLabel()` funciona (clase con método).
- El archivo sigue cerrando con `})` después del nuevo describe.

> **DETENTE aquí. NO ejecutes ningún comando pnpm. Esperá la confirmación del usuario antes de continuar al Checkpoint 6.**

---

## Checkpoint 6 — Actualizar el ejemplo `for-each`


### [MODIFY] `examples/for-each/src/app.ts`

**Cambio 1 — Agregar la clase `BetClass` antes de la clase `App`**

Buscá esta interfaz al inicio del archivo:

```typescript
interface BetType {
  description: string
  active?: boolean
}
```

Reemplazala por:

```typescript
interface BetType {
  description: string
  active?: boolean
}

class BetClass {
  constructor(
    public description: string,
    public multiplier: number,
  ) {}

  getLabel(): string {
    return `${this.description} x${this.multiplier}`
  }
}
```

**Cambio 2 — Agregar propiedades para el ejemplo 10 al final de la clase `App`**

Buscá el método `searchUser` al final de la clase:

```typescript
  async searchUser() {
```

Justo antes de esa línea, agregá:

```typescript
  // 10) Ejemplo Select con class instances
  betClasses: BetClass[] = [
    new BetClass('Ganador', 3),
    new BetClass('Segundo Puesto', 2),
    new BetClass('Tercero', 1.5),
  ]

  selectedBetClass: BetClass = this.betClasses[0]

  get selectedBetLabel(): string {
    return this.selectedBetClass.getLabel()
  }

```

**Verificación antes de continuar:**
- La clase `BetClass` existe en el archivo (fuera de `App`), con el constructor y el método `getLabel`.
- La clase `App` tiene las propiedades `betClasses`, `selectedBetClass` y el getter `selectedBetLabel`.

### [MODIFY] `examples/for-each/src/app.pelela`

**Cambio — Agregar el ejemplo 10 al final del archivo**

Buscá la línea final del archivo:

```html
</pelela>
```

Reemplazala por:

```html
  <hr/>

  <h2>10) Select con class instances (comportamiento preservado)</h2>

  <p>Al seleccionar, el objeto conserva sus métodos porque se guarda la referencia original.</p>

  <select bind-value="selectedBetClass">
    <option for-each="betClass of betClasses" bind-content="betClass.description"></option>
  </select>

  <p>Etiqueta calculada con método: <span bind-content="selectedBetLabel"></span></p>

</pelela>
```

**Verificación antes de continuar:**
- El ejemplo 10 aparece al final del archivo `.pelela`, después del `<hr/>`.
- El `<select>` usa `bind-value="selectedBetClass"` y el `<option>` usa `for-each="betClass of betClasses"`.
- El `<span>` usa `bind-content="selectedBetLabel"` (el getter que llama a `getLabel()`).

> **DETENTE aquí. NO ejecutes ningún comando pnpm. Esperá la confirmación del usuario antes de continuar al Checkpoint 7.**

---

## Checkpoint 7 — Verificación integral

En este checkpoint **no editás ningún archivo**. Solo reportás los resultados de los comandos que el usuario ejecutará.

El usuario ejecutará:

```bash
pnpm run biome:check
pnpm run test --run
```

Si hay errores de tipo o linting, **reportalos al usuario sin corregirlos por tu cuenta**. Esperá instrucciones.

Si los tests pasan y el linter no reporta errores, el trabajo está completo.

> **DETENTE aquí. NO ejecutes ningún comando pnpm. Esperá la confirmación del usuario.**

---

## Archivos impactados

| Acción | Archivo |
|--------|---------|
| **[CREATE]** | `packages/core/src/bindings/optionValues.ts` |
| **[MODIFY]** | `packages/core/src/bindings/bindForEach.ts` |
| **[MODIFY]** | `packages/core/src/bindings/bindValue.ts` |
| **[MODIFY]** | `packages/core/src/bindings/bindForEach.test.ts` |
| **[MODIFY]** | `packages/core/src/bindings/bindValue.test.ts` |
| **[MODIFY]** | `examples/for-each/src/app.ts` |
| **[MODIFY]** | `examples/for-each/src/app.pelela` |

---

## Trabajo futuro — Generalizar el WeakMap a otros bindings

Este plan implementa el WeakMap solo para `<option>` dentro de un `<select>`. La misma idea puede extenderse a cualquier elemento generado por `for-each` (por ejemplo, filas de una tabla donde el usuario hace click para seleccionar un objeto).

### Qué habría que cambiar

**1. Renombrar `optionValues.ts` → `forEachItemStore.ts`**

El módulo actual almacena `WeakMap<HTMLOptionElement, unknown>`. Para la generalización, la clave sería `HTMLElement` y el módulo se llamaría `forEachItemStore.ts` con funciones `setForEachItem` / `getForEachItem` / `hasForEachItem`.

**2. Marcar los elementos raíz del `for-each`**

En `bindForEach.ts`, al crear cada elemento raíz (`createNewElement`), agregar un atributo que lo identifique como origen de un `for-each`:

```typescript
element.dataset.forEachRoot = ''
setForEachItem(element, item)
```

Esto permite que cualquier binding posterior pueda encontrar el elemento raíz desde un evento disparado por un hijo.

**3. Resolver el `event.target` en bindings de click**

Para `<select>`, el DOM provee `selectedIndex` como puntero directo al elemento. Para un click en una fila de tabla, `event.target` puede ser cualquier elemento hijo (un `<td>`, un `<span>`, etc.). El binding de click necesitaría subir por el árbol:

```typescript
const root = (event.target as Element).closest('[data-for-each-root]')
const item = root ? getForEachItem(root as HTMLElement) : undefined
```

**4. Pasar el item al método del ViewModel**

Es el cambio más significativo: actualmente `click="selectRow"` llama a `app.selectRow()` sin argumentos. Para que el método reciba el objeto de la fila, habría que decidir si:

- Se pasa como argumento: `app.selectRow(item)` — rompe la firma actual.
- Se expone como propiedad temporal en el ViewModel antes de llamar al método.
- Se mantiene el paradigma actual y el alumno usa un setter explícito en la vista (`bind-value` en un input hidden, por ejemplo).

### Por qué no se hace ahora

El caso de uso principal del framework (alumnos de Algoritmos 3) no requiere todavía selección de filas de tabla via binding. El SELECT cubre el caso de mayor demanda. Extender antes de tener ese requerimiento sería optimización prematura.
```