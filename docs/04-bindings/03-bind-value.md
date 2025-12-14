# 4.3.1 bind-value

## Introducción

`bind-value` es el binding bidireccional de PelelaJS. Permite sincronizar el valor de una propiedad del ViewModel con elementos de formulario (input, textarea, select), implementando **two-way data binding** (bidireccional).

**IMPORTANTE:** `bind-value` SOLO funciona con elementos `<input>`, `<textarea>` y `<select>`. Para mostrar contenido en otros elementos (span, div, p, etc.), usa [`bind-content`](./04-bind-content.md).

Este documento explica cómo funciona bind-value en profundidad, incluyendo el setup, el two-way binding, la conversión de tipos, y el renderizado.

## Propósito

```
┌────────────────────────────────────────────────────────────────┐
│                      bind-value PURPOSE                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ELEMENTOS INPUT (input, textarea, select)                     │
│  ──────────────────────────────────────────                    │
│  ViewModel ↔ DOM (bidireccional)                               │
│                                                                 │
│  viewModel.name = "John"                                       │
│       │                                                         │
│       ├─► <input bind-value="name" value="John">               │
│       │                                                         │
│       └─► User escribe "Jane"                                  │
│             │                                                   │
│             └─► viewModel.name = "Jane"                        │
│                                                                 │
│  ⚠️  Para elementos NO-INPUT usa bind-content                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Restricción de Elementos

bind-value **SOLO** acepta estos elementos:

- ✅ `<input>` (todos los tipos)
- ✅ `<textarea>`
- ✅ `<select>`

Para otros elementos:

- ❌ `<span>`, `<div>`, `<p>`, `<td>`, etc. → Usa `bind-content`

Si intentas usar bind-value en un elemento no permitido:

```html
<span bind-value="message"></span>
```

**Error:**
```
Error: bind-value can only be used on input, textarea, or select elements.
Found on <span>. Use bind-content for display elements.
Element: <span bind-value="message"></span>
```

## Syntax HTML

```html
<input bind-value="propertyName">
<textarea bind-value="propertyName"></textarea>
<select bind-value="propertyName"></select>
```

### Ejemplos

```html
<input bind-value="email">
<input type="number" bind-value="age">
<textarea bind-value="description"></textarea>
<select bind-value="country"></select>
```

## Código Fuente Completo

### Setup

```typescript
function setupSingleValueBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ValueBinding | null {
  const propertyName = element.getAttribute("bind-value");
  if (!propertyName || !propertyName.trim()) return null;

  assertViewModelProperty(viewModel, propertyName, "bind-value", element);

  const isInput =
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement;

  if (!isInput) {
    const snippet = element.outerHTML.replace(/\s+/g, ' ').trim().slice(0, 100)
    throw new Error(
      `bind-value can only be used on input, textarea, or select elements. Found on <${element.tagName.toLowerCase()}>. Use bind-content for display elements.\nElement: ${snippet}`
    )
  }

  element.addEventListener("input", (event) => {
    const target = event.target as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;
    const currentValue = getNestedProperty(viewModel, propertyName);

    if (typeof currentValue === "number") {
      const numeric = Number(target.value.replace(",", "."));
      setNestedProperty(
        viewModel,
        propertyName,
        Number.isNaN(numeric) ? 0 : numeric,
      );
    } else {
      setNestedProperty(viewModel, propertyName, target.value);
    }
  });

  return { element, propertyName };
}

export function setupValueBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ValueBinding[] {
  const bindings: ValueBinding[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[bind-value]");

  for (const element of elements) {
    const binding = setupSingleValueBinding(element, viewModel);
    if (binding) {
      bindings.push(binding);
    }
  }

  return bindings;
}
```

### Render

```typescript
function renderSingleValueBinding<T extends object>(
  binding: ValueBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName);

  console.log(
    "[pelela] renderValueBinding:",
    binding.element.tagName,
    "property:",
    binding.propertyName,
    "value:",
    value,
  );

  const input = binding.element as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement;
  const newValue = value ?? "";
  if (input.value !== String(newValue)) {
    input.value = String(newValue);
  }
}

