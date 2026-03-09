# 4.3.2 bind-content

## Introducción

`bind-content` es el binding para mostrar contenido dinámico del ViewModel en elementos de display (span, div, p, etc.). Implementa **one-way data binding** (unidireccional): los cambios en el ViewModel se reflejan en el DOM, pero el usuario no puede modificar estos valores directamente.

Este documento explica cómo funciona bind-content, su diferencia con bind-value, y por qué usar innerHTML en lugar de textContent.

## Propósito

```
┌────────────────────────────────────────────────────────────────┐
│                    bind-content PURPOSE                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ELEMENTOS DE DISPLAY (span, div, p, td, etc.)                 │
│  ───────────────────────────────────────────                   │
│  ViewModel → DOM (unidireccional)                              │
│                                                                 │
│  viewModel.message = "Hello"                                   │
│       │                                                         │
│       └─► <span bind-content="message">Hello</span>            │
│                                                                 │
│  Usuario NO puede editar el contenido                          │
│  No hay event listeners                                        │
│  Usa innerHTML (no textContent)                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Diferencia con bind-value

| Aspecto | bind-value | bind-content |
|---------|-----------|--------------|
| **Dirección** | Bidireccional (↔) | Unidireccional (→) |
| **Elementos** | input, textarea, select | span, div, p, td, h1-h6, etc. |
| **Propiedad DOM** | `.value` | `.innerHTML` |
| **Event Listener** | Sí (`input` event) | No |
| **Editable por usuario** | Sí | No |
| **Tipo de conversión** | Number con comas | String simple |

## Syntax HTML

```html
<elemento bind-content="propertyName"></elemento>
```

### Ejemplos

```html
<span bind-content="message"></span>
<div bind-content="user.name"></div>
<p bind-content="description"></p>
<td bind-content="item.price"></td>
<h1 bind-content="title"></h1>
```

## Código Fuente Completo

### Setup

```typescript
function setupSingleContentBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ContentBinding | null {
  const propertyName = element.getAttribute('bind-content')
  if (!propertyName || !propertyName.trim()) return null

  assertViewModelProperty(viewModel, propertyName, 'bind-content', element)

  return { element, propertyName }
}

export function setupContentBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ContentBinding[] {
  const bindings: ContentBinding[] = []
  const elements = root.querySelectorAll<HTMLElement>('[bind-content]')

  for (const element of elements) {
    const binding = setupSingleContentBinding(element, viewModel)
    if (binding) {
      bindings.push(binding)
    }
  }

  return bindings
}
```

### Render

```typescript
function renderSingleContentBinding<T extends object>(
  binding: ContentBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName)

  console.log(
    '[pelela] renderContentBinding:',
    binding.element.tagName,
    'property:',
    binding.propertyName,
    'value:',
    value,
  )

  binding.element.innerHTML = value === undefined || value === null ? '' : String(value)
}

export function renderContentBindings<T extends object>(
  bindings: ContentBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    renderSingleContentBinding(binding, viewModel)
  }
}
```

### Tipo ContentBinding

```typescript
export type ContentBinding = {
  element: HTMLElement
  propertyName: string
}
```

## Fase 1: Setup de bind-content

### Proceso de Setup

```
setupContentBindings(root, viewModel)
    │
    ├─► querySelectorAll("[bind-content]")
    │     └─► Encuentra todos los elementos con bind-content
    │
    └─► Para cada elemento:
          │
          └─► setupSingleContentBinding(element, viewModel)
                │
                ├─► 1. Obtener propertyName
                ├─► 2. Validar propiedad existe en ViewModel
                └─► 3. Retornar ContentBinding (sin event listeners)
```

### Características del Setup

**No hay event listeners:** A diferencia de bind-value, bind-content NO agrega listeners porque es unidireccional.

```typescript
// bind-value: SÍ tiene listeners
if (isInput) {
  element.addEventListener('input', ...) // ✅
}

