# 7.1 assertViewModelProperty - Sistema de Validación

## Introducción

`assertViewModelProperty` es la función de validación de PelelaJS que verifica que las propiedades referenciadas en bindings existen en el ViewModel. Proporciona mensajes de error informativos en desarrollo, ayudando a detectar typos y referencias incorrectas tempranamente.

## Propósito

```
┌────────────────────────────────────────────────────────────────┐
│              assertViewModelProperty PURPOSE                   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PROBLEMA                                                      │
│  ────────                                                      │
│  HTML: <div bind-value="userName">                            │
│  ViewModel: { username: "John" }  ← Typo! (userName ≠ username)│
│                                                                 │
│  Sin validación:                                               │
│    └─► Binding falla silenciosamente                          │
│    └─► Usuario ve elemento vacío                              │
│    └─► Difícil de debuggear                                   │
│                                                                 │
│  SOLUCIÓN                                                      │
│  ────────                                                      │
│  assertViewModelProperty(vm, "userName", "bind-value", el)    │
│    │                                                           │
│    ├─► Verifica: "userName" in vm?                            │
│    │     ├─ SÍ  → OK, continuar                               │
│    │     └─ NO  → throw PropertyValidationError               │
│    │                                                           │
│    └─► Error claro:                                           │
│         "Unknown property 'userName' in UserViewModel         │
│          for bind-value on <div bind-value='userName'>"       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Signatura

```typescript
function assertViewModelProperty<T extends object>(
  viewModel: T,
  propertyName: string,
  kind: BindingKind,
  element: Element,
): void
```

**Parámetros:**
- `viewModel`: Instancia del ViewModel a validar
- `propertyName`: Nombre de la propiedad (soporta dot notation)
- `kind`: Tipo de binding (`"bind-value"`, `"if"`, `"bind-class"`, etc.)
- `element`: Elemento DOM donde está el binding

**Retorna:** `void`

**Throws:** `PropertyValidationError` si la propiedad no existe

## Tipo BindingKind

```typescript
export type BindingKind =
  | "bind-value"
  | "if"
  | "bind-class"
  | "bind-style"
  | "for-each";
```

Representa los tipos de bindings que pueden validarse.

## Código Fuente Completo

### assertViewModelProperty

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

### hasNestedProperty (Helper Interno)

```typescript
function hasNestedProperty(obj: any, path: string): boolean {
  if (path in obj) {
    return true;
  }

  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return false;
    }
    
    if (!(part in current)) {
      return false;
    }
    
    current = current[part];
  }

  return true;
}
```

## Algoritmo Paso a Paso

```
assertViewModelProperty(viewModel, propertyName, kind, element)
    │
    ├─► 1. VALIDAR PROPIEDAD
    │      hasNestedProperty(viewModel, propertyName)
    │        │
    │        ├─► Fast path: path in viewModel?
    │        │     └─► SÍ → return true
    │        │
    │        └─► Nested path: Split por "."
    │              Para cada parte:
    │                ├─ current es null/undefined? → return false
    │                ├─ part in current? NO → return false
    │                └─ current = current[part]
    │              
    │              └─► return true
    │
    ├─► 2. SI EXISTE
    │      return (no error)
    │
    └─► 3. SI NO EXISTE
           │
           ├─► Generar snippet del elemento
           │     element.outerHTML
           │       └─► .replace(/\s+/g, " ")  (normalizar espacios)
           │       └─► .trim()
           │       └─► .slice(0, 100)  (máximo 100 chars)
           │
           └─► throw PropertyValidationError(
                 propertyName,
                 kind,
                 viewModel.constructor.name,
                 snippet
               )
```

## hasNestedProperty - Validación de Propiedades

### Caso 1: Propiedad Simple

```typescript
const viewModel = {
  username: "John",
  age: 30
};

hasNestedProperty(viewModel, "username")
```

```
1. Fast path: "username" in viewModel?
   └─► SÍ

return true
```

### Caso 2: Propiedad No Existe

```typescript
const viewModel = {
  username: "John"
};

hasNestedProperty(viewModel, "email")
```

```
1. Fast path: "email" in viewModel?
   └─► NO

2. Split: ["email"]

3. Loop:
   i = 0:
     current = viewModel
     "email" in current? NO
     
return false
```

### Caso 3: Propiedad Anidada (Dot Notation)

```typescript
const viewModel = {
  user: {
    profile: {
      name: "John"
    }
  }
};

hasNestedProperty(viewModel, "user.profile.name")
```

```
1. Fast path: "user.profile.name" in viewModel?
   └─► NO (no es una key literal)

