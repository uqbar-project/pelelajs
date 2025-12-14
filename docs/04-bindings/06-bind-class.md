# 4.3.3 bind-class

## Introducción

El binding `bind-class` permite aplicar clases CSS dinámicas a elementos basándose en el estado del ViewModel. Soporta múltiples formatos: string, array, y objeto con condiciones.

## Syntax HTML

```html
<elemento bind-class="propertyName"></elemento>
```

## Código Fuente

```typescript
function setupSingleClassBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ClassBinding | null {
  const propertyName = element.getAttribute("bind-class");
  if (!propertyName || !propertyName.trim()) return null;

  assertViewModelProperty(viewModel, propertyName, "bind-class", element);

  return {
    element,
    propertyName,
    staticClassName: element.className,
  };
}

function renderSingleClassBinding<T extends object>(
  binding: ClassBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName);

  const staticClasses = binding.staticClassName.trim();
  let dynamicClasses = "";

  if (typeof value === "string") {
    dynamicClasses = value;
  } else if (Array.isArray(value)) {
    dynamicClasses = value.filter(Boolean).join(" ");
  } else if (value && typeof value === "object") {
    dynamicClasses = Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([name]) => name)
      .join(" ");
  }

  const classes = [staticClasses, dynamicClasses].filter(Boolean).join(" ");
  binding.element.className = classes;
}
```

## Tipo ClassBinding

```typescript
export type ClassBinding = {
  element: HTMLElement;
  propertyName: string;
  staticClassName: string;
};
```

## Formato 1: String

```typescript
viewModel.activeClass = "active highlighted";
```

```html
<div bind-class="activeClass">Content</div>
```

**Resultado:**
```html
<div class="active highlighted">Content</div>
```

## Formato 2: Array

```typescript
viewModel.classList = ["btn", "btn-primary", "large"];
```

```html
<button bind-class="classList">Click me</button>
```

**Resultado:**
```html
<button class="btn btn-primary large">Click me</button>
```

### Array con Falsy Values

```typescript
viewModel.classList = ["btn", null, "primary", false, "", "large"];
```

```
value.filter(Boolean)
  └─► ["btn", "primary", "large"]
  
.join(" ")
  └─► "btn primary large"
```

## Formato 3: Objeto (Condicional)

```typescript
viewModel.buttonState = {
  active: true,
  disabled: false,
  large: true,
  "btn-primary": true
};
```

```html
<button bind-class="buttonState">Click me</button>
```

```
Object.entries(buttonState)
  └─► [["active", true], ["disabled", false], ["large", true], ["btn-primary", true]]

.filter(([, enabled]) => Boolean(enabled))
  └─► [["active", true], ["large", true], ["btn-primary", true]]

.map(([name]) => name)
  └─► ["active", "large", "btn-primary"]

.join(" ")
  └─► "active large btn-primary"
```

**Resultado:**
```html
<button class="active large btn-primary">Click me</button>
```

## Preservación de Clases Estáticas

```html
<div class="container fixed" bind-class="dynamicClass">Content</div>
```

```typescript
viewModel.dynamicClass = "active";
```

```
Setup:
  staticClassName = "container fixed"

Render:
  staticClasses = "container fixed"
  dynamicClasses = "active"
  
  classes = ["container fixed", "active"].join(" ")
         = "container fixed active"
  
  element.className = "container fixed active"
```

**Resultado:**
```html
<div class="container fixed active">Content</div>
```

## Ejemplos Completos

### Toggle Class

```typescript
class ViewModel {
  isActive = false;
  
  get buttonClass() {
    return { active: this.isActive };
  }
  
  toggle() {
    this.isActive = !this.isActive;
  }
}
```

```html
<button bind-class="buttonClass" click="toggle">Toggle</button>
```

### Multiple States

```typescript
class ViewModel {
  status = "loading";
  
  get statusClasses() {
    return {
      loading: this.status === "loading",
      success: this.status === "success",
      error: this.status === "error"
    };
  }
}
```

```html
<div bind-class="statusClasses">Status message</div>
```

## Testing

```typescript
it("should apply string class", () => {
  const div = document.createElement("div");
  const binding: ClassBinding = {
    element: div,
    propertyName: "className",
    staticClassName: ""
  };
  
  const vm = { className: "active highlighted" };
  renderSingleClassBinding(binding, vm);
  
  expect(div.className).toBe("active highlighted");
});

it("should apply array classes", () => {
  const div = document.createElement("div");
  const binding: ClassBinding = {
    element: div,
    propertyName: "classList",
    staticClassName: ""
  };
  
  const vm = { classList: ["btn", "primary"] };
  renderSingleClassBinding(binding, vm);
  
  expect(div.className).toBe("btn primary");
});

it("should apply conditional classes", () => {
  const div = document.createElement("div");
  const binding: ClassBinding = {
    element: div,
    propertyName: "classes",
    staticClassName: ""
  };
  
  const vm = { classes: { active: true, disabled: false } };
  renderSingleClassBinding(binding, vm);
  
  expect(div.className).toBe("active");
});

it("should preserve static classes", () => {
  const div = document.createElement("div");
  const binding: ClassBinding = {
    element: div,
    propertyName: "dynamicClass",
    staticClassName: "static"
  };
  
  const vm = { dynamicClass: "dynamic" };
  renderSingleClassBinding(binding, vm);
  
  expect(div.className).toBe("static dynamic");
});
```

## Conclusión

`bind-class` soporta 3 formatos flexibles y preserva clases estáticas, siendo ideal para aplicar estilos dinámicos condicionales.

## Referencias

- [Sistema de Binding General](./01-binding-system.md)
- [bind-value](./03-bind-value.md)
- [if](./04-if-binding.md)

