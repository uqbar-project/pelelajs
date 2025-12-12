# 6.1 ViewModelRegistry - Registro de ViewModels

## Introducción

El ViewModelRegistry es un sistema simple pero fundamental de PelelaJS. Actúa como un registro global que mapea nombres de ViewModels a sus constructores, permitiendo que el proceso de bootstrap instancie las clases correctas cuando encuentra elementos `<pelela view-model="...">`.

## Propósito

```
┌────────────────────────────────────────────────────────────────┐
│                   VIEWMODEL REGISTRY                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PROBLEMA                                                      │
│  ────────                                                      │
│  HTML: <pelela view-model="TodoViewModel">                    │
│  Bootstrap necesita: class TodoViewModel { ... }              │
│                                                                 │
│  ¿Cómo conectar el string "TodoViewModel" con la clase?      │
│                                                                 │
│  SOLUCIÓN                                                      │
│  ────────                                                      │
│  Registry: Map<string, Constructor>                           │
│                                                                 │
│  1. Registro:                                                  │
│     defineViewModel("TodoViewModel", TodoViewModel)            │
│       └─► Map.set("TodoViewModel", TodoViewModel)             │
│                                                                 │
│  2. Uso:                                                       │
│     getViewModel("TodoViewModel")                              │
│       └─► Map.get("TodoViewModel")                            │
│             └─► class TodoViewModel                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Arquitectura del Registry

```
┌──────────────────────────────────────────────────────────────┐
│                  REGISTRY ARCHITECTURE                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────┐                     │
│  │   viewModelRegistry (Map)          │                     │
│  ├────────────────────────────────────┤                     │
│  │                                     │                     │
│  │  "AppViewModel"  ──►  class App    │                     │
│  │  "TodoViewModel" ──►  class Todo   │                     │
│  │  "UserViewModel" ──►  class User   │                     │
│  │  "CartViewModel" ──►  class Cart   │                     │
│  │                                     │                     │
│  └────────────────────────────────────┘                     │
│           │              │               │                   │
│           ▼              ▼               ▼                   │
│   registerViewModel  getViewModel   hasViewModel            │
│   clearRegistry                                             │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Código Fuente Completo

### Variable Global

```typescript
const viewModelRegistry = new Map<string, ViewModelConstructor>();
```

**Scope:** Module-scoped, accesible solo a través de las funciones exportadas.

### Tipo ViewModelConstructor

```typescript
export type ViewModelConstructor<T = unknown> = {
  new (): T;
};
```

Representa una clase instanciable con constructor sin parámetros.

### Funciones Exportadas

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

export function getViewModel(name: string): ViewModelConstructor | undefined {
  return viewModelRegistry.get(name);
}

export function hasViewModel(name: string): boolean {
  return viewModelRegistry.has(name);
}

export function clearRegistry(): void {
  viewModelRegistry.clear();
}
```

## 1. registerViewModel (defineViewModel)

### Propósito

Registrar un ViewModel en el registry para uso posterior.

### Signatura

```typescript
function registerViewModel(
  name: string,
  ctor: ViewModelConstructor,
): void
```

**Parámetros:**
- `name`: Nombre único del ViewModel (debe coincidir con el atributo en HTML)
- `ctor`: Constructor de la clase

**Retorna:** `void`

**Throws:** `ViewModelRegistrationError` si el nombre ya está registrado

### Alias: defineViewModel

En el export público:

```typescript
export { registerViewModel as defineViewModel } from "./registry/viewModelRegistry";
```

Ambos nombres son válidos:
- `registerViewModel` - Nombre interno
- `defineViewModel` - Nombre público (más idiomático)

### Algoritmo

```
registerViewModel(name, ctor)
    │
    ├─► 1. CHECK DUPLICADO
    │      if (viewModelRegistry.has(name))
    │        throw ViewModelRegistrationError
    │
    └─► 2. REGISTRAR
           viewModelRegistry.set(name, ctor)
```

### Ejemplos

#### Ejemplo 1: Registro Simple

```typescript
class TodoViewModel {
  todos = [];
  
  addTodo() {
    this.todos.push({ title: "New Todo" });
  }
}

defineViewModel("TodoViewModel", TodoViewModel);
```

```
Ejecución:
1. viewModelRegistry.has("TodoViewModel")? NO

2. viewModelRegistry.set("TodoViewModel", TodoViewModel)

