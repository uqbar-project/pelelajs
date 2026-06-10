# Fix: for-each con paths anidados y valor de option automático

## Contexto

El issue #113 reporta dos problemas:

**Problema 1 — No se puede definir una iteración for-each en base a una propiedad anidada**

Actualmente el parser de for-each solo acepta identificadores simples (ej: `item of items`), no paths con puntos (ej: `valor of apuesta.tipoApuesta.valoresAApostar`). Esto limita la capacidad de iterar sobre propiedades anidadas del ViewModel.

**Problema 2 — El option tiene un valor incorrecto**

Cuando se usa `<option for-each="tipo of tipos" bind-content="tipo.descripcion">`, el option muestra la descripción correctamente pero su valor es el string de la descripción. Esto impide que el select se bindee al objeto completo, lo cual es necesario para acceder a propiedades anidadas del objeto seleccionado (ej: `tipo.valoresAApostar`).

**Solución propuesta por el usuario**:

- No debería hacer falta un `bind-value` explícito en el option
- Si el for-each es `element in elements`, el option debería automáticamente tener como valor el **element** (el objeto), no la descripción que se muestra con `bind-content`
- El `bind-content` solo define qué mostrar, pero el valor del option debería ser el objeto completo del for-each

---

## Plan iterativo

> [!CAUTION]
> **REGLA ESTRICTA**: Al finalizar cada checkpoint, DEBO DETENERME y esperar la confirmación explícita ("OK") del usuario antes de avanzar al siguiente. NO debo ejecutar ni editar archivos del siguiente checkpoint hasta recibir luz verde.

### Checkpoint 1 — Soportar paths anidados en for-each

#### [MODIFY] `packages/core/src/bindings/bindForEach.ts`

**Cambio 1 — Actualizar `parseForEachExpression` para aceptar paths con puntos**

```typescript
function parseForEachExpression(
  expression: string,
): { itemName: string; collectionName: string } | null {
  const identifier = IDENTIFIER_PATTERN.source.replace(/^\^|\$$/g, '')
  // Accept both simple identifiers and nested paths (e.g., "item of items" or "valor of apuesta.tipoApuesta.valoresAApostar")
  const match = expression.trim().match(new RegExp(`^(${identifier})\\s+of\\s+(${identifier}(\\.${identifier})*)$`))
  if (!match) return null
  return { itemName: match[1], collectionName: match[2] }
}
```

**Cambio 2 — Usar `getNestedProperty` para obtener la colección**

```typescript
assertViewModelProperty(viewModel, collectionName, 'for-each', element)
const collection = collectionName.includes('.')
  ? getNestedProperty(viewModel, collectionName)
  : viewModel[collectionName]
```

**Cambio 3 — Actualizar `extractExtraDependencies` para paths anidados**

El `collectionName` ahora puede ser un path anidado, por lo que necesitamos extraer el primer segmento para las dependencias:

```typescript
.map((propPath) => {
  // If collectionName is a nested path, use the first segment for dependency tracking
  const collectionFirstSegment = collectionName.split('.')[0]
  return propPath.startsWith(collectionFirstSegment) ? collectionFirstSegment : propPath
})
```

#### [MODIFY] `packages/core/src/bindings/bindForEach.test.ts`

Agregar tests para verificar que for-each funciona con paths anidados:

```typescript
it('should support nested paths in for-each collection', () => {
  container.innerHTML = `
    <div>
      <span for-each="valor of apuesta.tipoApuesta.valoresAApostar" bind-content="valor"></span>
    </div>
  `

  const viewModel = {
    apuesta: {
      tipoApuesta: {
        valoresAApostar: [10, 20, 30],
      },
    },
  }

  const bindings = setupForEachBindings(container, viewModel)
  renderForEachBindings(bindings, viewModel)

  const spans = container.querySelectorAll('span')
  expect(spans).toHaveLength(3)
  expect(spans[0].textContent).toBe('10')
  expect(spans[1].textContent).toBe('20')
  expect(spans[2].textContent).toBe('30')
})

it('should react to changes in nested for-each collection', () => {
  container.innerHTML = `
    <div>
      <span for-each="valor of apuesta.tipoApuesta.valoresAApostar" bind-content="valor"></span>
    </div>
  `

  const viewModel = {
    apuesta: {
      tipoApuesta: {
        valoresAApostar: [10, 20],
      },
    },
  }

  const bindings = setupForEachBindings(container, viewModel)
  renderForEachBindings(bindings, viewModel)

  let spans = container.querySelectorAll('span')
  expect(spans).toHaveLength(2)

  viewModel.apuesta.tipoApuesta.valoresAApostar.push(30)
  renderForEachBindings(bindings, viewModel)

  spans = container.querySelectorAll('span')
  expect(spans).toHaveLength(3)
})
```

**Punto de control**: los tests nuevos pasan. ✓ → pasar al Checkpoint 2.