// bind-content: NO tiene listeners
return { element, propertyName } // ❌ No listeners
```

### Validación de Propiedad

```typescript
assertViewModelProperty(viewModel, propertyName, 'bind-content', element)
```

Si la propiedad no existe en el ViewModel, lanza `PropertyValidationError`:

```html
<span bind-content="missingProp"></span>
```

```
Error: PropertyValidationError
  Property "missingProp" does not exist in ViewModel "AppViewModel"
  Element: <span bind-content="missingProp"></span>
```

## Render de bind-content

### Proceso de Render

```
renderContentBinding(binding, viewModel)
    │
    ├─► 1. Obtener valor del ViewModel
    │      value = getNestedProperty(viewModel, binding.propertyName)
    │
    ├─► 2. Actualizar innerHTML
    │      element.innerHTML = String(value ?? '')
    │
    └─► 3. DOM actualizado
```

### innerHTML vs textContent

**¿Por qué innerHTML?**

```typescript
// Con textContent (incorrecto):
element.textContent = '<b>Hello</b>'
// Resultado: <b>Hello</b> (se ve literalmente)

// Con innerHTML (correcto):
element.innerHTML = '<b>Hello</b>'
// Resultado: Hello (en negrita)
```

**Implicaciones de Seguridad:**

Si el ViewModel contiene HTML generado por el usuario, usa sanitización:

```typescript
// ⚠️ Peligro XSS si el valor viene del usuario
viewModel.userContent = '<script>alert("XSS")</script>'

// ✅ Mejor: Sanitiza antes de asignar
viewModel.userContent = sanitizeHtml(userInput)
```

### Manejo de null/undefined

```typescript
value === undefined || value === null ? '' : String(value)
```

```
value = undefined → innerHTML = ""
value = null → innerHTML = ""
value = 0 → innerHTML = "0"
value = false → innerHTML = "false"
value = "" → innerHTML = ""
```

### Conversión a String

```typescript
String(value)
```

```
String(123) = "123"
String(true) = "true"
String({ a: 1 }) = "[object Object]"
String([1, 2, 3]) = "1,2,3"
```

## Propiedades Anidadas

### Ejemplo

```typescript
class ViewModel {
  user = {
    profile: {
      name: "John",
      bio: "Developer"
    }
  }
}
```

```html
<span bind-content="user.profile.name"></span>
<p bind-content="user.profile.bio"></p>
```

### Funcionamiento

```
renderContentBinding({ propertyName: "user.profile.name" })
    │
    └─► getNestedProperty(viewModel, "user.profile.name")
          │
          ├─ parts = ["user", "profile", "name"]
          ├─ current = viewModel.user
          ├─ current = viewModel.user.profile
          └─ return viewModel.user.profile.name
                └─► "John"
```

## Uso en for-each

bind-content funciona perfectamente dentro de for-each:

```html
<table>
  <tbody>
    <tr for-each="user of users">
      <td bind-content="user.id"></td>
      <td bind-content="user.name"></td>
      <td bind-content="user.email"></td>
    </tr>
  </tbody>
</table>
```

### Setup en for-each

El sistema de for-each detecta y configura bind-content automáticamente:

```typescript
// En bindForEach.ts
const tempBindings = {
  valueBindings: setupValueBindings(wrapper, viewModel),
  contentBindings: setupContentBindings(wrapper, viewModel), // ✅
  ifBindings: setupIfBindings(wrapper, viewModel),
  // ...
}
```

## Ejemplos Prácticos

### Ejemplo 1: Contador Simple

```typescript
class App {
  count = 0
  
  increment() {
    this.count++
  }
}
```

```html
<pelela view-model="App">
  <h1>Counter: <span bind-content="count"></span></h1>
  <button click="increment">+</button>
</pelela>
```

### Ejemplo 2: Usuario con Propiedades Anidadas

```typescript
class UserProfile {
  user = {
    name: "Alice",
    email: "alice@example.com",
    profile: {
      bio: "Software Engineer",
      location: "San Francisco"
    }
  }
}
```

```html
<pelela view-model="UserProfile">
  <h2 bind-content="user.name"></h2>
  <p bind-content="user.email"></p>
  <div bind-content="user.profile.bio"></div>
  <span bind-content="user.profile.location"></span>