Estado del Registry:
  Map {
    "TodoViewModel" => class TodoViewModel { ... }
  }
```

#### Ejemplo 2: Múltiples Registros

```typescript
class AppViewModel { }
class UserViewModel { }
class CartViewModel { }

defineViewModel("AppViewModel", AppViewModel);
defineViewModel("UserViewModel", UserViewModel);
defineViewModel("CartViewModel", CartViewModel);
```

```
Estado del Registry:
  Map {
    "AppViewModel" => class AppViewModel,
    "UserViewModel" => class UserViewModel,
    "CartViewModel" => class CartViewModel
  }
```

#### Ejemplo 3: Registro Duplicado (Error)

```typescript
class TodoViewModel { }

defineViewModel("TodoViewModel", TodoViewModel);
defineViewModel("TodoViewModel", TodoViewModel);
```

```
Primera llamada:
  ✓ Registrado exitosamente

Segunda llamada:
  viewModelRegistry.has("TodoViewModel")? SÍ
  throw ViewModelRegistrationError("TodoViewModel", "duplicate")
```

**Error Output:**

```
ViewModelRegistrationError: View model "TodoViewModel" is already registered.
    at registerViewModel (viewModelRegistry.ts:11)
    at main.ts:15
```

### Convención de Nombres

**Recomendado:**

```typescript
class UserProfileViewModel { }
defineViewModel("UserProfileViewModel", UserProfileViewModel);
```

El nombre del string coincide con el nombre de la clase.

**Alternativa válida:**

```typescript
class UserProfileViewModel { }
defineViewModel("userProfile", UserProfileViewModel);
```

```html
<pelela view-model="userProfile">
```

**Importante:** El nombre debe coincidir **exactamente** con el atributo HTML.

### Case Sensitivity

```typescript
defineViewModel("AppViewModel", AppViewModel);
```

```html
<pelela view-model="AppViewModel">    ✓ Funciona
<pelela view-model="appviewmodel">    ✗ No encuentra
<pelela view-model="APPVIEWMODEL">    ✗ No encuentra
```

El matching es **case-sensitive**.

## 2. getViewModel

### Propósito

Obtener un constructor de ViewModel por su nombre.

### Signatura

```typescript
function getViewModel(name: string): ViewModelConstructor | undefined
```

**Parámetros:**
- `name`: Nombre del ViewModel a buscar

**Retorna:**
- El constructor si existe
- `undefined` si no está registrado

### Algoritmo

```
getViewModel(name)
    │
    └─► viewModelRegistry.get(name)
          └─► Constructor | undefined
```

Es un simple wrapper sobre `Map.get()`.

### Ejemplos

#### Ejemplo 1: ViewModel Existe

```typescript
class AppViewModel { }
defineViewModel("AppViewModel", AppViewModel);

const ctor = getViewModel("AppViewModel");
```

```
viewModelRegistry.get("AppViewModel")
    └─► class AppViewModel

ctor = class AppViewModel
```

Uso:

```typescript
if (ctor) {
  const instance = new ctor();
}
```

#### Ejemplo 2: ViewModel No Existe

```typescript
const ctor = getViewModel("NonExistent");
```

```
viewModelRegistry.get("NonExistent")
    └─► undefined

ctor = undefined
```

### Uso en Bootstrap

```typescript
export function bootstrap(options: PelelaOptions = {}): void {
  // ...
  
  for (const root of roots) {
    const name = root.getAttribute("view-model");
    if (!name) continue;

    const ctor = getViewModel(name);
    if (!ctor) {
      throw new ViewModelRegistrationError(name, "missing");
    }

    const instance = new ctor();
    // ...
  }
}
```

```
Flujo:
1. name = "AppViewModel" (del HTML)
2. ctor = getViewModel("AppViewModel")
3. ctor existe?
     ├─ SÍ → new ctor()
     └─ NO → throw ViewModelRegistrationError
```

## 3. hasViewModel

### Propósito

Verificar si un ViewModel está registrado sin obtener el constructor.

### Signatura

```typescript
function hasViewModel(name: string): boolean
```

**Parámetros:**
- `name`: Nombre del ViewModel a verificar

**Retorna:**
- `true` si está registrado
- `false` si no está registrado

### Algoritmo

```
hasViewModel(name)
    │
    └─► viewModelRegistry.has(name)
          └─► boolean
