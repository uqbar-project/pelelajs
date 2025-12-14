# 4.3.2 if (Conditional Rendering)

## Introducción

El binding `if` permite mostrar u ocultar elementos del DOM basándose en una condición booleana del ViewModel. Es el mecanismo de renderizado condicional de PelelaJS.

## Propósito

```
┌────────────────────────────────────────────────────────────────┐
│                    if BINDING PURPOSE                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Mostrar/Ocultar elementos basado en condición                │
│                                                                 │
│  viewModel.isVisible = true                                    │
│       │                                                         │
│       └─► <div if="isVisible" style="display: block">         │
│             Visible                                            │
│           </div>                                               │
│                                                                 │
│  viewModel.isVisible = false                                   │
│       │                                                         │
│       └─► <div if="isVisible" style="display: none">          │
│             Oculto                                             │
│           </div>                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Syntax HTML

```html
<elemento if="propertyName"></elemento>
```

### Ejemplos

```html
<div if="isVisible">Content</div>
<p if="user.isActive">Active user</p>
<span if="showDetails">Details here</span>
```

## Código Fuente

### Setup

```typescript
function setupSingleIfBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): IfBinding | null {
  const propertyName = element.getAttribute("if");
  if (!propertyName || !propertyName.trim()) return null;

  assertViewModelProperty(viewModel, propertyName, "if", element);

  return {
    element,
    propertyName,
    originalDisplay: element.style.display || "",
  };
}

export function setupIfBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): IfBinding[] {
  const bindings: IfBinding[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[if]");

  for (const element of elements) {
    const binding = setupSingleIfBinding(element, viewModel);
    if (binding) {
      bindings.push(binding);
    }
  }

  return bindings;
}
```

### Render

```typescript
function renderSingleIfBinding<T extends object>(
  binding: IfBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName);
  const shouldShow = Boolean(value);

  binding.element.style.display = shouldShow
    ? binding.originalDisplay
    : "none";
}

export function renderIfBindings<T extends object>(
  bindings: IfBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    renderSingleIfBinding(binding, viewModel);
  }
}
```

### Tipo IfBinding

```typescript
export type IfBinding = {
  element: HTMLElement;
  propertyName: string;
  originalDisplay: string;
};
```

## Setup de if

### Proceso

```
setupIfBindings(root, viewModel)
    │
    ├─► querySelectorAll("[if]")
    │
    └─► Para cada elemento:
          │
          └─► setupSingleIfBinding(element, viewModel)
                │
                ├─► 1. Obtener propertyName
                ├─► 2. Validar propiedad existe
                ├─► 3. Guardar display original
                └─► 4. Retornar IfBinding
```

### Paso 1: Obtener propertyName

```typescript
const propertyName = element.getAttribute("if");
if (!propertyName || !propertyName.trim()) return null;
```

```html
<div if="isVisible"></div>
```

```
getAttribute("if") = "isVisible"
```

### Paso 2: Validar Propiedad

```typescript
assertViewModelProperty(viewModel, propertyName, "if", element);
```

Valida que la propiedad existe en el ViewModel.

### Paso 3: Guardar Display Original

```typescript
originalDisplay: element.style.display || ""
```

**Propósito:** Restaurar el display original cuando se vuelva a mostrar.

```html
<div if="isVisible" style="display: flex">Content</div>
```

```
Setup:
  originalDisplay = element.style.display = "flex"

Render con isVisible=false:
  element.style.display = "none"

Render con isVisible=true:
  element.style.display = "flex" (restaurado)