export function renderValueBindings<T extends object>(
  bindings: ValueBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    renderSingleValueBinding(binding, viewModel);
  }
}
```

### Tipo ValueBinding

```typescript
export type ValueBinding = {
  element: HTMLElement;
  propertyName: string;
};
```

**Nota:** El campo `isInput` fue removido porque bind-value ahora solo soporta elementos input.

## Fase 1: Setup de bind-value

### Proceso de Setup

```
setupValueBindings(root, viewModel)
    │
    ├─► querySelectorAll("[bind-value]")
    │     └─► Encuentra todos los elementos con bind-value
    │
    └─► Para cada elemento:
          │
          └─► setupSingleValueBinding(element, viewModel)
                │
                ├─► 1. Obtener propertyName
                ├─► 2. Validar propiedad existe en ViewModel
                ├─► 3. Validar que sea input/textarea/select
                ├─► 4. Agregar event listener
                └─► 5. Retornar ValueBinding
```

### Paso 1: Obtener propertyName

```typescript
const propertyName = element.getAttribute("bind-value");
if (!propertyName || !propertyName.trim()) return null;
```

```html
<span bind-value="message"></span>
```

```
element.getAttribute("bind-value")
    │
    └─► "message"

Validación:
  - propertyName existe? SÍ
  - propertyName.trim() !== ""? SÍ
  - Continuar
```

**Edge cases:**

```html
<span bind-value=""></span>
```

```
propertyName = ""
!propertyName.trim() = true
return null → binding ignorado
```

```html
<span bind-value="  user.name  "></span>
```

```
propertyName = "  user.name  "
propertyName.trim() = "user.name"
Continúa con "  user.name  " (sin trim!)
```

**Nota:** El código **no** hace trim del propertyName. Esto podría causar problemas.

### Paso 2: Validar Propiedad

```typescript
assertViewModelProperty(viewModel, propertyName, "bind-value", element);
```

Esta función valida que la propiedad existe en el ViewModel:

```typescript
export function assertViewModelProperty<T extends object>(
  viewModel: T,
  propertyName: string,
  kind: BindingKind,
  element: Element,
): void {
  if (!hasNestedProperty(viewModel, propertyName)) {
    const snippet = element.outerHTML.replace(/\s+/g, " ").trim().slice(0, 100);

    throw new PropertyValidationError(
      propertyName,
      kind,
      viewModel.constructor.name,
      snippet,
    );
  }
}
```

**Ejemplo de error:**

```html
<span bind-value="nonExistent"></span>
```

```
Error: PropertyValidationError
  Property "nonExistent" does not exist in ViewModel "AppViewModel"
  Element: <span bind-value="nonExistent"></span>
```

### Paso 3: Validar que sea Input

```typescript
const isInput =
  element instanceof HTMLInputElement ||
  element instanceof HTMLTextAreaElement ||
  element instanceof HTMLSelectElement;

if (!isInput) {
  const snippet = element.outerHTML.replace(/\s+/g, ' ').trim().slice(0, 100)
  throw new Error(
    `bind-value can only be used on input, textarea, or select elements. Found on <${element.tagName.toLowerCase()}>. Use bind-content for display elements.\nElement: ${snippet}`
  )
}
```

**Elementos Válidos:**
- ✅ `<input>` (todos los tipos)
- ✅ `<textarea>`
- ✅ `<select>`

**Elementos NO Válidos:**
- ❌ `<span>`, `<div>`, `<p>`, `<h1>`, etc.

**Ejemplo de error:**

```html
<div bind-value="message"></div>
```

```
Error: bind-value can only be used on input, textarea, or select elements.
Found on <div>. Use bind-content for display elements.
Element: <div bind-value="message"></div>
```

### Paso 4: Agregar Event Listener

```typescript
element.addEventListener("input", (event) => {
  const target = event.target as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement;
  const currentValue = getNestedProperty(viewModel, propertyName);

  if (typeof currentValue === "number") {
    const numeric = Number(target.value.replace(",", "."));
    setNestedProperty(
      viewModel,
      propertyName,
      Number.isNaN(numeric) ? 0 : numeric,
    );
  } else {
    setNestedProperty(viewModel, propertyName, target.value);
  }
});
```

Este listener se dispara cada vez que el usuario escribe en el input. Todos los elementos que llegan aquí son input/textarea/select válidos.

#### Flujo del Event Listener

```
Usuario escribe en input
    │
    ├─► Browser dispara "input" event
    │
    └─► Event listener ejecuta
          │
          ├─► Obtener target.value
          │
          ├─► Obtener currentValue del ViewModel
          │
          ├─► currentValue es number?
          │     ├─ SÍ → Convertir a número
          │     └─ NO → Usar string directo
          │
          └─► setNestedProperty(viewModel, propertyName, newValue)
                │
                └─► Proxy.set() → onChange() → render()
