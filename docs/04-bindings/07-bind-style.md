# 4.3.4 bind-style

## Introducción

El binding `bind-style` permite aplicar estilos inline dinámicos a elementos basándose en un objeto de estilos en el ViewModel.

## Syntax HTML

```html
<elemento bind-style="propertyName"></elemento>
```

## Código Fuente

```typescript
function setupSingleStyleBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): StyleBinding | null {
  const propertyName = element.getAttribute("bind-style");
  if (!propertyName || !propertyName.trim()) return null;

  assertViewModelProperty(viewModel, propertyName, "bind-style", element);

  return {
    element,
    propertyName,
  };
}

function renderSingleStyleBinding<T extends object>(
  binding: StyleBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName);

  if (!value || typeof value !== "object") {
    binding.element.removeAttribute("style");
    return;
  }

  const styleObj = value as Record<string, string | number>;
  const elStyle = binding.element.style;

  elStyle.cssText = "";

  for (const [key, v] of Object.entries(styleObj)) {
    if (v === undefined || v === null) continue;
    const cssValue = String(v);
    (elStyle as any)[key as any] = cssValue;
  }
}
```

## Tipo StyleBinding

```typescript
export type StyleBinding = {
  element: HTMLElement;
  propertyName: string;
};
```

## Formato de Objeto de Estilos

```typescript
viewModel.customStyle = {
  color: "red",
  fontSize: "16px",
  backgroundColor: "#f0f0f0",
  padding: "10px",
  border: "1px solid black"
};
```

```html
<div bind-style="customStyle">Styled content</div>
```

**Resultado:**
```html
<div style="color: red; font-size: 16px; background-color: #f0f0f0; padding: 10px; border: 1px solid black;">Styled content</div>
```

## Propiedades CSS

### camelCase a kebab-case

JavaScript usa camelCase, CSS usa kebab-case:

```typescript
viewModel.style = {
  backgroundColor: "blue",    // → background-color
  fontSize: "20px",           // → font-size
  marginTop: "10px"           // → margin-top
};
```

El browser convierte automáticamente:
```javascript
element.style.backgroundColor = "blue"
  ↓
element.style["background-color"] = "blue"
```

### Valores Numéricos

```typescript
viewModel.style = {
  width: 300,        // → "300px" (algunos browsers)
  height: 200,       // → "200px"
  opacity: 0.5,      // → "0.5"
  zIndex: 10         // → "10"
};
```

**Mejor práctica:** Siempre usar strings con unidades:

```typescript
viewModel.style = {
  width: "300px",
  height: "200px",
  opacity: "0.5",
  zIndex: "10"
};
```

## Limpieza de Estilos

### Valor null/undefined

```typescript
viewModel.customStyle = null;
```

```
renderStyleBinding:
  value = null
  !value || typeof value !== "object"? true
  element.removeAttribute("style")
```

**Resultado:** Todos los estilos inline eliminados.

### Propiedad null en objeto

```typescript
viewModel.style = {
  color: "red",
  fontSize: null,      // Ignorado
  padding: undefined   // Ignorado
};
```

```
for (const [key, v] of Object.entries(style)) {
  if (v === undefined || v === null) continue;
  ...
}
```

Solo aplica `color: red`.

## Limpieza con cssText

```typescript
elStyle.cssText = "";
```

**Propósito:** Limpiar todos los estilos previos antes de aplicar los nuevos.

```
Estado inicial:
  <div style="color: blue; padding: 10px;">

Render con nuevo style:
  1. elStyle.cssText = ""  → <div style="">
  2. Aplicar nuevos estilos → <div style="color: red;">
```

Sin limpiar, los estilos se acumularían.

## Ejemplos Completos

### Posicionamiento Dinámico

```typescript
class ViewModel {
  x = 0;
  y = 0;
  
  get position() {
    return {
      position: "absolute",
      left: `${this.x}px`,
      top: `${this.y}px`
    };
  }
  
  move(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }
}
```

```html
<div bind-style="position">Draggable</div>
```

### Tema Dinámico

```typescript
class ViewModel {
  isDark = false;
  
  get themeStyles() {
    return {
      backgroundColor: this.isDark ? "#333" : "#fff",
      color: this.isDark ? "#fff" : "#333",
      borderColor: this.isDark ? "#666" : "#ccc"
    };
  }
  
  toggleTheme() {
    this.isDark = !this.isDark;
  }
}
```

```html
<div bind-style="themeStyles">Themed content</div>
```

### Progress Bar

```typescript
class ViewModel {
  progress = 0;
  
  get progressStyle() {
    return {
      width: `${this.progress}%`,
      backgroundColor: this.progress === 100 ? "green" : "blue"
    };
  }
  
  increment() {
    if (this.progress < 100) {
      this.progress += 10;
    }
  }
}
```

```html
<div class="progress-container">
  <div bind-style="progressStyle" class="progress-bar"></div>
</div>
```

## Testing

```typescript
it("should apply styles from object", () => {
  const div = document.createElement("div");
  const binding: StyleBinding = {
    element: div,
    propertyName: "customStyle"
  };
  
  const vm = {
    customStyle: {
      color: "red",
      fontSize: "16px"
    }
  };
  
  renderSingleStyleBinding(binding, vm);
  
  expect(div.style.color).toBe("red");
  expect(div.style.fontSize).toBe("16px");
});

it("should remove styles when null", () => {
  const div = document.createElement("div");
  div.style.color = "red";
  
  const binding: StyleBinding = {
    element: div,
    propertyName: "customStyle"
  };
  
  const vm = { customStyle: null };
  
  renderSingleStyleBinding(binding, vm);
  
  expect(div.getAttribute("style")).toBeNull();
});

it("should skip null/undefined values", () => {
  const div = document.createElement("div");
  const binding: StyleBinding = {
    element: div,
    propertyName: "customStyle"
  };
  
  const vm = {
    customStyle: {
      color: "red",
      fontSize: null,
      padding: undefined
    }
  };
  
  renderSingleStyleBinding(binding, vm);
  
  expect(div.style.color).toBe("red");
  expect(div.style.fontSize).toBe("");
  expect(div.style.padding).toBe("");
});
```

## Limitaciones

### No Preserva Estilos Inline Existentes

```html
<div style="margin: 10px;" bind-style="customStyle">Content</div>
```

```typescript
viewModel.customStyle = { color: "red" };
```

**Resultado:** El `margin: 10px` se pierde porque `cssText = ""` limpia todo.

**Solución:** Incluir en el ViewModel:

```typescript
viewModel.customStyle = {
  margin: "10px",
  color: "red"
};
```

### No Lee Estilos de CSS Classes

```html
<div class="container" bind-style="customStyle"></div>
```

```css
.container { padding: 20px; }
```

El bind-style no "ve" el padding de la clase.

## Conclusión

`bind-style` permite estilos inline dinámicos con sintaxis de objeto JavaScript, ideal para animaciones, posicionamiento dinámico, y temas.

## Referencias

- [Sistema de Binding General](./01-binding-system.md)
- [bind-class](./05-bind-class.md)
- [bind-value](./03-bind-value.md)

