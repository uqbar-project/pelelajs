# 8. Sistema de Errores de PelelaJS

## Introducción

PelelaJS implementa un sistema de errores jerárquico basado en clases, donde todos los errores del framework heredan de `PelelaError`, la clase base abstracta. Este diseño permite un manejo de errores consistente, mensajes informativos, y soporte para error chaining (encadenamiento de errores).

## Jerarquía de Errores

```
┌────────────────────────────────────────────────────────────────┐
│                    ERROR HIERARCHY                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        Error (built-in)                        │
│                            │                                    │
│                            │                                    │
│                     PelelaError (abstract)                     │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐                │
│         │                  │                  │                │
│         │                  │                  │                │
│  PropertyValidationError   │         InvalidHandlerError       │
│                            │                                    │
│                   ViewModelRegistrationError                   │
│                                                                 │
│  CARACTERÍSTICAS                                               │
│  ─────────────────                                             │
│  • Mensajes informativos con contexto                          │
│  • Error chaining (cause)                                      │
│  • instanceof checks funcionan correctamente                   │
│  • Stack traces preservados                                    │
│  • Metadata específica por tipo                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 8.1 PelelaError (Clase Base)

### Propósito

Clase base abstracta para todos los errores del framework. No se instancia directamente, sino que sirve como base para errores específicos.

### Código Fuente

```typescript
export abstract class PelelaError extends Error {
  /**
   * @param message - The error message
   * @param options - Optional configuration
   * @param options.cause - The original error that caused this error to be thrown.
   *                        Use this when wrapping/re-throwing errors to preserve
   *                        the original stack trace. The cause will be available
   *                        via the standard `error.cause` property (ES2022+).
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

### Características

#### 1. Error Chaining (Cause)

```typescript
constructor(message: string, options?: ErrorOptions)
```

Soporta el parámetro `options.cause` (ES2022+) para preservar errores originales:

```typescript
try {
  riskyOperation();
} catch (error) {
  throw new PropertyValidationError('myProp', 'bind-value', 'VM', '<div>', {
    cause: error
  });
}
```

**Beneficio:** Mantiene el stack trace completo de la cadena de errores.

#### 2. Nombre Automático

```typescript
this.name = this.constructor.name
```

El nombre del error se establece automáticamente al nombre de la clase:

```typescript
class PropertyValidationError extends PelelaError { }

const error = new PropertyValidationError(...);
error.name  // "PropertyValidationError"
```

#### 3. Prototype Chain Fix

```typescript
Object.setPrototypeOf(this, new.target.prototype)
```

**Propósito:** Asegurar que `instanceof` funcione correctamente al transpilar a ES5.

```typescript
const error = new PropertyValidationError(...);

error instanceof Error               // true
error instanceof PelelaError         // true
error instanceof PropertyValidationError  // true
```

Sin esta línea, los checks de `instanceof` podrían fallar en algunos entornos.

### Diagrama de Constructor

```
new PropertyValidationError("prop", "bind-value", "VM", "<div>")
    │
    ├─► PelelaError.constructor(message, options)
    │     │
    │     ├─► super(message, options)  [Error constructor]
    │     │     └─► Establece: this.message, this.stack, this.cause
    │     │
    │     ├─► this.name = this.constructor.name
    │     │     └─► "PropertyValidationError"
    │     │
    │     └─► Object.setPrototypeOf(this, new.target.prototype)
    │           └─► Corrige prototype chain
    │
    └─► PropertyValidationError.constructor(...)
          └─► Establece campos específicos (propertyName, bindingKind, etc.)
```

### Abstract Class

```typescript
export abstract class PelelaError extends Error { }
```

No se puede instanciar directamente:

```typescript
new PelelaError("message");  // ✗ Error: Cannot create instance of abstract class
```

Debe heredarse:

```typescript
class MyCustomError extends PelelaError {
  constructor(message: string) {
    super(message);
  }
}

new MyCustomError("message");  // ✓ OK
```

## 8.2 PropertyValidationError

### Propósito

Error lanzado cuando una propiedad referenciada en un binding no existe en el ViewModel.

### Código Fuente

```typescript
export type BindingKind = "bind-class" | "bind-value" | "bind-style" | 'for-each' | "if";

export class PropertyValidationError extends PelelaError {
  constructor(
    public readonly propertyName: string,
    public readonly bindingKind: BindingKind,
    public readonly viewModelName: string,
    public readonly elementSnippet: string,
    options?: ErrorOptions
  ) {
    super(
      `[pelela] Unknown property "${propertyName}" used in ${bindingKind} on: ${elementSnippet}. ` +
        `Make sure your view model "${viewModelName}" defines it.`,
      options
    )
  }
}
```

### Campos Públicos

```typescript
error.propertyName: string      // Nombre de la propiedad faltante
error.bindingKind: BindingKind  // Tipo de binding donde ocurrió
error.viewModelName: string     // Nombre del ViewModel
error.elementSnippet: string    // Fragmento HTML del elemento
error.message: string           // Mensaje completo generado
error.cause?: unknown           // Error original (si existe)
```

### Formato del Mensaje

```
[pelela] Unknown property "{propertyName}" used in {bindingKind} on: {elementSnippet}. 
Make sure your view model "{viewModelName}" defines it.
```

### Ejemplos

#### Ejemplo 1: bind-value

```typescript
class UserViewModel {
  username = "John";
}
```

```html
<div bind-value="userName"></div>  <!-- Typo: userName vs username -->
```

**Error lanzado:**

```typescript
new PropertyValidationError(
  "userName",
  "bind-value",
  "UserViewModel",
  '<div bind-value="userName"></div>'
)
```

**Mensaje:**

```
[pelela] Unknown property "userName" used in bind-value on: <div bind-value="userName"></div>. 
Make sure your view model "UserViewModel" defines it.
```

#### Ejemplo 2: Propiedad Anidada

```typescript
class ViewModel {
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
[pelela] Unknown property "user.profile.age" used in bind-value on: <div bind-value="user.profile.age"></div>. 
Make sure your view model "ViewModel" defines it.
```

#### Ejemplo 3: if Binding

```typescript
class ViewModel {
  isActive = true;
}
```

```html
<div if="active">Content</div>  <!-- Debería ser isActive -->
```

**Error:**

```
[pelela] Unknown property "active" used in if on: <div if="active">Content</div>. 
Make sure your view model "ViewModel" defines it.
```

#### Ejemplo 4: for-each

```typescript
class ViewModel {
  items = [1, 2, 3];
}
```

```html
<div for-each="item of todos">  <!-- Debería ser items -->
  <span bind-value="item"></span>
</div>
```

**Error:**

```
[pelela] Unknown property "todos" used in for-each on: <div for-each="item of todos">...</div>. 
Make sure your view model "ViewModel" defines it.
```

### Uso del Cause

```typescript
try {
  const value = getNestedProperty(viewModel, propertyName);
} catch (error) {
  throw new PropertyValidationError(
    propertyName,
    "bind-value",
    viewModel.constructor.name,
    element.outerHTML,
    { cause: error }
  );
}
```

El error original se preserva en `error.cause`.

### Catching Específico

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
    
    // Posible sugerencia de typo
    const suggestions = findSimilarProperties(
      error.viewModelName,
      error.propertyName
    );
    if (suggestions.length > 0) {
      console.error("  Did you mean:", suggestions.join(", "));
    }
  }
  throw error;
}
```

## 8.3 ViewModelRegistrationError

### Propósito

Error lanzado cuando hay problemas con el registro de ViewModels: duplicados o faltantes.

### Código Fuente

```typescript
export type RegistrationType = "duplicate" | "missing";

const REGISTRATION_ERROR_MESSAGES: Record<
  RegistrationType,
  (viewModelName: string) => string
> = {
  duplicate: (name) => `[pelela] View model "${name}" is already registered`,
  missing: (name) =>
    `[pelela] View model "${name}" is not registered. Did you call defineViewModel?`
}

export class ViewModelRegistrationError extends PelelaError {
  constructor(
    public readonly viewModelName: string,
    public readonly type: RegistrationType,
    options?: ErrorOptions
  ) {
    super(REGISTRATION_ERROR_MESSAGES[type](viewModelName), options)
  }
}
```

### Campos Públicos

```typescript
error.viewModelName: string       // Nombre del ViewModel
error.type: RegistrationType      // "duplicate" | "missing"
error.message: string             // Mensaje generado
error.cause?: unknown             // Error original (si existe)
```

### Tipo: "duplicate"

**Cuándo ocurre:** Al intentar registrar un ViewModel con un nombre ya usado.

```typescript
class AppViewModel { }

defineViewModel("AppViewModel", AppViewModel);
defineViewModel("AppViewModel", AppViewModel);  // ✗ Error
```

**Error lanzado:**

```typescript
new ViewModelRegistrationError("AppViewModel", "duplicate")
```

**Mensaje:**

```
[pelela] View model "AppViewModel" is already registered
```

**Dónde se lanza:**

```typescript
export function registerViewModel(
  name: string,
  ctor: ViewModelConstructor,
): void {
  if (viewModelRegistry.has(name)) {
    throw new ViewModelRegistrationError(name, "duplicate");
  }
  viewModelRegistry.set(name, ctor);
}
```

### Tipo: "missing"

**Cuándo ocurre:** Al hacer bootstrap sin haber registrado el ViewModel.

```html
<pelela view-model="AppViewModel">
```

```typescript
// No se llamó: defineViewModel("AppViewModel", AppViewModel)
bootstrap();  // ✗ Error
```

**Error lanzado:**

```typescript
new ViewModelRegistrationError("AppViewModel", "missing")
```

**Mensaje:**

```
[pelela] View model "AppViewModel" is not registered. Did you call defineViewModel?
```

**Dónde se lanza:**

```typescript
export function bootstrap(options: PelelaOptions = {}): void {
  const roots = document.querySelectorAll<PelelaElement>("[view-model]");
  
  for (const root of roots) {
    const name = root.getAttribute("view-model");
    if (!name) continue;

    const ctor = getViewModel(name);
    if (!ctor) {
      throw new ViewModelRegistrationError(name, "missing");
    }
    
    // ...
  }
}
```

### Diagrama de Flujos de Error

```
┌────────────────────────────────────────────────────────────────┐
│         ViewModelRegistrationError FLOW                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DUPLICATE                                                     │
│  ─────────                                                     │
│  defineViewModel("App", AppViewModel)                          │
│    └─► Registry: Map { "App" => class }                       │
│                                                                 │
│  defineViewModel("App", AppViewModel)                          │
│    │                                                           │
│    ├─► viewModelRegistry.has("App")? SÍ                       │
│    │                                                           │
│    └─► throw ViewModelRegistrationError("App", "duplicate")   │
│          └─► Message: "View model 'App' is already registered"│
│                                                                 │
│                                                                 │
│  MISSING                                                       │
│  ───────                                                       │
│  <pelela view-model="App">                                    │
│                                                                 │
│  bootstrap()                                                   │
│    │                                                           │
│    ├─► name = "App"                                           │
│    ├─► ctor = getViewModel("App")                            │
│    │     └─► undefined (no registrado)                        │
│    │                                                           │
│    └─► throw ViewModelRegistrationError("App", "missing")     │
│          └─► Message: "View model 'App' is not registered.    │
│               Did you call defineViewModel?"                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Catching Específico

```typescript
try {
  defineViewModel("AppViewModel", AppViewModel);
} catch (error) {
  if (error instanceof ViewModelRegistrationError) {
    if (error.type === "duplicate") {
      console.warn(`ViewModel ${error.viewModelName} already exists, skipping`);
      return;
    }
  }
  throw error;
}
```

### Prevención de Errores

#### Prevenir Duplicate

```typescript
if (!hasViewModel("AppViewModel")) {
  defineViewModel("AppViewModel", AppViewModel);
}
```

#### Prevenir Missing

```typescript
// main.ts
import { AppViewModel } from "./viewmodels/AppViewModel";

defineViewModel("AppViewModel", AppViewModel);  // Registrar primero
bootstrap();                                     // Luego bootstrap
```

## 8.4 InvalidHandlerError

### Propósito

Error lanzado cuando un handler de evento referenciado en HTML no es una función del ViewModel.

### Código Fuente

```typescript
export type EventType = "click" | "submit" | "change" | "input" | "keypress" | (string & {});

export class InvalidHandlerError extends PelelaError {
  constructor(
    public readonly handlerName: string,
    public readonly viewModelName: string,
    public readonly eventType?: EventType,
    options?: ErrorOptions
  ) {
    const eventInfo = eventType ? `${eventType}="..."` : 'an event handler'
    super(
      `[pelela] Handler "${handlerName}" defined in ${eventInfo} is not a function ` +
        `of view model "${viewModelName}".`,
      options
    )
  }
}
```

### Campos Públicos

```typescript
error.handlerName: string      // Nombre del handler
error.viewModelName: string    // Nombre del ViewModel
error.eventType?: EventType    // Tipo de evento (opcional)
error.message: string          // Mensaje generado
error.cause?: unknown          // Error original (si existe)
```

### Formato del Mensaje

**Con eventType:**

```
[pelela] Handler "{handlerName}" defined in {eventType}="..." is not a function 
of view model "{viewModelName}".
```

**Sin eventType:**

```
[pelela] Handler "{handlerName}" defined in an event handler is not a function 
of view model "{viewModelName}".
```

### Ejemplos

#### Ejemplo 1: Handler No Existe

```typescript
class ViewModel {
  count = 0;
  // incrementCount no existe
}
```

```html
<button click="incrementCount">+</button>
```

**Al hacer click:**

```typescript
const handler = viewModel["incrementCount"];
if (typeof handler !== "function") {
  throw new InvalidHandlerError("incrementCount", "ViewModel", "click");
}
```

**Mensaje:**

```
[pelela] Handler "incrementCount" defined in click="..." is not a function 
of view model "ViewModel".
```

#### Ejemplo 2: Handler No es Función

```typescript
class ViewModel {
  increment = "not a function";  // ✗ String, no función
}
```

```html
<button click="increment">+</button>
```

**Al hacer click:**

```
[pelela] Handler "increment" defined in click="..." is not a function 
of view model "ViewModel".
```

#### Ejemplo 3: Typo en Nombre

```typescript
class ViewModel {
  handleSubmit() { }
}
```

```html
<button click="handleSumit">Submit</button>  <!-- Typo: Sumit -->
```

**Al hacer click:**

```
[pelela] Handler "handleSumit" defined in click="..." is not a function 
of view model "ViewModel".
```

### Dónde se Lanza

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
      throw new InvalidHandlerError(
        handlerName,
        viewModel.constructor?.name ?? "Unknown",
        "click"
      );
    }

    handler.call(viewModel, event);
  });
}
```

**Nota:** El error se lanza **en runtime** (al hacer click), no en setup.

### EventType Opcional

```typescript
eventType?: EventType
```

Si no se proporciona, el mensaje usa "an event handler" genérico:

```typescript
new InvalidHandlerError("handler", "VM")
```

```
[pelela] Handler "handler" defined in an event handler is not a function 
of view model "VM".
```

### Catching

```typescript
element.addEventListener("click", (event) => {
  try {
    const handler = viewModel[handlerName];
    
    if (typeof handler !== "function") {
      throw new InvalidHandlerError(handlerName, viewModel.constructor.name, "click");
    }
    
    handler.call(viewModel, event);
  } catch (error) {
    if (error instanceof InvalidHandlerError) {
      console.error("Invalid handler:", error.handlerName);
      console.error("Check your ViewModel:", error.viewModelName);
    }
    throw error;
  }
});
```

## Error Chaining en Profundidad

### Concepto

Error chaining permite preservar el stack trace original al re-lanzar o envolver errores.

```
┌────────────────────────────────────────────────────────────────┐
│                    ERROR CHAINING                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Error Original (Root Cause)                                   │
│    │                                                           │
│    │ cause                                                     │
│    ▼                                                           │
│  Error Intermedio                                              │
│    │                                                           │
│    │ cause                                                     │
│    ▼                                                           │
│  Error Final (Top-Level)                                       │
│                                                                 │
│  Beneficio: Stack trace completo preservado                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Ejemplo 1: Envolver Error de Red

```typescript
async function fetchUserData(userId: string) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new PropertyValidationError(
      "userData",
      "bind-value",
      "UserViewModel",
      "<div>",
      { cause: error instanceof Error ? error : undefined }
    );
  }
}
```

**Resultado:**

```typescript
try {
  await fetchUserData("123");
} catch (error) {
  console.log(error.message);
  // [pelela] Unknown property "userData" used in bind-value...
  
  console.log(error.cause);
  // Error: HTTP 404
  
  console.log(error.cause.stack);
  // Stack trace original preservado
}
```

### Ejemplo 2: Cadena de 3 Niveles

```typescript
// Nivel 1: Error de dominio
class DatabaseError extends Error {
  constructor(message: string, cause?: Error) {
    super(message, { cause });
  }
}

// Nivel 2: Error de aplicación
class ValidationError extends Error {
  constructor(message: string, cause?: Error) {
    super(message, { cause });
  }
}

// Nivel 3: Error de framework
function bootstrap() {
  try {
    validateViewModel();
  } catch (error) {
    throw new PropertyValidationError(
      "data",
      "bind-value",
      "ViewModel",
      "<div>",
      { cause: error instanceof Error ? error : undefined }
    );
  }
}

function validateViewModel() {
  try {
    queryDatabase();
  } catch (error) {
    throw new ValidationError("Data validation failed", error as Error);
  }
}

function queryDatabase() {
  throw new DatabaseError("Connection timeout");
}
```

**Resultado:**

```typescript
try {
  bootstrap();
} catch (error) {
  console.log(error.name);
  // PropertyValidationError
  
  console.log(error.cause.name);
  // ValidationError
  
  console.log(error.cause.cause.name);
  // DatabaseError
}
```

### Navegar la Cadena

```typescript
function printErrorChain(error: Error, depth = 0) {
  const indent = "  ".repeat(depth);
  console.log(`${indent}${error.name}: ${error.message}`);
  
  if (error.cause instanceof Error) {
    printErrorChain(error.cause, depth + 1);
  }
}

try {
  bootstrap();
} catch (error) {
  if (error instanceof Error) {
    printErrorChain(error);
  }
}
```

**Output:**

```
PropertyValidationError: [pelela] Unknown property "data"...
  ValidationError: Data validation failed
    DatabaseError: Connection timeout
```

## instanceof Checks

### Por qué Funcionan

```typescript
Object.setPrototypeOf(this, new.target.prototype)
```

Esta línea asegura que la cadena de prototipos sea correcta.

### Verificaciones Múltiples

```typescript
const error = new PropertyValidationError("prop", "bind-value", "VM", "<div>");

error instanceof Error                        // true
error instanceof PelelaError                  // true
error instanceof PropertyValidationError      // true
error instanceof ViewModelRegistrationError   // false
```

### Catching por Tipo

```typescript
try {
  bootstrap();
} catch (error) {
  if (error instanceof PropertyValidationError) {
    console.error("Property issue:", error.propertyName);
  } else if (error instanceof ViewModelRegistrationError) {
    console.error("Registration issue:", error.viewModelName);
  } else if (error instanceof InvalidHandlerError) {
    console.error("Handler issue:", error.handlerName);
  } else if (error instanceof PelelaError) {
    console.error("Other Pelela error:", error.message);
  } else {
    console.error("Unknown error:", error);
  }
}
```

### Catch Genérico de PelelaError

```typescript
try {
  bootstrap();
} catch (error) {
  if (error instanceof PelelaError) {
    console.error("[PelelaJS Error]", error.message);
    // Manejar todos los errores del framework
  } else {
    console.error("[External Error]", error);
    // Errores fuera del framework
  }
}
```

## Testing de Errores

### Test Suite Completo

```typescript
import { describe, it, expect } from "vitest";
import {
  PelelaError,
  PropertyValidationError,
  ViewModelRegistrationError,
  InvalidHandlerError
} from "./errors";

describe("Error System", () => {
  describe("PropertyValidationError", () => {
    it("should create error with correct fields", () => {
      const error = new PropertyValidationError(
        "userName",
        "bind-value",
        "UserViewModel",
        '<div bind-value="userName"></div>'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PelelaError);
      expect(error).toBeInstanceOf(PropertyValidationError);
      
      expect(error.propertyName).toBe("userName");
      expect(error.bindingKind).toBe("bind-value");
      expect(error.viewModelName).toBe("UserViewModel");
      expect(error.elementSnippet).toBe('<div bind-value="userName"></div>');
      
      expect(error.message).toContain("userName");
      expect(error.message).toContain("UserViewModel");
      expect(error.message).toContain("bind-value");
    });

    it("should support cause", () => {
      const originalError = new Error("Original");
      const error = new PropertyValidationError(
        "prop",
        "bind-value",
        "VM",
        "<div>",
        { cause: originalError }
      );

      expect(error.cause).toBe(originalError);
    });
  });

  describe("ViewModelRegistrationError", () => {
    it("should create duplicate error", () => {
      const error = new ViewModelRegistrationError("AppViewModel", "duplicate");

      expect(error.viewModelName).toBe("AppViewModel");
      expect(error.type).toBe("duplicate");
      expect(error.message).toContain("already registered");
    });

    it("should create missing error", () => {
      const error = new ViewModelRegistrationError("AppViewModel", "missing");

      expect(error.viewModelName).toBe("AppViewModel");
      expect(error.type).toBe("missing");
      expect(error.message).toContain("not registered");
      expect(error.message).toContain("defineViewModel");
    });
  });

  describe("InvalidHandlerError", () => {
    it("should create error with event type", () => {
      const error = new InvalidHandlerError(
        "handleClick",
        "ViewModel",
        "click"
      );

      expect(error.handlerName).toBe("handleClick");
      expect(error.viewModelName).toBe("ViewModel");
      expect(error.eventType).toBe("click");
      expect(error.message).toContain("handleClick");
      expect(error.message).toContain('click="..."');
    });

    it("should create error without event type", () => {
      const error = new InvalidHandlerError("handler", "VM");

      expect(error.eventType).toBeUndefined();
      expect(error.message).toContain("an event handler");
    });
  });

  describe("Error chaining", () => {
    it("should preserve cause chain", () => {
      const rootError = new Error("Root");
      const middleError = new PropertyValidationError(
        "prop",
        "bind-value",
        "VM",
        "<div>",
        { cause: rootError }
      );
      const topError = new ViewModelRegistrationError(
        "VM",
        "missing",
        { cause: middleError }
      );

      expect(topError.cause).toBe(middleError);
      expect((topError.cause as Error).cause).toBe(rootError);
    });
  });
});
```

## Mejores Prácticas

### 1. Siempre Usar instanceof

```typescript
// ✓ Bueno
if (error instanceof PropertyValidationError) {
  // ...
}

// ✗ Malo
if (error.name === "PropertyValidationError") {
  // Frágil, puede romperse con minification
}
```

### 2. Preservar Cause Cuando Sea Relevante

```typescript
// ✓ Bueno
try {
  riskyOperation();
} catch (error) {
  throw new PropertyValidationError(
    "prop",
    "bind-value",
    "VM",
    "<div>",
    { cause: error instanceof Error ? error : undefined }
  );
}

// ✗ Malo - pierde contexto original
try {
  riskyOperation();
} catch (error) {
  throw new PropertyValidationError("prop", "bind-value", "VM", "<div>");
}
```

### 3. Catch Específico Antes que Genérico

```typescript
// ✓ Bueno
try {
  bootstrap();
} catch (error) {
  if (error instanceof PropertyValidationError) {
    // Manejo específico
  } else if (error instanceof PelelaError) {
    // Manejo genérico
  } else {
    // Otros errores
  }
}

// ✗ Malo - nunca llega a los específicos
try {
  bootstrap();
} catch (error) {
  if (error instanceof PelelaError) {
    // Atrapa todos los errores de Pelela
  } else if (error instanceof PropertyValidationError) {
    // Nunca se ejecuta
  }
}
```

### 4. Logging con Contexto

```typescript
function logPelelaError(error: PelelaError) {
  console.error(`[PelelaJS] ${error.name}`);
  console.error(`Message: ${error.message}`);
  
  if (error instanceof PropertyValidationError) {
    console.error(`Property: ${error.propertyName}`);
    console.error(`Binding: ${error.bindingKind}`);
    console.error(`ViewModel: ${error.viewModelName}`);
  } else if (error instanceof ViewModelRegistrationError) {
    console.error(`ViewModel: ${error.viewModelName}`);
    console.error(`Type: ${error.type}`);
  } else if (error instanceof InvalidHandlerError) {
    console.error(`Handler: ${error.handlerName}`);
    console.error(`ViewModel: ${error.viewModelName}`);
  }
  
  if (error.cause) {
    console.error(`Caused by:`, error.cause);
  }
}
```

## Resumen de Errores

| Error | Cuándo | Dónde | Prevención |
|-------|--------|-------|------------|
| **PropertyValidationError** | Propiedad no existe en ViewModel | Setup de bindings | Verificar nombres de propiedades |
| **ViewModelRegistrationError (duplicate)** | ViewModel ya registrado | `defineViewModel()` | Usar `hasViewModel()` antes |
| **ViewModelRegistrationError (missing)** | ViewModel no registrado | `bootstrap()` | Registrar antes de bootstrap |
| **InvalidHandlerError** | Handler no es función | Runtime (al hacer click) | Verificar que handlers existan |

## Conclusión

El sistema de errores de PelelaJS proporciona:

1. **Jerarquía clara** - Herencia de `PelelaError`
2. **Mensajes informativos** - Contexto completo del problema
3. **Error chaining** - Preservación de stack traces
4. **Type-safe catching** - `instanceof` funciona correctamente
5. **Metadata rica** - Campos específicos para cada tipo de error

Este diseño facilita el debugging y proporciona una excelente developer experience.

## Referencias

- [Sistema de Validación](../07-validation/01-assert-viewmodel-property.md)
- [Registro de ViewModels](../06-registry/01-viewmodel-registry.md)
- [Sistema de Bindings](../04-bindings/01-binding-system.md)
- [Bootstrap Process](../02-bootstrap/01-bootstrap-process.md)