```

### Paso 5: Retornar ValueBinding

```typescript
return { element, propertyName };
```

Este objeto se guarda en el array de bindings. Ya no incluye `isInput` porque todos los bindings son de inputs.

## Two-Way Data Binding

### Flujo Bidireccional

```
┌─────────────────────────────────────────────────────────────┐
│                 TWO-WAY DATA BINDING                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DIRECCIÓN 1: ViewModel → DOM                               │
│  ─────────────────────────────                              │
│  viewModel.name = "Jane"                                    │
│       │                                                      │
│       ├─► Proxy.set() detecta cambio                        │
│       ├─► onChange("name")                                  │
│       ├─► render("name")                                    │
│       ├─► renderValueBinding()                              │
│       │     └─► input.value = "Jane"                        │
│       │                                                      │
│       └─► DOM actualizado                                   │
│                                                              │
│                                                              │
│  DIRECCIÓN 2: DOM → ViewModel                               │
│  ─────────────────────────────                              │
│  Usuario escribe "John"                                     │
│       │                                                      │
│       ├─► Browser dispara "input" event                     │
│       ├─► Event listener ejecuta                            │
│       ├─► setNestedProperty(vm, "name", "John")             │
│       │     └─► viewModel.name = "John"                     │
│       │           │                                          │
│       │           └─► Proxy.set() detecta cambio            │
│       │                 └─► onChange("name")                │
│       │                       └─► render("name")            │
│       │                             └─► input.value = "John"│
│       │                                  (ya actualizado)    │
│       │                                                      │
│       └─► ViewModel actualizado                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Ejemplo Completo

```typescript
class FormViewModel {
  name = "John";
  email = "john@example.com";
}
```

```html
<pelela view-model="FormViewModel">
  <input bind-value="name">
  <p>Your name is: <span bind-content="name"></span></p>
  <button click="reset">Reset</button>
</pelela>
```

**Traza:**

```
INICIAL
───────
1. Setup
   <input bind-value="name">
     ├─ Valida que sea input/textarea/select
     ├─ addEventListener("input", ...)
     └─ ValueBinding { element: <input>, propertyName: "name" }

2. Render inicial
   renderValueBinding(<input>)
     └─ <input>.value = "John"


USER ESCRIBE
────────────
3. Usuario escribe "J"
   ├─ <input>.value = "J"
   ├─ Browser dispara "input" event
   ├─ Event listener ejecuta
   │   └─ setNestedProperty(vm, "name", "J")
   │         └─ viewModel.name = "J"
   │               └─ Proxy.set()
   │                     └─ onChange("name")
   │                           └─ render("name")
   │                                 ├─ renderValueBinding(<input>)
   │                                 │   └─ input.value === "J"? SÍ → skip

4. Usuario continúa escribiendo "Jane"
   └─ Se repite el proceso para cada letra

Resultado: Input sincronizado con ViewModel en tiempo real
```

## Conversión de Tipos

### Caso 1: String (Default)

```typescript
viewModel.name = "John";
```

```html
<input bind-value="name">
```

```
Usuario escribe "Jane"
    │
    ├─ target.value = "Jane" (string)
    ├─ currentValue = "John" (string)
    │
    ├─ typeof currentValue === "number"? NO
    │
    └─ setNestedProperty(vm, "name", "Jane")
         └─ viewModel.name = "Jane" (string)
```