```

Wrapper sobre `Map.has()`.

### Ejemplos

#### Ejemplo 1: Check Antes de Registrar

```typescript
if (!hasViewModel("AppViewModel")) {
  defineViewModel("AppViewModel", AppViewModel);
}
```

Evita error de duplicado.

#### Ejemplo 2: Registro Condicional

```typescript
function registerIfNotExists(name: string, ctor: ViewModelConstructor) {
  if (hasViewModel(name)) {
    console.warn(`ViewModel "${name}" already registered, skipping`);
    return false;
  }
  
  defineViewModel(name, ctor);
  return true;
}
```

#### Ejemplo 3: Debugging

```typescript
console.log("Registered ViewModels:");
["AppViewModel", "TodoViewModel", "UserViewModel"].forEach(name => {
  console.log(`  ${name}: ${hasViewModel(name) ? "✓" : "✗"}`);
});
```

Output:
```
Registered ViewModels:
  AppViewModel: ✓
  TodoViewModel: ✓
  UserViewModel: ✗
```

### Comparación con getViewModel

```typescript
const ctor1 = getViewModel("AppViewModel");
const exists1 = ctor1 !== undefined;

const exists2 = hasViewModel("AppViewModel");
```

`exists1 === exists2`, pero `hasViewModel` es más idiomático.

## 4. clearRegistry

### Propósito

Limpiar completamente el registry. **Solo para testing.**

### Signatura

```typescript
function clearRegistry(): void
```

**Parámetros:** Ninguno

**Retorna:** `void`

### Algoritmo

```
clearRegistry()
    │
    └─► viewModelRegistry.clear()
          └─► Map ahora vacío
```

### Uso en Testing

```typescript
import { beforeEach, afterEach } from "vitest";
import { clearRegistry, defineViewModel } from "@pelelajs/core";

describe("ViewModel tests", () => {
  afterEach(() => {
    clearRegistry();
  });
  
  it("should register ViewModel", () => {
    class TestViewModel { }
    defineViewModel("TestViewModel", TestViewModel);
    
    expect(hasViewModel("TestViewModel")).toBe(true);
  });
  
  it("should not have previous test's ViewModel", () => {
    expect(hasViewModel("TestViewModel")).toBe(false);
  });
});
```

Sin `clearRegistry()`, el segundo test fallaría porque el ViewModel del primer test seguiría registrado.

### beforeEach vs afterEach

```typescript
beforeEach(() => {
  clearRegistry();
});
```

Limpia antes de cada test.

```typescript
afterEach(() => {
  clearRegistry();
});
```

Limpia después de cada test (recomendado para no afectar siguientes tests).

### Uso en Producción

**❌ NO usar en producción.**

```typescript
clearRegistry();
```

Esto eliminaría todos los ViewModels registrados, rompiendo la aplicación.

## Estado del Registry

### Estado Vacío (Inicial)

```typescript
viewModelRegistry = Map { }
```

Sin ningún ViewModel registrado.

### Estado Después de Registros

```typescript
defineViewModel("AppViewModel", AppViewModel);
defineViewModel("TodoViewModel", TodoViewModel);
```

```
viewModelRegistry = Map {
  "AppViewModel" => class AppViewModel { ... },
  "TodoViewModel" => class TodoViewModel { ... }
}
```

### Estado Después de Clear

```typescript
clearRegistry();
```

```
viewModelRegistry = Map { }
```

Vuelve al estado inicial.

## Flujo de Vida del Registry

```
┌──────────────────────────────────────────────────────────────┐
│                REGISTRY LIFECYCLE                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. INICIALIZACIÓN (module load)                            │
│     const viewModelRegistry = new Map()                     │
│           └─► Map { }                                        │
│                                                               │
│  2. FASE DE REGISTRO (app initialization)                   │
│     defineViewModel("App", AppViewModel)                    │
│       └─► Map { "App" => class App }                        │
│                                                               │
│     defineViewModel("Todo", TodoViewModel)                  │
│       └─► Map { "App" => ..., "Todo" => class Todo }       │
│                                                               │
│  3. FASE DE BOOTSTRAP                                        │
│     getViewModel("App")                                     │
│       └─► class App (lo usa para instanciar)               │
│                                                               │
│  4. FASE ACTIVA                                             │
│     Registry permanece sin cambios                          │
│                                                               │
│  5. TESTING: clearRegistry()                                │
│     viewModelRegistry.clear()                               │
│       └─► Map { }                                           │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Ejemplos Completos

### Ejemplo 1: App Simple