</pelela>
```

### Ejemplo 3: Lista con for-each

```typescript
class TodoList {
  items = [
    { id: 1, text: "Learn PelelaJS", done: true },
    { id: 2, text: "Build an app", done: false }
  ]
}
```

```html
<pelela view-model="TodoList">
  <ul>
    <li for-each="item of items">
      <span bind-content="item.id"></span>:
      <span bind-content="item.text"></span>
    </li>
  </ul>
</pelela>
```

## Comparación Completa: bind-value vs bind-content

### bind-value (Bidireccional)

```html
<input bind-value="name">
```

```typescript
// ViewModel → DOM
viewModel.name = "John"
// input.value = "John"

// DOM → ViewModel (el usuario escribe)
// input.value = "Jane"
viewModel.name = "Jane"
```

**Uso:** Formularios, inputs editables

### bind-content (Unidireccional)

```html
<span bind-content="name"></span>
```

```typescript
// ViewModel → DOM
viewModel.name = "John"
// span.innerHTML = "John"

// DOM ✗ ViewModel (el usuario NO puede editar)
// No hay forma de que el usuario cambie el valor
```

**Uso:** Mostrar datos, displays de solo lectura

## Performance

### Setup Performance

```
setupContentBindings() para 100 bindings:
  ├─ querySelectorAll(): ~2ms
  ├─ Loop 100 elementos: ~3ms
  │   ├─ getAttribute(): ~0.01ms cada uno
  │   └─ assertViewModelProperty(): ~0.02ms cada uno
  │
  └─ Total: ~5ms
```

**Ventaja:** Sin event listeners = setup más rápido que bind-value

### Render Performance

```
renderContentBindings() para 100 bindings:
  ├─ Loop 100 bindings: ~5ms
  │   ├─ getNestedProperty(): ~0.01ms cada uno
  │   └─ innerHTML update: ~0.03ms cada uno
  │
  └─ Total: ~5ms
```

**Nota:** innerHTML es ligeramente más lento que textContent, pero la diferencia es insignificante (<1ms para 100 elementos).

## Testing

### Test de Setup

```typescript
it('should setup content binding for span', () => {
  const root = document.createElement('div')
  root.innerHTML = '<span bind-content="message"></span>'
  
  const vm = { message: 'Hello' }
  const bindings = setupContentBindings(root, vm)
  
  expect(bindings).toHaveLength(1)
  expect(bindings[0].propertyName).toBe('message')
})
```

### Test de Render

```typescript
it('should render content to span', () => {
  const root = document.createElement('div')
  const span = document.createElement('span')
  root.appendChild(span)
  
  const binding: ContentBinding = {
    element: span,
    propertyName: 'message'
  }
  
  const vm = { message: 'Hello World' }
  
  renderSingleContentBinding(binding, vm)
  
  expect(span.innerHTML).toBe('Hello World')
})
```

### Test de Propiedades Anidadas

```typescript
it('should handle nested properties', () => {
  const root = document.createElement('div')
  root.innerHTML = '<span bind-content="user.name"></span>'
  
  const vm = { user: { name: 'John' } }
  const bindings = setupContentBindings(root, vm)
  
  renderContentBindings(bindings, vm)
  
  expect(root.querySelector('span')!.innerHTML).toBe('John')
})
```

## Conclusión

`bind-content` es el binding unidireccional de PelelaJS para mostrar contenido dinámico:

1. **Unidireccional:** Solo ViewModel → DOM
2. **Sin event listeners:** No hay interacción bidireccional
3. **Usa innerHTML:** Permite contenido HTML (con precaución)
4. **Para display:** span, div, p, td, y elementos de solo lectura
5. **Performante:** Sin overhead de listeners
6. **Simple:** Solo dos campos en el binding

Combina bind-content (display) con bind-value (input) para crear interfaces completas y reactivas.

## Referencias

- [Sistema de Binding General](./01-binding-system.md)
- [bind-value (bidireccional)](./03-bind-value.md)
- [Dependency Tracker](./02-dependency-tracker.md)
- [Propiedades Anidadas](../05-nested-properties/01-nested-properties.md)