### Caso 2: Number

```typescript
viewModel.age = 30;
```

```html
<input type="number" bind-value="age">
```

```
Usuario escribe "31"
    │
    ├─ target.value = "31" (string!)
    ├─ currentValue = 30 (number)
    │
    ├─ typeof currentValue === "number"? SÍ
    │
    ├─ numeric = Number("31".replace(",", "."))
    ├─ numeric = 31
    ├─ Number.isNaN(31)? NO
    │
    └─ setNestedProperty(vm, "age", 31)
         └─ viewModel.age = 31 (number)
```

### Caso 3: Number con Coma Decimal

```typescript
viewModel.price = 10.5;
```

```html
<input bind-value="price">
```

```
Usuario escribe "12,75" (coma europea)
    │
    ├─ target.value = "12,75" (string)
    ├─ currentValue = 10.5 (number)
    │
    ├─ typeof currentValue === "number"? SÍ
    │
    ├─ numeric = Number("12,75".replace(",", "."))
    ├─ numeric = Number("12.75")
    ├─ numeric = 12.75
    ├─ Number.isNaN(12.75)? NO
    │
    └─ setNestedProperty(vm, "price", 12.75)
         └─ viewModel.price = 12.75 (number)
```

### Caso 4: NaN Handling

```typescript
viewModel.count = 5;
```

```html
<input bind-value="count">
```

```
Usuario escribe "abc"
    │
    ├─ target.value = "abc" (string)
    ├─ currentValue = 5 (number)
    │
    ├─ typeof currentValue === "number"? SÍ
    │
    ├─ numeric = Number("abc".replace(",", "."))
    ├─ numeric = NaN
    ├─ Number.isNaN(NaN)? SÍ
    │
    └─ setNestedProperty(vm, "count", 0)
         └─ viewModel.count = 0 (fallback to 0)
```

### Limitación: Solo Detecta por Tipo Actual

```typescript
viewModel.value = "123";
```

```html
<input type="number" bind-value="value">
```

```
Usuario escribe "456"
    │
    ├─ target.value = "456" (string)
    ├─ currentValue = "123" (string!)
    │
    ├─ typeof currentValue === "number"? NO
    │
    └─ setNestedProperty(vm, "value", "456")
         └─ viewModel.value = "456" (string, no convierte a número!)
```

**Problema:** El tipo se detecta por el valor actual, no por el atributo `type` del input.

**Solución:** Inicializar con el tipo correcto:

```typescript
viewModel.value = 123;
```

## Render de bind-value

### Proceso de Render

```
renderValueBinding(binding, viewModel)
    │
    ├─► 1. Obtener valor del ViewModel
    │      value = getNestedProperty(viewModel, binding.propertyName)
    │
    ├─► 2. Actualizar input.value
    │      ├─ Convertir valor a string
    │      ├─ Comparar con input.value actual
    │      └─ Si diferente: actualizar input.value
    │
    └─► 3. DOM actualizado
```

### Render de Input

```typescript
const input = binding.element as
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;
const newValue = value ?? "";
if (input.value !== String(newValue)) {
  input.value = String(newValue);
}
```

Todos los elementos aquí son inputs válidos, ya no necesitamos el check de `isInput`.

#### Check de Igualdad

```typescript
if (input.value !== String(newValue)) {
  input.value = String(newValue);
}
```

**Propósito:** Evitar actualizar el input si el valor no cambió.

**Por qué es importante:**

```
Usuario está escribiendo en el input:
  User types: "H"
  input.value = "H"
  Event fires → viewModel.name = "H"
  onChange("name") → render("name")
  renderValueBinding()
    input.value === "H"? SÍ → NO actualiza
```

Sin el check:

```
input.value = "H"  ← Resetea el cursor!
```

El cursor del usuario saltaría al final cada vez que escribe.

### Conversión a String

```typescript
String(value)
```

```
String(123) = "123"
String(true) = "true"
String({ a: 1 }) = "[object Object]"
String([1, 2, 3]) = "1,2,3"
String(undefined) = "undefined" (pero nunca llega aquí por el check previo)
```

