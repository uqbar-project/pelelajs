# 4.3.5 click (Event Binding)

## Introducción

El binding `click` permite registrar event handlers del ViewModel directamente en elementos HTML. Es el mecanismo de manejo de eventos de PelelaJS.

## Syntax HTML

```html
<elemento click="handlerName"></elemento>
```

## Código Fuente

```typescript
function setupSingleClickBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): void {
  const handlerName = element.getAttribute("click");
  if (!handlerName || !handlerName.trim()) return;

  element.addEventListener("click", (event) => {
    const handler = viewModel[handlerName];

    if (typeof handler !== "function") {
      throw new Error(
        `[pelela] Handler "${handlerName}" definido en click="..." no es una función ` +
        `del view model "${viewModel.constructor?.name ?? "Unknown"}".`,
      );
    }

    handler.call(viewModel, event);
  });
}

export function setupClickBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): void {
  const elements = root.querySelectorAll<HTMLElement>("[click]");

  for (const element of elements) {
    setupSingleClickBinding(element, viewModel);
  }
}
```

## Setup de Event Listeners

### Proceso

```
setupClickBindings(root, viewModel)
    │
    ├─► querySelectorAll("[click]")
    │
    └─► Para cada elemento:
          │
          └─► setupSingleClickBinding(element, viewModel)
                │
                ├─► 1. Obtener handlerName
                ├─► 2. Registrar event listener
                │     └─► Validar handler en tiempo de ejecución
                └─► 3. Handler listo
```

### No Retorna Binding

A diferencia de otros bindings, `click` **no retorna** un binding object. Solo registra el event listener.

**Razón:** No necesita re-render. Los event listeners permanecen activos.

## Invocación de Handlers

### Context Binding (this)

```typescript
handler.call(viewModel, event);
```

**Propósito:** Asegurar que `this` dentro del handler apunta al ViewModel.

```typescript
class ViewModel {
  count = 0;
  
  increment() {
    this.count++;  // 'this' es el ViewModel
  }
}
```

Sin `.call(viewModel)`:

```typescript
handler(event);
```

`this` sería `undefined` en strict mode.

### Event Parameter

```typescript
handler.call(viewModel, event);
```

El handler recibe el evento DOM original:

```typescript
class ViewModel {
  handleClick(event: MouseEvent) {
    console.log("Clicked at:", event.clientX, event.clientY);
    event.preventDefault();
    event.stopPropagation();
  }
}
```

```html
<button click="handleClick">Click me</button>
```

## Validación de Handlers

### Validación en Runtime

```typescript
const handler = viewModel[handlerName];

if (typeof handler !== "function") {
  throw new Error(
    `[pelela] Handler "${handlerName}" definido en click="..." no es una función ` +
    `del view model "${viewModel.constructor?.name ?? "Unknown"}".`,
  );
}
```

**Cuándo se valida:** En el momento del click, no en el setup.

### Error Example

```html
<button click="nonExistentHandler">Click</button>
```

```typescript
class ViewModel {
  // nonExistentHandler no existe
}
```

**Al hacer click:**

```
Error: [pelela] Handler "nonExistentHandler" definido en click="..." no es una función del view model "ViewModel".
```

### Handler No Función

```typescript
class ViewModel {
  handler = "not a function";
}
```

```html
<button click="handler">Click</button>
```

**Al hacer click:**

```
Error: [pelela] Handler "handler" definido en click="..." no es una función...
```

## Ejemplos Completos

### Contador

```typescript
class CounterViewModel {
  count = 0;
  
  increment() {
    this.count++;
  }
  
  decrement() {
    this.count--;
  }
  
  reset() {
    this.count = 0;
  }
}
```

```html
<pelela view-model="CounterViewModel">
  <p>Count: <span bind-value="count"></span></p>
  <button click="increment">+</button>
  <button click="decrement">-</button>
  <button click="reset">Reset</button>
</pelela>
```

### Usar Event

```typescript
class ViewModel {
  lastClick = "";
  
  handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    this.lastClick = `Clicked ${target.textContent} at (${event.clientX}, ${event.clientY})`;
  }
}
```

```html
<pelela view-model="ViewModel">
  <button click="handleClick">Button 1</button>
  <button click="handleClick">Button 2</button>
  <p bind-value="lastClick"></p>
</pelela>
```

### Prevenir Default

```typescript
class FormViewModel {
  email = "";
  
  handleSubmit(event: Event) {
    event.preventDefault();
    console.log("Email:", this.email);
  }
}
```