2. Split: ["user", "profile", "name"]

3. Loop:
   i = 0: part = "user"
     current = viewModel
     current is null/undefined? NO
     "user" in current? SÍ
     current = current["user"] = { profile: { name: "John" } }
   
   i = 1: part = "profile"
     current = { profile: { name: "John" } }
     current is null/undefined? NO
     "profile" in current? SÍ
     current = current["profile"] = { name: "John" }
   
   i = 2: part = "name"
     current = { name: "John" }
     current is null/undefined? NO
     "name" in current? SÍ
     current = current["name"] = "John"

return true
```

### Caso 4: Path Inválido (Propiedad Intermedia No Existe)

```typescript
const viewModel = {
  user: {
    name: "John"
  }
};

hasNestedProperty(viewModel, "user.profile.bio")
```

```
1. Fast path: NO

2. Split: ["user", "profile", "bio"]

3. Loop:
   i = 0: part = "user"
     "user" in current? SÍ
     current = { name: "John" }
   
   i = 1: part = "profile"
     "profile" in current? NO
     
return false
```

### Caso 5: Intermediate Null

```typescript
const viewModel = {
  user: null
};

hasNestedProperty(viewModel, "user.name")
```

```
1. Fast path: NO

2. Split: ["user", "name"]

3. Loop:
   i = 0: part = "user"
     "user" in current? SÍ
     current = null
   
   i = 1: part = "name"
     current is null/undefined? SÍ
     
return false
```

### Caso 6: Propiedad Heredada

```typescript
class Parent {
  parentProp = "value";
}

class Child extends Parent {
  childProp = "value";
}

const viewModel = new Child();

hasNestedProperty(viewModel, "parentProp")
```

```
1. Fast path: "parentProp" in viewModel?
   └─► SÍ (el operador 'in' verifica prototype chain)

return true
```

## Generación de Snippet

### Propósito del Snippet

Incluir un extracto del HTML en el error para ayudar a identificar el elemento problemático.

```typescript
const snippet = element.outerHTML.replace(/\s+/g, " ").trim().slice(0, 100);
```

### Transformaciones

```
element.outerHTML
    │
    ├─► .replace(/\s+/g, " ")
    │     Normalizar múltiples espacios/saltos de línea a un solo espacio
    │
    ├─► .trim()
    │     Remover espacios al inicio/final
    │
    └─► .slice(0, 100)
          Limitar a 100 caracteres
```

### Ejemplos de Snippet

#### Ejemplo 1: Elemento Simple

```html
<div bind-value="username">Hello</div>
```

```typescript
element.outerHTML = '<div bind-value="username">Hello</div>'

.replace(/\s+/g, " ") → '<div bind-value="username">Hello</div>'
.trim() → '<div bind-value="username">Hello</div>'
.slice(0, 100) → '<div bind-value="username">Hello</div>'

snippet = '<div bind-value="username">Hello</div>'
```

#### Ejemplo 2: Elemento con Múltiples Espacios

```html
<div    class="container"
     bind-value="userName"
     id="test">
  Content
</div>
```

```typescript
element.outerHTML = '<div    class="container"\n     bind-value="userName"\n     id="test">\n  Content\n</div>'

.replace(/\s+/g, " ") → '<div class="container" bind-value="userName" id="test"> Content </div>'
.trim() → '<div class="container" bind-value="userName" id="test"> Content </div>'
.slice(0, 100) → '<div class="container" bind-value="userName" id="test"> Content </div>'

snippet = '<div class="container" bind-value="userName" id="test"> Content </div>'
```

#### Ejemplo 3: Elemento Muy Largo (Truncado)

```html
<div bind-value="prop">Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua</div>
```

```typescript
element.outerHTML = '<div bind-value="prop">Lorem ipsum dolor...[muy largo]...</div>'

.replace(/\s+/g, " ") → '<div bind-value="prop">Lorem ipsum dolor...[normalizado]...</div>'
.trim() → '<div bind-value="prop">Lorem ipsum dolor...[normalizado]...</div>'
.slice(0, 100) → '<div bind-value="prop">Lorem ipsum dolor sit amet consectetur adipiscing elit sed do ei'