```

**Casos:**

```html
<!-- Sin display inline -->
<div if="isVisible">Content</div>
```
```
originalDisplay = ""
```

```html
<!-- Con display inline -->
<div if="isVisible" style="display: inline-block">Content</div>
```
```
originalDisplay = "inline-block"
```

```html
<!-- Con display en CSS class -->
<div if="isVisible" class="flex-container">Content</div>
```
```css
.flex-container { display: flex; }
```
```
originalDisplay = "" (NO lee de CSS classes!)
```

**Limitación:** Solo lee `style.display` inline, no desde CSS.

## Evaluación de Condiciones Booleanas

### Boolean Conversion

```typescript
const shouldShow = Boolean(value);
```

JavaScript convierte valores a boolean:

| Valor | Boolean(value) | Visible |
|-------|----------------|---------|
| `true` | `true` | ✓ Sí |
| `false` | `false` | ✗ No |
| `1` | `true` | ✓ Sí |
| `0` | `false` | ✗ No |
| `"text"` | `true` | ✓ Sí |
| `""` | `false` | ✗ No |
| `{}` | `true` | ✓ Sí |
| `[]` | `true` | ✓ Sí |
| `null` | `false` | ✗ No |
| `undefined` | `false` | ✗ No |

### Ejemplos

#### Ejemplo 1: Boolean Puro

```typescript
viewModel.isVisible = true;
```

```html
<div if="isVisible">Content</div>
```

```
value = true
Boolean(true) = true
shouldShow = true
element.style.display = originalDisplay
→ Visible
```

#### Ejemplo 2: Number

```typescript
viewModel.count = 5;
```

```html
<div if="count">Has items</div>
```

```
value = 5
Boolean(5) = true
shouldShow = true
→ Visible
```

```typescript
viewModel.count = 0;
```

```
value = 0
Boolean(0) = false
shouldShow = false
→ Oculto
```

#### Ejemplo 3: String

```typescript
viewModel.message = "Hello";
```

```html
<div if="message">Has message</div>
```

```
value = "Hello"
Boolean("Hello") = true
→ Visible
```

```typescript
viewModel.message = "";
```

```
value = ""
Boolean("") = false
→ Oculto
```

#### Ejemplo 4: Object/Array

```typescript
viewModel.user = { name: "John" };
```

```html
<div if="user">User exists</div>
```

```
value = { name: "John" }
Boolean({ name: "John" }) = true
→ Visible
```

```typescript
viewModel.items = [];
```

```html
<div if="items">Has items</div>
```

```
value = []
Boolean([]) = true (!)
→ Visible (aunque el array está vacío!)
```

**Importante:** Arrays vacíos son truthy en JavaScript.

Para verificar si hay elementos:

```typescript
viewModel.hasItems = this.items.length > 0;
```

```html
<div if="hasItems">Has items</div>
```

#### Ejemplo 5: Null/Undefined

```typescript
viewModel.user = null;
```

```html
<div if="user">User exists</div>
```

```
value = null
Boolean(null) = false
→ Oculto
```

## Render de if

### Proceso

```
renderIfBinding(binding, viewModel)
    │
    ├─► 1. Obtener valor del ViewModel
    │      value = getNestedProperty(viewModel, propertyName)
    │
    ├─► 2. Convertir a boolean
    │      shouldShow = Boolean(value)
    │
    └─► 3. Aplicar display
           element.style.display = shouldShow ? originalDisplay : "none"
```

### Show/Hide con Display CSS

```typescript
binding.element.style.display = shouldShow
  ? binding.originalDisplay
  : "none";
```

**Mecánica:**

```
shouldShow = true
  └─► display = originalDisplay (ej: "flex", "", "inline-block")

shouldShow = false
  └─► display = "none"
```

**Ventajas:**
- Simple
- Performante
- Mantiene el elemento en el DOM

**Desventajas:**
- El elemento sigue en el DOM (accesible con querySelector)
- Event listeners siguen activos
- Ocupa espacio en memoria

### Alternativa: Remover del DOM

PelelaJS **no** remueve elementos del DOM, solo los oculta.

Frameworks como Vue tienen `v-if` (remove) y `v-show` (hide).

## Ejemplos Completos

### Ejemplo 1: Toggle Simple

```typescript
class ToggleViewModel {
  isVisible = true;
  
  toggle() {
    this.isVisible = !this.isVisible;
  }
}
```

```html
<pelela view-model="ToggleViewModel">
  <button click="toggle">Toggle</button>
  <div if="isVisible">
    This content can be hidden
  </div>
</pelela>
```

**Traza:**

```
Estado inicial:
  isVisible = true
  <div>.style.display = "" (visible)

Click en button:
  toggle() ejecuta
  isVisible = false
  onChange("isVisible")
  render("isVisible")
  renderIfBinding()
    shouldShow = false
    <div>.style.display = "none" (oculto)

Click en button otra vez:
  isVisible = true
  <div>.style.display = "" (visible)
```

### Ejemplo 2: Mostrar Usuario Logueado

```typescript
class AppViewModel {
  user = null as { name: string } | null;
  
  login() {
    this.user = { name: "John" };
  }
  
  logout() {
    this.user = null;
  }
}
```

```html
<pelela view-model="AppViewModel">
  <div if="user">
    Welcome, <span bind-value="user.name"></span>!
    <button click="logout">Logout</button>
  </div>
  
  <div if="!user">
    <button click="login">Login</button>
  </div>
</pelela>
```

**Problema:** `if="!user"` no funciona directamente.

**Solución:**

```typescript
class AppViewModel {
  user = null as { name: string } | null;
  
  get isLoggedIn() {
    return this.user !== null;
  }
  
  get isLoggedOut() {
    return this.user === null;
  }
}
```

```html
<div if="isLoggedIn">Welcome!</div>
<div if="isLoggedOut">Please login</div>
```

### Ejemplo 3: Preservar Display

```html
<div if="showFlex" style="display: flex; gap: 10px;">
  <span>Item 1</span>
  <span>Item 2</span>
</div>
```

```typescript
viewModel.showFlex = false;
```

```
Setup:
  originalDisplay = "flex"

Render (showFlex=false):
  display = "none"

Render (showFlex=true):
  display = "flex" (preservado correctamente)
```

## Múltiples Condiciones

### AND Logic

```html
<div if="isLoggedIn">
  <div if="hasPermission">
    Admin panel
  </div>
</div>
```

```
Visible solo si:
  isLoggedIn = true AND hasPermission = true
```

### OR Logic (Workaround)

```typescript
class ViewModel {
  showOption1 = false;
  showOption2 = true;
  