## Propiedades Anidadas

### Ejemplo

```typescript
class ViewModel {
  user = {
    profile: {
      name: "John",
      email: "john@example.com"
    }
  };
}
```

```html
<input bind-value="user.profile.name">
<span bind-value="user.profile.email"></span>
```

### Setup de Propiedades Anidadas

```
setupSingleValueBinding(<input>, viewModel)
    │
    ├─ propertyName = "user.profile.name"
    │
    └─ assertViewModelProperty(vm, "user.profile.name")
         │
         └─ hasNestedProperty(vm, "user.profile.name")
               │
               ├─ vm.user existe? SÍ
               ├─ vm.user.profile existe? SÍ
               └─ vm.user.profile.name existe? SÍ
                     └─ return true
```

### Render de Propiedades Anidadas

```
renderValueBinding(binding, viewModel)
    │
    └─ value = getNestedProperty(viewModel, "user.profile.name")
         │
         ├─ parts = ["user", "profile", "name"]
         ├─ current = viewModel
         ├─ current = current["user"]
         ├─ current = current["profile"]
         └─ current = current["name"]
               └─ return "John"
```

### Set de Propiedades Anidadas

```
Usuario escribe "Jane"
    │
    └─ setNestedProperty(viewModel, "user.profile.name", "Jane")
         │
         ├─ parts = ["user", "profile", "name"]
         ├─ lastPart = "name"
         ├─ parts = ["user", "profile"]
         │
         ├─ current = viewModel
         ├─ current = current["user"]
         ├─ current = current["profile"]
         │
         └─ current["name"] = "Jane"
               └─ viewModel.user.profile.name = "Jane"
```

## Tipos de Inputs Soportados

### text/password/email/etc.

```html
<input type="text" bind-value="username">
<input type="password" bind-value="password">
<input type="email" bind-value="email">
<input type="url" bind-value="website">
<input type="tel" bind-value="phone">
```

Todos funcionan igual: string bidireccional.

### number

```html
<input type="number" bind-value="age">
```

Convierte a number si el valor actual es number.

### checkbox (NO SOPORTADO DIRECTAMENTE)

```html
<input type="checkbox" bind-value="agreed">
```

```
Usuario checkea
    │
    ├─ input.value = "on" (string!)
    │
    └─ viewModel.agreed = "on" (incorrecto!)
```

**Problema:** checkbox usa `.checked`, no `.value`.

**Solución:** Implementar binding específico para checkbox (no existe aún en PelelaJS).

### radio (NO SOPORTADO DIRECTAMENTE)

Similar problema que checkbox.

### textarea

```html
<textarea bind-value="description"></textarea>
```

Funciona igual que `<input>`.

### select

```html
<select bind-value="country">
  <option value="us">USA</option>
  <option value="mx">Mexico</option>
</select>
```

```
viewModel.country = "us"
    │
    └─ render()
         └─ select.value = "us"
               └─ Option "USA" seleccionado

Usuario selecciona "Mexico"
    │
    ├─ select.value = "mx"
    ├─ "input" event (o "change" en algunos browsers)
    │
    └─ viewModel.country = "mx"
```

## Performance

### Setup Performance

```
setupValueBindings() para 100 bindings:
  ├─ querySelectorAll(): ~2ms
  ├─ Loop 100 elementos: ~5ms
  │   ├─ getAttribute(): ~0.01ms cada uno
  │   ├─ assertViewModelProperty(): ~0.02ms cada uno
  │   └─ addEventListener() (si es input): ~0.05ms cada uno
  │
  └─ Total: ~10ms
```

### Render Performance

```
renderValueBindings() para 100 bindings:
  ├─ Loop 100 bindings: ~5ms
  │   ├─ getNestedProperty(): ~0.01ms cada uno
  │   └─ DOM update (textContent o value): ~0.03ms cada uno
  │
  └─ Total: ~5ms
```

### Two-Way Binding Overhead