snippet = '<div bind-value="prop">Lorem ipsum dolor sit amet consectetur adipiscing elit sed do ei'
```

El snippet se corta a 100 caracteres.

## PropertyValidationError

### Constructor

```typescript
export class PropertyValidationError extends PelelaError {
  constructor(
    public readonly propertyName: string,
    public readonly bindingKind: BindingKind,
    public readonly viewModelName: string,
    public readonly elementSnippet: string,
  ) {
    super(
      `[pelela] Unknown property "${propertyName}" in view model "${viewModelName}" ` +
      `for ${bindingKind} on ${elementSnippet}`,
    );
    this.name = "PropertyValidationError";
  }
}
```

### Mensaje de Error

```
Formato:
  [pelela] Unknown property "{propertyName}" in view model "{viewModelName}" 
  for {bindingKind} on {elementSnippet}

Ejemplo:
  [pelela] Unknown property "userName" in view model "UserViewModel" 
  for bind-value on <div bind-value="userName">Hello</div>
```

### Campos Públicos

```typescript
error.propertyName    // "userName"
error.bindingKind     // "bind-value"
error.viewModelName   // "UserViewModel"
error.elementSnippet  // '<div bind-value="userName">Hello</div>'
```

## Uso en Bindings

### bind-value

```typescript
function setupSingleValueBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ValueBinding | null {
  const propertyName = element.getAttribute("bind-value");
  if (!propertyName || !propertyName.trim()) return null;

  assertViewModelProperty(viewModel, propertyName, "bind-value", element);
  
  // ... resto del setup
}
```

### if

```typescript
function setupSingleIfBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): IfBinding | null {
  const propertyName = element.getAttribute("if");
  if (!propertyName || !propertyName.trim()) return null;

  assertViewModelProperty(viewModel, propertyName, "if", element);
  
  // ... resto del setup
}
```

### bind-class

```typescript
function setupSingleClassBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ClassBinding | null {
  const propertyName = element.getAttribute("bind-class");
  if (!propertyName || !propertyName.trim()) return null;

  assertViewModelProperty(viewModel, propertyName, "bind-class", element);
  
  // ... resto del setup
}
```

### bind-style

```typescript
function setupSingleStyleBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): StyleBinding | null {
  const propertyName = element.getAttribute("bind-style");
  if (!propertyName || !propertyName.trim()) return null;

  assertViewModelProperty(viewModel, propertyName, "bind-style", element);
  
  // ... resto del setup
}
```

### for-each

```typescript
function setupSingleForEachBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ForEachBinding | null {
  // ... parsing ...
  
  const { itemName, collectionName } = parsed;
  
  assertViewModelProperty(viewModel, collectionName, "for-each", element);
  
  // ... resto del setup
}
```

## Ejemplos Completos

### Ejemplo 1: Error en bind-value

```typescript
class UserViewModel {
  username = "John";  // Correcto: username
}

defineViewModel("UserViewModel", UserViewModel);
bootstrap();
```

```html
<pelela view-model="UserViewModel">
  <div bind-value="userName"></div>  <!-- Error: userName (typo) -->
</pelela>
```

**Error:**

```
PropertyValidationError: [pelela] Unknown property "userName" in view model "UserViewModel" 
for bind-value on <div bind-value="userName"></div>
```

**Fix:**

```html
<div bind-value="username"></div>
```

### Ejemplo 2: Error en Propiedad Anidada

```typescript
class UserViewModel {
  user = {
    profile: {
      name: "John"
    }
  };
}
```

```html
<div bind-value="user.profile.age"></div>  <!-- age no existe -->
```

**Error:**

```
PropertyValidationError: [pelela] Unknown property "user.profile.age" in view model "UserViewModel" 
for bind-value on <div bind-value="user.profile.age"></div>
```

### Ejemplo 3: Error en if Binding

```typescript
class ViewModel {
  isActive = true;
}
```

```html
<div if="active">Content</div>  <!-- Correcto: isActive -->
```

**Error:**

```
PropertyValidationError: [pelela] Unknown property "active" in view model "ViewModel" 
for if on <div if="active">Content</div>
```

### Ejemplo 4: Error en for-each

```typescript
class ViewModel {
  items = [1, 2, 3];
}
```

```html
<div for-each="item of todos">  <!-- Correcto: items -->
  <span bind-value="item"></span>
</div>
```

**Error:**

```
PropertyValidationError: [pelela] Unknown property "todos" in view model "ViewModel" 
for for-each on <div for-each="item of todos">...</div>
```

### Ejemplo 5: Propiedad Heredada (OK)

```typescript
class BaseViewModel {
  title = "Base Title";
}

class AppViewModel extends BaseViewModel {
  content = "Content";
}
```

```html
<pelela view-model="AppViewModel">
  <h1 bind-value="title"></h1>      <!-- OK: heredado -->
  <p bind-value="content"></p>       <!-- OK: propio -->