  get showAny() {
    return this.showOption1 || this.showOption2;
  }
}
```

```html
<div if="showAny">One of the options is true</div>
```

## Comparación con Otros Frameworks

### Vue.js

```html
<!-- Vue -->
<div v-if="isVisible">Content</div>
<div v-show="isVisible">Content</div>
```

- `v-if`: Remueve del DOM
- `v-show`: Usa `display: none`

PelelaJS `if` es equivalente a Vue `v-show`.

### React

```jsx
{isVisible && <div>Content</div>}
{isVisible ? <div>Shown</div> : <div>Hidden</div>}
```

React usa conditional rendering en JSX.

### Angular

```html
<div *ngIf="isVisible">Content</div>
```

Angular `*ngIf` remueve del DOM.

## Performance

### Setup Performance

```
setupIfBindings() para 50 bindings:
  ├─ querySelectorAll(): ~1ms
  ├─ Loop 50 elementos: ~2ms
  │   ├─ getAttribute(): ~0.01ms cada uno
  │   ├─ assertViewModelProperty(): ~0.02ms cada uno
  │   └─ Read style.display: ~0.01ms cada uno
  │
  └─ Total: ~3ms
```

### Render Performance

```
renderIfBindings() para 50 bindings:
  ├─ Loop 50 bindings: ~2ms
  │   ├─ getNestedProperty(): ~0.01ms cada uno
  │   ├─ Boolean(): <0.01ms
  │   └─ Set style.display: ~0.02ms cada uno
  │
  └─ Total: ~2ms
```

**Muy performante.**

### Comparación: display vs remove

```
display: none (PelelaJS):
  Hide: 0.02ms
  Show: 0.02ms
  Memory: elemento permanece en DOM

Remove del DOM:
  Hide: ~0.5ms (removeChild)
  Show: ~1ms (appendChild + re-bind)
  Memory: elemento removido
```

PelelaJS es más rápido para toggle frecuente.

## Testing

```typescript
describe("if binding", () => {
  it("should setup if binding", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div if="isVisible"></div>';
    
    const vm = createReactiveViewModel({ isVisible: true }, () => {});
    const bindings = setupIfBindings(root, vm);
    
    expect(bindings.length).toBe(1);
    expect(bindings[0].propertyName).toBe("isVisible");
  });

  it("should show element when true", () => {
    const div = document.createElement("div");
    const binding: IfBinding = {
      element: div,
      propertyName: "isVisible",
      originalDisplay: ""
    };
    
    const vm = { isVisible: true };
    renderSingleIfBinding(binding, vm);
    
    expect(div.style.display).toBe("");
  });

  it("should hide element when false", () => {
    const div = document.createElement("div");
    const binding: IfBinding = {
      element: div,
      propertyName: "isVisible",
      originalDisplay: ""
    };
    
    const vm = { isVisible: false };
    renderSingleIfBinding(binding, vm);
    
    expect(div.style.display).toBe("none");
  });

  it("should preserve original display", () => {
    const div = document.createElement("div");
    div.style.display = "flex";
    
    const binding: IfBinding = {
      element: div,
      propertyName: "isVisible",
      originalDisplay: "flex"
    };
    
    const vm = { isVisible: false };
    renderSingleIfBinding(binding, vm);
    expect(div.style.display).toBe("none");
    
    vm.isVisible = true;
    renderSingleIfBinding(binding, vm);
    expect(div.style.display).toBe("flex");
  });
});
```

## Limitaciones

### Limitación 1: No Lee Display de CSS

```html
<div if="isVisible" class="flex-container"></div>
```

```css
.flex-container { display: flex; }
```

```
originalDisplay = "" (no lee de CSS)

Cuando se muestra:
  display = "" (no "flex")
```

**Solución:** Usar inline style:

```html
<div if="isVisible" style="display: flex" class="flex-container"></div>
```

### Limitación 2: No Soporta Expresiones

```html
<!-- NO funciona -->
<div if="count > 0">Has items</div>
<div if="!isVisible">Hidden when visible</div>
<div if="user && user.isActive">Active user</div>
```

**Solución:** Usar computed properties:

```typescript
get hasItems() {
  return this.count > 0;
}

get isHidden() {
  return !this.isVisible;
}

get isActiveUser() {
  return this.user && this.user.isActive;
}
```

### Limitación 3: Arrays Vacíos son Truthy

```html
<div if="items">Has items</div>
```

```typescript
viewModel.items = [];
```

```
Boolean([]) = true
→ Visible (incorrecto!)
```

**Solución:**

```typescript
get hasItems() {
  return this.items.length > 0;
}
```

## Conclusión

El binding `if` de PelelaJS:

1. **Es simple:** Solo 3 propiedades en el binding
2. **Es performante:** Usa `display: none`
3. **Preserva display original:** Con `originalDisplay`
4. **Es predecible:** Usa `Boolean()` para conversión
5. **Es limitado:** No soporta expresiones

Es adecuado para conditional rendering simple y performante.

## Referencias

- [Sistema de Binding General](./01-binding-system.md)
- [Dependency Tracker](./02-dependency-tracker.md)
- [bind-value](./03-bind-value.md)
- [Propiedades Anidadas](../05-nested-properties/01-nested-properties.md)