```typescript
import { defineViewModel, bootstrap } from "@pelelajs/core";

class CounterViewModel {
  count = 0;
  increment() { this.count++; }
}

defineViewModel("CounterViewModel", CounterViewModel);

bootstrap();
```

```html
<pelela view-model="CounterViewModel">
  <span bind-value="count"></span>
  <button click="increment">+</button>
</pelela>
```

**Flujo:**

```
1. Module execution
   └─► defineViewModel("CounterViewModel", CounterViewModel)
         └─► Registry: Map { "CounterViewModel" => class }

2. bootstrap()
   ├─► Find: <pelela view-model="CounterViewModel">
   ├─► getViewModel("CounterViewModel")
   │     └─► class CounterViewModel
   └─► new CounterViewModel()
```

### Ejemplo 2: Multiple ViewModels

```typescript
class HeaderViewModel {
  title = "My App";
}

class MainViewModel {
  content = "Welcome";
}

class FooterViewModel {
  copyright = "© 2025";
}

defineViewModel("HeaderViewModel", HeaderViewModel);
defineViewModel("MainViewModel", MainViewModel);
defineViewModel("FooterViewModel", FooterViewModel);

bootstrap();
```

```html
<body>
  <pelela view-model="HeaderViewModel">
    <header bind-value="title"></header>
  </pelela>
  
  <pelela view-model="MainViewModel">
    <main bind-value="content"></main>
  </pelela>
  
  <pelela view-model="FooterViewModel">
    <footer bind-value="copyright"></footer>
  </pelela>
</body>
```

**Registry:**

```
Map {
  "HeaderViewModel" => class HeaderViewModel,
  "MainViewModel" => class MainViewModel,
  "FooterViewModel" => class FooterViewModel
}
```

**Bootstrap:**

```
Loop iteration 1:
  name = "HeaderViewModel"
  ctor = getViewModel("HeaderViewModel")
  instance = new HeaderViewModel()

Loop iteration 2:
  name = "MainViewModel"
  ctor = getViewModel("MainViewModel")
  instance = new MainViewModel()

Loop iteration 3:
  name = "FooterViewModel"
  ctor = getViewModel("FooterViewModel")
  instance = new FooterViewModel()
```

### Ejemplo 3: Dynamic Registration

```typescript
const viewModels = [
  { name: "Page1VM", class: Page1ViewModel },
  { name: "Page2VM", class: Page2ViewModel },
  { name: "Page3VM", class: Page3ViewModel }
];

viewModels.forEach(({ name, class: ctor }) => {
  defineViewModel(name, ctor);
});
```

### Ejemplo 4: Conditional Registration

```typescript
import { defineViewModel } from "@pelelajs/core";

if (process.env.NODE_ENV === "development") {
  class DebugViewModel { }
  defineViewModel("DebugViewModel", DebugViewModel);
}
```

## Errores

### ViewModelRegistrationError

```typescript
export class ViewModelRegistrationError extends PelelaError {
  constructor(
    public readonly viewModelName: string,
    public readonly type: "missing" | "duplicate",
  ) {
    const message =
      type === "missing"
        ? `View model "${viewModelName}" is not registered. ` +
          `Did you forget to call defineViewModel("${viewModelName}", ${viewModelName})?`
        : `View model "${viewModelName}" is already registered.`;
    
    super(message);
    this.name = "ViewModelRegistrationError";
  }
}
```

### Error: Missing

```typescript
bootstrap();
```

```html
<pelela view-model="AppViewModel">
```

Sin `defineViewModel("AppViewModel", AppViewModel)`:

```
Error: ViewModelRegistrationError
View model "AppViewModel" is not registered.
Did you forget to call defineViewModel("AppViewModel", AppViewModel)?
```

### Error: Duplicate

```typescript
class AppViewModel { }

defineViewModel("AppViewModel", AppViewModel);
defineViewModel("AppViewModel", AppViewModel);
```

```
Error: ViewModelRegistrationError
View model "AppViewModel" is already registered.
```

## Patrones de Uso

### Patrón 1: Registro al Inicio

```typescript
import { defineViewModel, bootstrap } from "@pelelajs/core";
import { AppViewModel } from "./viewmodels/AppViewModel";
import { TodoViewModel } from "./viewmodels/TodoViewModel";

defineViewModel("AppViewModel", AppViewModel);
defineViewModel("TodoViewModel", TodoViewModel);

bootstrap();
```