</pelela>
```

Ambos bindings funcionan correctamente.

### Ejemplo 6: Computed Property (OK)

```typescript
class ViewModel {
  firstName = "John";
  lastName = "Doe";
  
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}
```

```html
<div bind-value="fullName"></div>  <!-- OK: getter -->
```

Getters se detectan correctamente con el operador `in`.

## Escenarios Edge Case

### Caso 1: Propiedad con Valor undefined

```typescript
class ViewModel {
  username = undefined;
}
```

```html
<div bind-value="username"></div>
```

**Resultado:** ✓ OK

```
"username" in viewModel → true
```

La propiedad existe aunque su valor sea `undefined`.

### Caso 2: Propiedad No Inicializada

```typescript
class ViewModel {
  username: string;  // No inicializada
}
```

```html
<div bind-value="username"></div>
```

**Resultado:** ✗ Error

```
"username" in viewModel → false
```

La propiedad no está en la instancia.

**Fix:**

```typescript
class ViewModel {
  username: string = "";  // O null, o undefined
}
```

### Caso 3: Propiedad Dinámica

```typescript
class ViewModel {
  constructor() {
    (this as any).dynamicProp = "value";
  }
}
```

```html
<div bind-value="dynamicProp"></div>
```

**Resultado:** ✓ OK

La propiedad existe en la instancia después del constructor.

### Caso 4: Symbol Properties

```typescript
const mySymbol = Symbol("prop");

class ViewModel {
  [mySymbol] = "value";
}
```

```html
<div bind-value="mySymbol"></div>
```

**Resultado:** ✗ Error

Symbols no funcionan con dot notation en strings.

### Caso 5: Numeric Properties

```typescript
class ViewModel {
  0 = "first";
  1 = "second";
}
```

```html
<div bind-value="0"></div>
```

**Resultado:** ✓ OK

```
"0" in viewModel → true
```

Funciona, pero es poco común.

### Caso 6: Propiedad con Espacios (Inválida en HTML)

```html
<div bind-value="user name"></div>
```

HTML parsea esto como:
```
bind-value = "user"
name (otro atributo) = ""
```

No llega a validación con "user name" completo.

## Testing

### Test Suite Completo

```typescript
import { describe, it, expect } from "vitest";
import { assertViewModelProperty } from "./assertViewModelProperty";
import { PropertyValidationError } from "../errors/index";

class TestViewModel {
  existingProperty = "value";
  user = {
    name: "John",
    profile: {
      bio: "Hello",
    },
  };
}

describe("assertViewModelProperty", () => {
  it("should not throw error if property exists", () => {
    const viewModel = new TestViewModel();
    const element = document.createElement("div");
    element.setAttribute("bind-value", "existingProperty");

    expect(() => {
      assertViewModelProperty(viewModel, "existingProperty", "bind-value", element);
    }).not.toThrow();
  });

  it("should throw error if property does not exist", () => {
    const viewModel = new TestViewModel();
    const element = document.createElement("div");
    element.setAttribute("bind-value", "nonExistent");

    expect(() => {
      assertViewModelProperty(viewModel, "nonExistent", "bind-value", element);
    }).toThrow(PropertyValidationError);
  });

  it("should support nested properties with dot notation", () => {
    const viewModel = new TestViewModel();
    const element = document.createElement("div");

    expect(() => {
      assertViewModelProperty(viewModel, "user.name", "bind-value", element);
    }).not.toThrow();
  });

  it("should support deeply nested properties", () => {
    const viewModel = new TestViewModel();
    const element = document.createElement("div");

    expect(() => {
      assertViewModelProperty(viewModel, "user.profile.bio", "bind-value", element);
    }).not.toThrow();
  });

  it("should throw error if nested property path is invalid", () => {
    const viewModel = new TestViewModel();
    const element = document.createElement("div");

    expect(() => {
      assertViewModelProperty(viewModel, "user.missing", "bind-value", element);
    }).toThrow('[pelela] Unknown property "user.missing"');
  });

  it("should throw error if intermediate property is null", () => {
    const viewModel = { user: null as any };
    const element = document.createElement("div");

    expect(() => {
      assertViewModelProperty(viewModel, "user.name", "bind-value", element);
    }).toThrow('[pelela] Unknown property "user.name"');
  });

  it("should allow inherited properties", () => {
    class Parent {
      parentProp = "parent";
    }
    class Child extends Parent {
      childProp = "child";
    }

    const viewModel = new Child();
    const element = document.createElement("div");

    expect(() => {
      assertViewModelProperty(viewModel, "parentProp", "bind-value", element);
    }).not.toThrow();

    expect(() => {
      assertViewModelProperty(viewModel, "childProp", "bind-value", element);
    }).not.toThrow();
  });

  it("should truncate snippet if too long", () => {
    const viewModel = new TestViewModel();
    const element = document.createElement("div");
    element.innerHTML = "a".repeat(200);

    try {
      assertViewModelProperty(viewModel, "missing", "bind-value", element);
    } catch (error: any) {
      expect(error.message.length).toBeLessThan(300);
    }
  });
});
```

### Test de Diferentes Binding Kinds

```typescript
it("should work with all binding kinds", () => {
  const viewModel = new TestViewModel();
  const element = document.createElement("div");

  const bindingKinds: BindingKind[] = [
    "bind-value",
    "if",
    "bind-class",
    "bind-style",
    "for-each"
  ];

  for (const kind of bindingKinds) {
    expect(() => {
      assertViewModelProperty(viewModel, "existingProperty", kind, element);
    }).not.toThrow();
  }
});
```

## Performance

### Complejidad

| Operación | Complejidad | Descripción |
|-----------|-------------|-------------|
| Propiedad simple | O(1) | Operador `in` |
| Propiedad anidada | O(n) | n = profundidad del path |
| Split del path | O(m) | m = longitud del string |

### Benchmark

```typescript
console.time("validate 10000 simple properties");
for (let i = 0; i < 10000; i++) {
  assertViewModelProperty(viewModel, "username", "bind-value", element);
}
console.timeEnd("validate 10000 simple properties");

