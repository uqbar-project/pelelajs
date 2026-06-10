# Feature: Const bindings y validación por campo

## Contexto

Actualmente el framework soporta pasar propiedades dinámicas desde el padre al hijo usando `prop-*` (one-way binding) y `link-*` (two-way binding). Sin embargo, no soporta pasar valores constantes al hijo sin registrarlos como bindings reactivos, y no hay una forma estandarizada de validar campos individuales.

## Objetivos

1. **Soporte de constantes no reactivas**: Permitir pasar strings o números como valores constantes con `const-*`
2. **Validación por campo**: Usar el componente validator (renombrado de error-list) para mostrar errores específicos debajo de cada input, filtrando por `fieldName`
3. **Ejemplo actualizado**: Agregar input de fecha al ejemplo nested-prop-component con validación

---

## Plan iterativo

> [!CAUTION]
> **REGLA ESTRICTA**: Al finalizar cada checkpoint, DEBO DETENERME y esperar la confirmación explícita ("OK") del usuario antes de avanzar al siguiente. NO debo ejecutar ni editar archivos del siguiente checkpoint hasta recibir luz verde.

### Checkpoint 1 — Modificar ejemplo nested-prop-component

#### [MODIFY] `examples/nested-prop-component/src/bet.pelela`

Agregar input de fecha antes del input de monto y usar validators específicos:

```html
<pelela view-model="Bet">
  <div class="container">
    <h1>Place Bet</h1>
    <div class="form-group">
      <label for="date">Date:</label>
      <input id="date" type="date" bind-value="bet.date" />
      <validator const-field-name="date" prop-errors="bet.errors"></validator>
    </div>
    <div class="form-group">
      <label for="amount">Amount:</label>
      <input id="amount" type="number" bind-value="bet.amount" placeholder="Enter your bet..." />
      <validator const-field-name="amount" prop-errors="bet.errors"></validator>
    </div>
    <button click="place">Bet</button>
  </div>
</pelela>
```

#### [MODIFY] `examples/nested-prop-component/src/betModel.ts`

Agregar campo `date` y validación:

```typescript
type ValidationError = {
  fieldName: string
  errorMessage: string
}

export class BetModel {
  date: Date | null = null
  amount = ''
  errors: ValidationError[] = []

  validate() {
    this.errors.length = 0
    if (!this.date) {
      this.errors.push({
        fieldName: 'date',
        errorMessage: 'Date is required',
      })
    }
    if (!this.amount) {
      this.errors.push({
        fieldName: 'amount',
        errorMessage: 'You must enter a bet amount',
      })
    } else if (Number(this.amount) <= 0) {
      this.errors.push({
        fieldName: 'amount',
        errorMessage: 'Amount must be greater than zero',
      })
    }
  }
}
```

#### [MODIFY] `examples/nested-prop-component/src/error-list.pelela` → `validator.pelela`

Renombrar archivo y actualizar template para mostrar solo el mensaje de cada error filtrado por `fieldName`:

```html
<pelela view-model="Validator">
  <ul class="error-list" if="filteredErrors.length">
    <li for-each="error of filteredErrors">
      <span bind-content="error.errorMessage"></span>
    </li>
  </ul>
</pelela>
```

#### [MODIFY] `examples/nested-prop-component/src/error-list.ts` → `validator.ts`

Renombrar archivo y actualizar ViewModel para filtrar errores por `fieldName`:

```typescript
type ValidationError = {
  fieldName: string
  errorMessage: string
}

export class Validator {
  fieldName = ''
  errors: ValidationError[] = []

  get filteredErrors(): ValidationError[] {
    return this.errors.filter((error) => error.fieldName === this.fieldName)
  }
}
```

#### [NO CHANGE] `examples/nested-prop-component/src/bet.ts`

No modificar `bet.ts` para registrar el componente renombrado. El auto-register registra `validator` automáticamente a partir de los archivos renombrados.