### Patrón 2: Auto-registro

```typescript
export class AppViewModel {
  static {
    defineViewModel("AppViewModel", AppViewModel);
  }
  
  // ... propiedades y métodos
}
```

El ViewModel se registra automáticamente al importarse.

```typescript
import "./viewmodels/AppViewModel";
import "./viewmodels/TodoViewModel";

bootstrap();
```

### Patrón 3: Registry Helper

```typescript
function registerViewModels(viewModels: Record<string, ViewModelConstructor>) {
  for (const [name, ctor] of Object.entries(viewModels)) {
    defineViewModel(name, ctor);
  }
}

registerViewModels({
  AppViewModel,
  TodoViewModel,
  UserViewModel
});
```

### Patrón 4: Lazy Registration

```typescript
const viewModelLoaders = {
  "HeavyViewModel": () => import("./viewmodels/HeavyViewModel"),
  "AnotherVM": () => import("./viewmodels/AnotherVM")
};

async function lazyDefineViewModel(name: string) {
  if (hasViewModel(name)) return;
  
  const module = await viewModelLoaders[name]();
  defineViewModel(name, module.default);
}
```

## Memory Management

### WeakMap vs Map

PelelaJS usa `Map`, no `WeakMap`:

```typescript
const viewModelRegistry = new Map<string, ViewModelConstructor>();
```

**Por qué Map:**
- Keys son strings (no objetos)
- WeakMap solo acepta objetos como keys
- ViewModels deben persistir durante toda la vida de la app

### Garbage Collection

```typescript
class ViewModel { }
defineViewModel("VM", ViewModel);

ViewModel = null;
```

El constructor sigue en el registry:

```
Registry mantiene referencia:
  Map { "VM" => class ViewModel }
          └─► Previene GC del constructor
```

**Implicación:** Una vez registrado, el constructor permanece en memoria hasta `clearRegistry()` o hasta que la página se cierre.

### Memory Footprint

Por cada ViewModel registrado:

```
Map entry:
  key (string): ~50 bytes
  value (constructor): ~500 bytes

Total: ~550 bytes por ViewModel
```

Para 100 ViewModels: ~55KB (insignificante).

## Testing

### Test Básico

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { defineViewModel, getViewModel, hasViewModel, clearRegistry } from "@pelelajs/core";

describe("ViewModelRegistry", () => {
  beforeEach(() => {
    clearRegistry();
  });
  
  it("should register ViewModel", () => {
    class TestVM { }
    
    defineViewModel("TestVM", TestVM);
    
    expect(hasViewModel("TestVM")).toBe(true);
    expect(getViewModel("TestVM")).toBe(TestVM);
  });
  
  it("should throw on duplicate registration", () => {
    class TestVM { }
    
    defineViewModel("TestVM", TestVM);
    
    expect(() => {
      defineViewModel("TestVM", TestVM);
    }).toThrow(ViewModelRegistrationError);
  });
  
  it("should return undefined for non-existent ViewModel", () => {
    expect(getViewModel("NonExistent")).toBeUndefined();
    expect(hasViewModel("NonExistent")).toBe(false);
  });
  
  it("should clear registry", () => {
    class TestVM { }
    defineViewModel("TestVM", TestVM);
    
    clearRegistry();
    
    expect(hasViewModel("TestVM")).toBe(false);
  });
});
```

### Test de Múltiples ViewModels

```typescript
it("should handle multiple ViewModels", () => {
  class VM1 { }
  class VM2 { }
  class VM3 { }
  
  defineViewModel("VM1", VM1);
  defineViewModel("VM2", VM2);
  defineViewModel("VM3", VM3);
  
  expect(hasViewModel("VM1")).toBe(true);
  expect(hasViewModel("VM2")).toBe(true);
  expect(hasViewModel("VM3")).toBe(true);
  
  expect(getViewModel("VM1")).toBe(VM1);
  expect(getViewModel("VM2")).toBe(VM2);
  expect(getViewModel("VM3")).toBe(VM3);
});
```

### Test de Case Sensitivity

```typescript
it("should be case-sensitive", () => {
  class TestVM { }
  
  defineViewModel("TestVM", TestVM);
  
  expect(hasViewModel("TestVM")).toBe(true);
  expect(hasViewModel("testvm")).toBe(false);
  expect(hasViewModel("TESTVM")).toBe(false);
});
```

## Debugging

### Listar ViewModels Registrados

```typescript
function listRegisteredViewModels() {
  console.log("Registered ViewModels:");
  
  const entries = Array.from((viewModelRegistry as any).entries());
  
  entries.forEach(([name, ctor]) => {
    console.log(`  - ${name}: ${ctor.name}`);
  });
  
  console.log(`Total: ${entries.length}`);
}
```

**Problema:** `viewModelRegistry` no es exportado.

**Solución:** Crear una función de debugging:

```typescript
export function getRegisteredViewModels(): string[] {
  return Array.from(viewModelRegistry.keys());
}
```

### Breakpoint en Registro

```typescript
export function registerViewModel(
  name: string,
  ctor: ViewModelConstructor,
): void {
  console.log(`[REGISTRY] Registering: ${name}`);
  
  if (viewModelRegistry.has(name)) {
    console.error(`[REGISTRY] Duplicate: ${name}`);
    throw new ViewModelRegistrationError(name, "duplicate");
  }
  
  viewModelRegistry.set(name, ctor);
  console.log(`[REGISTRY] Registered successfully: ${name}`);
}
```

## Performance

### Operaciones

| Operación | Complejidad | Tiempo típico |
|-----------|-------------|---------------|
| `defineViewModel()` | O(1) | <0.1ms |
| `getViewModel()` | O(1) | <0.01ms |
| `hasViewModel()` | O(1) | <0.01ms |
| `clearRegistry()` | O(n) | <0.1ms para 100 VMs |

### Benchmark

```typescript
console.time("register 1000 ViewModels");
for (let i = 0; i < 1000; i++) {
  class VM { }
  defineViewModel(`VM${i}`, VM);
}
console.timeEnd("register 1000 ViewModels");