console.time("validate 10000 nested properties");
for (let i = 0; i < 10000; i++) {
  assertViewModelProperty(viewModel, "user.profile.name", "bind-value", element);
}
console.timeEnd("validate 10000 nested properties");
```

**Resultados típicos:**
```
validate 10000 simple properties: ~2ms
validate 10000 nested properties: ~5ms
```

Muy rápido, impacto negligible en bootstrap.

### Optimización: Fast Path

```typescript
if (path in obj) {
  return true;
}
```

Evita split innecesario para propiedades simples.

```
Propiedad "username":
  "username" in obj? SÍ → return true (sin split)

Propiedad "user.name":
  "user.name" in obj? NO → continuar con split
```

## Debugging

### Catch y Log

```typescript
try {
  bootstrap();
} catch (error) {
  if (error instanceof PropertyValidationError) {
    console.error("Property validation failed:");
    console.error("  Property:", error.propertyName);
    console.error("  ViewModel:", error.viewModelName);
    console.error("  Binding:", error.bindingKind);
    console.error("  Element:", error.elementSnippet);
  }
  throw error;
}
```

### Custom Error Handler

```typescript
function handlePropertyError(error: PropertyValidationError) {
  const suggestions = getSuggestions(
    error.propertyName,
    getAllProperties(error.viewModelName)
  );
  
  console.error(`Did you mean: ${suggestions.join(", ")}?`);
}
```

## Limitaciones

### 1. No Valida en Runtime (Solo en Setup)

La validación ocurre en setup, no en cada render:

```typescript
class ViewModel {
  obj = { name: "John" };
}

// Setup: OK
<div bind-value="obj.name"></div>

// Runtime:
viewModel.obj = null;  // Ahora obj.name fallará en render
```

No hay re-validación cuando `obj` cambia a `null`.

### 2. No Detecta Typos en Paths Complejos

```typescript
<div bind-value="user.profiel.name"></div>
```

Detecta el error, pero el mensaje no sugiere "profile" como corrección.

### 3. No Valida Tipos

```typescript
class ViewModel {
  items = "not an array";
}
```

```html
<div for-each="item of items"></div>
```

`assertViewModelProperty` pasa, pero `for-each` fallará al verificar `Array.isArray()`.

## Conclusión

`assertViewModelProperty` es una función de validación simple pero efectiva que:

1. **Valida propiedades** simples y anidadas
2. **Genera errores claros** con contexto completo
3. **Soporta herencia** y getters/setters
4. **Rendimiento excelente** con fast path para propiedades simples
5. **Ayuda en desarrollo** detectando typos tempranamente

Es una pieza clave del developer experience de PelelaJS, convirtiendo errores silenciosos en mensajes claros y accionables.

## Referencias

- [Sistema de Errores](../08-errors/01-error-system.md)
- [Propiedades Anidadas](../05-nested-properties/01-nested-properties.md)
- [Sistema de Bindings](../04-bindings/01-binding-system.md)
- [Bootstrap Process](../02-bootstrap/01-bootstrap-process.md)