```
Usuario escribe una letra:
  ├─ "input" event: <1ms
  ├─ Event listener: <1ms
  │   ├─ getNestedProperty(): <0.1ms
  │   ├─ Type conversion: <0.1ms
  │   └─ setNestedProperty(): <0.1ms
  │         └─ Proxy.set(): <0.1ms
  │               └─ onChange(): <0.1ms
  │                     └─ render(): ~1ms (selectivo)
  │
  └─ Total: ~2-3ms
```

**Imperceptible para el usuario** (60fps = 16ms por frame).

## Debugging

### Log de Render

```typescript
console.log(
  "[pelela] renderValueBinding:",
  binding.element.tagName,
  "property:",
  binding.propertyName,
  "value:",
  value,
  "isInput:",
  binding.isInput,
);
```

Output:

```
[pelela] renderValueBinding: INPUT property: name value: John isInput: true
[pelela] renderValueBinding: SPAN property: name value: John isInput: false
```

### Debugging Two-Way Binding

```typescript
element.addEventListener("input", (event) => {
  console.log("[DEBUG] Input event:", {
    propertyName,
    oldValue: getNestedProperty(viewModel, propertyName),
    newValue: (event.target as HTMLInputElement).value
  });
  
  // ... resto del código
});
```

## Testing

### Test de Setup

```typescript
it("should setup value binding for span", () => {
  const root = document.createElement("div");
  root.innerHTML = '<span bind-value="message"></span>';
  
  const vm = createReactiveViewModel({ message: "Hello" }, () => {});
  const bindings = setupValueBindings(root, vm);
  
  expect(bindings.length).toBe(1);
  expect(bindings[0].propertyName).toBe("message");
  expect(bindings[0].isInput).toBe(false);
});

it("should setup value binding for input", () => {
  const root = document.createElement("div");
  root.innerHTML = '<input bind-value="name">';
  
  const vm = createReactiveViewModel({ name: "John" }, () => {});
  const bindings = setupValueBindings(root, vm);
  
  expect(bindings.length).toBe(1);
  expect(bindings[0].propertyName).toBe("name");
  expect(bindings[0].isInput).toBe(true);
});
```

### Test de Render

```typescript
it("should render value to span", () => {
  const root = document.createElement("div");
  const span = document.createElement("span");
  root.appendChild(span);
  
  const binding: ValueBinding = {
    element: span,
    propertyName: "message",
    isInput: false
  };
  
  const vm = { message: "Hello World" };
  
  renderSingleValueBinding(binding, vm);
  
  expect(span.textContent).toBe("Hello World");
});

it("should render value to input", () => {
  const root = document.createElement("div");
  const input = document.createElement("input");
  root.appendChild(input);
  
  const binding: ValueBinding = {
    element: input,
    propertyName: "name",
    isInput: true
  };
  
  const vm = { name: "Jane" };
  
  renderSingleValueBinding(binding, vm);
  
  expect(input.value).toBe("Jane");
});
```

### Test de Two-Way Binding

```typescript
it("should update viewmodel when input changes", () => {
  const root = document.createElement("div");
  root.innerHTML = '<input bind-value="name">';
  
  const vm = createReactiveViewModel({ name: "John" }, () => {});
  setupValueBindings(root, vm);
  
  const input = root.querySelector("input")!;
  input.value = "Jane";
  input.dispatchEvent(new Event("input"));
  
  expect(vm.name).toBe("Jane");
});
```

## Conclusión

`bind-value` es el binding bidireccional de PelelaJS para formularios:

1. **Bidireccional** solo en elementos input/textarea/select
2. **Validación estricta** de elementos permitidos
3. **Conversión automática** de tipos (number)
4. **Soporte de propiedades anidadas** (user.profile.name)
5. **Optimizado** con check de igualdad para evitar resets del cursor

Para mostrar contenido de solo lectura, usa [`bind-content`](./04-bind-content.md).

## Referencias

- [bind-content (unidireccional)](./04-bind-content.md)
- [Sistema de Binding General](./01-binding-system.md)
- [Dependency Tracker](./02-dependency-tracker.md)
- [Propiedades Anidadas](../05-nested-properties/01-nested-properties.md)
- [Sistema de Reactividad](../03-reactivity/01-reactive-proxy.md)