console.time("get 1000 ViewModels");
for (let i = 0; i < 1000; i++) {
  getViewModel(`VM${i}`);
}
console.timeEnd("get 1000 ViewModels");
```

**Resultados típicos:**
```
register 1000 ViewModels: ~5ms
get 1000 ViewModels: ~1ms
```

Extremadamente rápido.

## Comparación con Otros Frameworks

### Vue 3

```typescript
import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
```

Vue no tiene un registry explícito. Los componentes se importan directamente.

### React

```typescript
import App from './App';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('app')).render(<App />);
```

React tampoco usa registry. Los componentes son funciones/clases importadas.

### Angular

```typescript
@NgModule({
  declarations: [
    AppComponent,
    TodoComponent,
    UserComponent
  ],
  // ...
})
export class AppModule { }
```

Angular usa decoradores y módulos, similar a un registry pero más complejo.

### PelelaJS

```typescript
defineViewModel("AppViewModel", AppViewModel);
defineViewModel("TodoViewModel", TodoViewModel);

bootstrap();
```

**Ventajas:**
- Explícito y simple
- Fácil de debuggear
- Sin magia de módulos

**Desventajas:**
- Registro manual necesario
- Registry global (no módulos aislados)

## Alternativas de Diseño

### Alternativa 1: Decorators

```typescript
@ViewModel("AppViewModel")
class AppViewModel { }
```

**Pros:** Menos código
**Contras:** Requiere decorators (experimental en TypeScript)

### Alternativa 2: Registro Automático por Nombre

```typescript
class AppViewModel { }

bootstrap();
```

Bootstrap busca `window.AppViewModel` automáticamente.

**Pros:** Sin registro manual
**Contras:** Contamina scope global, menos explícito

### Alternativa 3: Import Directo

```typescript
bootstrap({
  viewModels: {
    AppViewModel,
    TodoViewModel
  }
});
```

**Pros:** No registry global
**Contras:** Más verboso, cambio en API

## Conclusión

El ViewModelRegistry de PelelaJS es:

1. **Simple:** Solo ~20 líneas de código
2. **Efectivo:** Map proporciona O(1) lookup
3. **Explícito:** Registro manual y claro
4. **Testeable:** `clearRegistry()` para tests aislados
5. **Predecible:** Comportamiento consistente

Es un componente fundamental que conecta los nombres en HTML con las clases en TypeScript de manera simple y eficiente.

## Referencias

- [Bootstrap Process](../02-bootstrap/01-bootstrap-process.md)
- [Arquitectura General](../01-architecture/01-general-architecture.md)
- [Sistema de Errores](../08-errors/01-error-system.md)
- [Tipos y Contratos](../09-types/01-types-contracts.md)