---

### Checkpoint 2 — Valor automático de option basado en el elemento del for-each

#### [MODIFY] `packages/core/src/bindings/bindForEach.ts`

**Cambio 1 — Detectar cuando un option está dentro de un for-each y asignar automáticamente el valor del elemento**

Cuando un elemento `<option>` tiene un atributo `for-each`, necesitamos asignar automáticamente su `value` al elemento del for-each (el objeto), no al contenido del `bind-content`.

```typescript
function createNewElement<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
  item: unknown,
  index: number,
): void {
  const element = binding.template.cloneNode(true) as HTMLElement
  const itemRef = { current: item }
  const indexRef = { current: index }
  const extendedViewModel = createExtendedViewModel({
    parentViewModel: viewModel,
    itemName: binding.itemName,
    itemRef,
    indexName: binding.indexName,
    indexRef,
  })
  const render = setupBindingsForElement(element, extendedViewModel)

  // If the element is an option, automatically set its value to the item (object)
  if (element.tagName === 'OPTION') {
    ;(element as HTMLOptionElement).value = JSON.stringify(item)
  }

  const lastElement =
    binding.renderedElements[binding.renderedElements.length - 1]?.element || binding.placeholder
  binding.renderedElements.push({
    element,
    viewModel: extendedViewModel,
    itemRef,
    indexRef,
    render,
  })
  if (lastElement.parentNode) {
    lastElement.parentNode.insertBefore(element, lastElement.nextSibling)
    render()
  }
}
```

**Cambio 2 — Actualizar `updateExistingElements` para mantener el valor del option**

```typescript
function updateExistingElements(binding: ForEachBinding, collection: unknown[]): void {
  binding.renderedElements.forEach((rendered, index) => {
    rendered.itemRef.current = collection[index]
    rendered.indexRef.current = index

    // Update option value if the element is an option
    if (rendered.element.tagName === 'OPTION') {
      ;(rendered.element as HTMLOptionElement).value = JSON.stringify(collection[index])
    }

    rendered.render()
  })
}
```

#### [MODIFY] `packages/core/src/bindings/bindValue.ts`

**Cambio 1 — Parsear el valor del select como JSON cuando es un objeto**

Cuando el valor del select es un string JSON, intentar parsearlo para obtener el objeto original:

```typescript
function renderSingleValueBinding<T extends object>(
  binding: ValueBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName)

  const input = binding.element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  const isCheckbox = input instanceof HTMLInputElement && input.type === 'checkbox'

  if (isCheckbox) {
    ;(input as HTMLInputElement).checked = !!value
  } else {
    const newValue = value ?? ''
    let stringValue = String(newValue)

    // If the value is an object, stringify it for comparison
    if (typeof newValue === 'object' && newValue !== null) {
      stringValue = JSON.stringify(newValue)
    }

    if (input.value !== stringValue) {
      input.value = stringValue
    }
  }
}
```

**Cambio 2 — Parsear el valor del input del usuario como JSON cuando corresponde**

```typescript
element.addEventListener(isCheckbox ? 'change' : 'input', (event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  const currentValue = getNestedProperty(viewModel, propertyName)

  if (isCheckbox) {
    setNestedProperty(viewModel, propertyName, (target as HTMLInputElement).checked)
    return
  }

  const inputValue = target.value

  // Try to parse as JSON if the current value is an object
  if (typeof currentValue === 'object' && currentValue !== null) {
    try {
      const parsed = JSON.parse(inputValue)
      setNestedProperty(viewModel, propertyName, parsed)
      return
    } catch {
      // If parsing fails, fall through to string handling
    }
  }

  if (typeof currentValue === 'number') {
    const separator = getDecimalSeparator()
    const thousandsSeparator = getThousandsSeparator()

    const normalizedValue = inputValue
      .replace(/\s/g, '')
      .split(thousandsSeparator)
      .join('')
      .replace(separator, '.')

    const numeric = Number(normalizedValue)
    setNestedProperty(viewModel, propertyName, Number.isNaN(numeric) ? 0 : numeric)
  } else {
    setNestedProperty(viewModel, propertyName, inputValue)
  }
})
```

#### [MODIFY] `packages/core/src/bindings/bindForEach.test.ts`

Agregar tests para verificar que el option tiene el valor del objeto:

```typescript
it('should set option value to the for-each item object', () => {
  container.innerHTML = `
    <select>
      <option for-each="tipo of tipos" bind-content="tipo.descripcion"></option>
    </select>
  `

  const viewModel = {
    tipos: [
      { descripcion: 'Tipo A', value: 1 },
      { descripcion: 'Tipo B', value: 2 },
    ],
  }

  const bindings = setupForEachBindings(container, viewModel)
  renderForEachBindings(bindings, viewModel)

  const options = container.querySelectorAll('option')
  expect(options).toHaveLength(2)
  expect(options[0].textContent).toBe('Tipo A')
  expect(options[0].value).toBe(JSON.stringify(viewModel.tipos[0]))
  expect(options[1].textContent).toBe('Tipo B')
  expect(options[1].value).toBe(JSON.stringify(viewModel.tipos[1]))
})

it('should work with select bind-value using object values', () => {
  container.innerHTML = `
    <select bind-value="selectedTipo">
      <option for-each="tipo of tipos" bind-content="tipo.descripcion"></option>
    </select>
  `

  const viewModel = {
    tipos: [
      { descripcion: 'Tipo A', value: 1 },
      { descripcion: 'Tipo B', value: 2 },
    ],
    selectedTipo: null as { descripcion: string; value: number } | null,
  }

  const valueBindings = setupValueBindings(container, viewModel)
  const forEachBindings = setupForEachBindings(container, viewModel)
  renderForEachBindings(forEachBindings, viewModel)
  renderValueBindings(valueBindings, viewModel)

  const select = container.querySelector('select') as HTMLSelectElement
  expect(select.value).toBe('') // No selection initially

  viewModel.selectedTipo = viewModel.tipos[0]
  renderValueBindings(valueBindings, viewModel)

  expect(select.value).toBe(JSON.stringify(viewModel.tipos[0]))
})
```

**Punto de control**: los tests nuevos pasan. ✓ → pasar al Checkpoint 3.

---

### Checkpoint 3 — Ejemplo en examples/for-each

#### [MODIFY] `examples/for-each/src/app.pelela`

Agregar un ejemplo al final que demuestre el uso de paths anidados y objetos en select:

```html
  <hr/>

  <h2>8) Select con objetos y paths anidados</h2>

  <p>Tipo de apuesta:</p>
  <select bind-value="apuesta.tipoApuesta">
    <option for-each="tipo of tiposApuesta" bind-content="tipo.descripcion"></option>
  </select>

  <p>Valor seleccionado: <span bind-content="apuesta.tipoApuesta.descripcion"></span></p>

  <p>Valores a apostar:</p>
  <select bind-value="apuesta.valorApostado">
    <option for-each="valor of apuesta.tipoApuesta.valoresAApostar" bind-content="valor"></option>
  </select>

  <p>Valor seleccionado: <span bind-content="apuesta.valorApostado"></span></p>
```

#### [MODIFY] `examples/for-each/src/app.ts`

Agregar los datos para el nuevo ejemplo:

```typescript
interface TipoApuesta {
  descripcion: string
  valoresAApostar: number[]
}

export class App {
  // ... existing properties ...

  tiposApuesta: TipoApuesta[] = [
    { descripcion: 'Ganador', valoresAApostar: [10, 20, 50] },
    { descripcion: 'Segundo Puesto', valoresAApostar: [5, 10, 25] },
    { descripcion: 'Tercero', valoresAApostar: [2, 5, 10] },
  ]

  apuesta = {
    tipoApuesta: null as TipoApuesta | null,
    valorApostado: null as number | null,
  }

  // ... existing methods ...
}
```

**Punto de control**: levantar el ejemplo y verificar que:
- El primer select muestra las descripciones de los tipos de apuesta
- Al seleccionar un tipo, el segundo select se actualiza con los valores correspondientes
- La reactividad funciona correctamente al cambiar el tipo de apuesta
✓ → pasar al Checkpoint 4.

---

### Checkpoint 4 — Verificación integral

1. **Tests existentes**: `pnpm test --run` sin regresiones en `bindForEach.test.ts`, `bindValue.test.ts`.
2. **Ejemplo actualizado**: levantar `examples/for-each` y verificar que el nuevo ejemplo funciona correctamente.
3. **Ejemplo existente**: levantar `examples/components` y verificar que no hay regresiones.

---

## Archivos impactados

### `packages/core/src/bindings/`
- **[MODIFY]** `bindForEach.ts` — soportar paths anidados en for-each y asignar valor automático a options
- **[MODIFY]** `bindValue.ts` — parsear valores JSON en select
- **[MODIFY]** `bindForEach.test.ts` — tests para paths anidados y valor de option
- **[MODIFY]** `bindValue.test.ts` — tests para select con objetos

### `examples/for-each/`
- **[MODIFY]** `src/app.pelela` — agregar ejemplo 8 con select y paths anidados
- **[MODIFY]** `src/app.ts` — agregar datos para el nuevo ejemplo

---

## Verification Plan

### Automated Tests
```bash
# Pedir al usuario ejecutar desde la raíz del monorepo
pnpm run test --run
# O específicamente
pnpm --filter @pelelajs/core test -- bindForEach
pnpm --filter @pelelajs/core test -- bindValue
```

### Manual Verification
- Levantar `examples/for-each` y verificar comportamiento en browser
- Verificar que el example 8 funciona correctamente con paths anidados y objetos en select
- Levantar `examples/components` y verificar que no hay regresiones