**Punto de control**: pedir al usuario ejecutar la verificación del ejemplo. El ejemplo debería compilar y visualizarse en el browser (aunque la validación no funciona aún porque falta el soporte de `const-*`). ✓ → pasar al Checkpoint 2.

---

### Checkpoint 2 — Soporte de `const-*` no reactivo

#### [MODIFY] `packages/core/src/commons/dom.ts`

Agregar el prefijo `const-*` como atributo válido de componentes. A diferencia de `prop-*` y `link-*`, `const-*` no representa un binding reactivo:

```typescript
export const LINK_PREFIX = 'link-'
export const PROP_PREFIX = 'prop-'
export const CONST_PREFIX = 'const-'

export function isValidComponentAttribute(attrName: string): boolean {
  return (
    attrName.startsWith(LINK_PREFIX) ||
    attrName.startsWith(PROP_PREFIX) ||
    attrName.startsWith(CONST_PREFIX) ||
    isValidBindingAttrForComponent(attrName)
  )
}
```

#### [MODIFY] `packages/core/src/bindings/bindComponent.ts`

Agregar extracción de constantes separada de `prop-*`. Las constantes se inicializan una sola vez y no deben entrar en `ComponentBinding.mappings`:

```typescript
import {
  CONST_PREFIX,
  LINK_PREFIX,
  PROP_PREFIX,
  ...
} from '../commons/dom'

function isConst(attr: Attr): boolean {
  return attr.name.startsWith(CONST_PREFIX)
}

function isNumberConstant(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Number(value))
}

function parseConstant(value: string): string | number {
  return isNumberConstant(value) ? Number(value) : value
}

function extractConstantBindings(
  attributes: NamedNodeMap,
): Array<{ childKey: string; value: string | number }> {
  return Array.from(attributes)
    .filter(isConst)
    .map((attr) => ({
      childKey: toCamelCase(attr.name.substring(CONST_PREFIX.length)),
      value: parseConstant(attr.value),
    }))
}
```

`extractOneWayBindings` debe seguir devolviendo solo bindings dinámicos:

```typescript
function extractOneWayBindings(
  attributes: NamedNodeMap,
): Array<{ parentKey: string; childKey: string }> {
  return Array.from(attributes)
    .filter(isProps)
    .map((attr) => ({
      childKey: toCamelCase(attr.name.substring(PROP_PREFIX.length)),
      parentKey: attr.value,
    }))
}
```

#### [MODIFY] `packages/core/src/bindings/bindComponent.ts` — `setupComponentBindings`

Actualizar el setup para asignar constantes antes de configurar los bindings reactivos:

```typescript
function getValidatedParentValue(parentViewModel: ViewModel, parentKey: string): unknown {
  return parentKey.split('.').reduce((current: unknown, segment) => {
    if (!isObject(current) || !hasProperty(current as object, segment)) {
      throw new Error(...)
    }

    return (current as Record<string, unknown>)[segment]
  }, parentViewModel)
}

const constantBindings = extractConstantBindings(element.attributes)
const linkBindings = extractLinkBindings(element.attributes)
const oneWayBindings = extractOneWayBindings(element.attributes)
const allMappings = [...linkBindings, ...oneWayBindings]

constantBindings.forEach(({ childKey, value }) => {
  if (isUnsafeKey(childKey)) {
    throw new Error(...)
  }

  instance[childKey] = value
})

allMappings.forEach(({ parentKey, childKey }) => {
  if (isUnsafeKey(parentKey) || isUnsafeKey(childKey)) {
    throw new Error(...)
  }

  instance[childKey] = getValidatedParentValue(parentViewModel, parentKey)
})
```

`ComponentBinding.mappings` debe mantenerse como la lista de bindings reactivos del padre (`prop-*` y `link-*`). Las constantes quedan fuera de esa lista, por lo que no se registran como dependencias y no participan de `renderComponentBindings`.

**Punto de control**: pedir al usuario ejecutar los tests existentes. Si pasan, ✓ → pasar al Checkpoint 3.

---