```html
<form>
  <input bind-value="email" type="email">
  <button click="handleSubmit" type="submit">Submit</button>
</form>
```

### Stop Propagation

```typescript
class ViewModel {
  handleInner(event: MouseEvent) {
    event.stopPropagation();
    console.log("Inner clicked");
  }
  
  handleOuter() {
    console.log("Outer clicked");
  }
}
```

```html
<div click="handleOuter">
  Outer
  <button click="handleInner">Inner (stops propagation)</button>
</div>
```

Click en botón: Solo "Inner clicked"
Click en div: "Outer clicked"

## Arrow Functions y This

### Problema con Arrow Functions

```typescript
class ViewModel {
  count = 0;
  
  increment = () => {
    this.count++;
  }
}
```

```html
<button click="increment">+</button>
```

**Esto funciona** porque arrow functions capturan `this` del contexto.

Pero el `.call(viewModel, event)` es redundante en este caso.

### Métodos Normales (Recomendado)

```typescript
class ViewModel {
  count = 0;
  
  increment() {
    this.count++;
  }
}
```

Más idiomático y compatible.

## Múltiples Handlers en un Elemento

```html
<!-- NO soportado directamente -->
<button click="handler1" click="handler2">Click</button>
```

Solo el último atributo `click` se aplica.

**Solución:** Crear un handler que llame a ambos:

```typescript
class ViewModel {
  handleBoth() {
    this.handler1();
    this.handler2();
  }
  
  handler1() { /* ... */ }
  handler2() { /* ... */ }
}
```

```html
<button click="handleBoth">Click</button>
```

## Otros Eventos

PelelaJS solo soporta `click` directamente.

**Para otros eventos:**

```typescript
class ViewModel {
  setupCustomEvents(element: HTMLElement) {
    element.addEventListener("mouseover", this.handleMouseOver.bind(this));
    element.addEventListener("keydown", this.handleKeyDown.bind(this));
  }
  
  handleMouseOver(event: MouseEvent) { /* ... */ }
  handleKeyDown(event: KeyboardEvent) { /* ... */ }
}
```

O usar referencias directas en el HTML:

```html
<div onmouseover="console.log('hover')">Hover me</div>
```

## Testing

```typescript
it("should call handler on click", () => {
  const root = document.createElement("div");
  root.innerHTML = '<button click="handleClick">Click</button>';
  
  let clicked = false;
  const vm = createReactiveViewModel({
    handleClick() {
      clicked = true;
    }
  }, () => {});
  
  setupClickBindings(root, vm);
  
  const button = root.querySelector("button")!;
  button.click();
  
  expect(clicked).toBe(true);
});

it("should pass event to handler", () => {
  const root = document.createElement("div");
  root.innerHTML = '<button click="handleClick">Click</button>';
  
  let receivedEvent: Event | null = null;
  const vm = createReactiveViewModel({
    handleClick(event: Event) {
      receivedEvent = event;
    }
  }, () => {});
  
  setupClickBindings(root, vm);
  
  const button = root.querySelector("button")!;
  button.click();
  
  expect(receivedEvent).toBeInstanceOf(MouseEvent);
});

it("should throw error for non-function handler", () => {
  const root = document.createElement("div");
  root.innerHTML = '<button click="notAFunction">Click</button>';
  
  const vm = createReactiveViewModel({
    notAFunction: "string"
  }, () => {});
  
  setupClickBindings(root, vm);
  
  const button = root.querySelector("button")!;
  
  expect(() => button.click()).toThrow();
});
```

## Limitaciones

### Solo Click Event

PelelaJS solo tiene binding para `click`. Otros eventos requieren setup manual.

### No Soporta Parámetros

```html
<!-- NO funciona -->
<button click="increment(5)">+5</button>
```

**Solución:** Crear métodos específicos:

```typescript
class ViewModel {
  incrementBy5() {
    this.increment(5);
  }
  
  increment(amount: number) {
    this.count += amount;
  }
}
```

### No Event Delegation

Cada elemento con `click` registra su propio listener.

Para listas grandes, esto puede ser ineficiente.

## Conclusión

El binding `click` permite manejo simple de eventos con context binding automático, siendo suficiente para casos de uso básicos.

## Referencias

- [Sistema de Binding General](./01-binding-system.md)
- [bind-value](./03-bind-value.md)
- [for-each](./07-for-each.md)