### Checkpoint 3 — Tests para `const-*`

#### [MODIFY] `packages/core/src/bindings/bindComponent.test.ts`

Agregar tests para verificar que las constantes se pasan correctamente y no participan de la reactividad:

```typescript
describe('const-* bindings', () => {
  it('should pass string constant as child value', () => {
    class ChildVM {
      message = ''
    }
    defineComponent('child-comp', ChildVM, '<component view-model="ChildVM"><span bind-content="message"></span></component>')

    container.innerHTML = '<child-comp const-message="Hello"></child-comp>'

    const parentVM = createReactiveViewModel({}, () => {})
    const bindings = setupComponentBindings(container, parentVM)

    const childVM = bindings[0].childViewModel as unknown as ChildVM
    expect(childVM.message).toBe('Hello')
    expect(bindings[0].mappings).toEqual([])
  })

  it('should pass number constant as child value', () => {
    class ChildVM {
      count = 0
    }
    defineComponent('child-comp', ChildVM, '<component view-model="ChildVM"><span bind-content="count"></span></component>')

    container.innerHTML = '<child-comp const-count="42"></child-comp>'

    const parentVM = createReactiveViewModel({}, () => {})
    const bindings = setupComponentBindings(container, parentVM)

    const childVM = bindings[0].childViewModel as unknown as ChildVM
    expect(childVM.count).toBe(42)
    expect(bindings[0].mappings).toEqual([])
  })

  it('should still support dynamic prop bindings', () => {
    class ChildVM {
      message = ''
    }
    defineComponent('child-comp', ChildVM, '<component view-model="ChildVM"><span bind-content="message"></span></component>')

    container.innerHTML = '<child-comp prop-message="parentMessage"></child-comp>'

    const parentVM = createReactiveViewModel({ parentMessage: 'Dynamic' }, () => {})
    const bindings = setupComponentBindings(container, parentVM)

    const childVM = bindings[0].childViewModel as unknown as ChildVM
    expect(childVM.message).toBe('Dynamic')
    expect(bindings[0].mappings).toEqual([{ parentKey: 'parentMessage', childKey: 'message' }])
  })
})
```

**Punto de control**: pedir al usuario ejecutar los tests nuevos. Si pasan, ✓ → pasar al Checkpoint 4.

---

### Checkpoint 4 — Verificación integral

1. **Tests existentes**: pedir al usuario ejecutar `pnpm run test --run` y confirmar que no hay regresiones
2. **Ejemplo actualizado**: levantar `examples/nested-prop-component` y verificar que:
   - Los inputs de fecha y monto funcionan
   - Los validators muestran errores específicos debajo de cada input
   - Las constantes con `const-*` inicializan valores y no participan de la reactividad
3. **Ejemplo existente**: levantar `examples/components` y verificar que no hay regresiones

---

## Archivos impactados

### `examples/nested-prop-component/`
- **[MODIFY]** `src/bet.pelela` — agregar input de fecha y validators
- **[MODIFY]** `src/betModel.ts` — agregar campo date y validación
- **[RENAME]** `src/error-list.pelela` → `src/validator.pelela` — renombrar y actualizar template
- **[RENAME]** `src/error-list.ts` → `src/validator.ts` — renombrar y actualizar ViewModel

### `packages/core/src/commons/`
- **[MODIFY]** `dom.ts` — agregar `CONST_PREFIX` y permitir atributos `const-*`

### `packages/core/src/bindings/`
- **[MODIFY]** `bindComponent.ts` — soporte de constantes no reactivas con `const-*`
- **[MODIFY]** `bindComponent.test.ts` — tests para `const-*`

---

## Verification Plan

### Automated Tests
```bash
# Pedir al usuario ejecutar desde la raíz del monorepo
pnpm run test --run
# O específicamente
pnpm --filter @pelelajs/core test -- bindComponent
```

### Manual Verification
- Levantar `examples/nested-prop-component` y verificar comportamiento en browser
- Levantar `examples/components` y verificar que no hay regresiones
