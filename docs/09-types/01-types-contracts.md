# 9. Tipos y Contratos de PelelaJS

## Introducción

PelelaJS está completamente escrito en TypeScript y proporciona definiciones de tipos robustas para todos sus componentes. Este documento describe todos los tipos exportados, sus propósitos, y cómo se utilizan en el framework.

## Categorías de Tipos

```
┌────────────────────────────────────────────────────────────────┐
│                    TIPOS DE PELELAJS                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. TIPOS PRINCIPALES                                          │
│     • ViewModelConstructor                                     │
│     • PelelaOptions                                            │
│     • PelelaElement                                            │
│                                                                 │
│  2. TIPOS DE VIEWMODEL                                         │
│     • ViewModel<T>                                             │
│     • ReactiveViewModel<T>                                     │
│                                                                 │
│  3. TIPOS DE BINDINGS                                          │
│     • ValueBinding                                             │
│     • IfBinding                                                │
│     • ClassBinding                                             │
│     • StyleBinding                                             │
│     • ForEachBinding                                           │
│     • BindingsCollection                                       │
│                                                                 │
│  4. TIPOS DE ERRORES                                           │
│     • BindingKind                                              │
│     • RegistrationType                                         │
│     • EventType                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 9.1 ViewModelConstructor

### Definición

```typescript
export type ViewModelConstructor<T = unknown> = {
  new (): T;
};
```

### Propósito

Representa el tipo de un constructor de ViewModel: una clase que puede ser instanciada sin parámetros.

### Anatomía del Tipo

```
ViewModelConstructor<T = unknown>
    │
    ├─► Generic T: Tipo de la instancia que retorna el constructor
    │              Default: unknown (cualquier tipo)
    │
    └─► { new (): T }
          │    │   └─► Retorna instancia de tipo T
          │    └─► Sin parámetros
          └─► Constructor signature
```

### Uso

#### En Registry

```typescript
const viewModelRegistry = new Map<string, ViewModelConstructor>();

export function registerViewModel(
  name: string,
  ctor: ViewModelConstructor,  // ← Acepta cualquier constructor
): void {
  viewModelRegistry.set(name, ctor);
}
```

#### En Bootstrap

```typescript
const ctor: ViewModelConstructor | undefined = getViewModel("AppViewModel");

if (ctor) {
  const instance = new ctor();  // Instanciar sin parámetros
}
```

### Ejemplos

#### Ejemplo 1: ViewModel Simple

```typescript
class CounterViewModel {
  count = 0;
  increment() { this.count++; }
}

// CounterViewModel es compatible con ViewModelConstructor
const ctor: ViewModelConstructor<CounterViewModel> = CounterViewModel;

const instance = new ctor();
instance.count;       // ✓ OK: tipo number
instance.increment(); // ✓ OK: método existe
```

#### Ejemplo 2: Generic sin Especificar

```typescript
class AppViewModel {
  title = "App";
}

const ctor: ViewModelConstructor = AppViewModel;

const instance = new ctor();
// instance es tipo 'unknown'
instance.title;  // ✗ Error: Property 'title' does not exist on type 'unknown'
```

**Fix:** Usar cast o especificar generic:

```typescript
const ctor: ViewModelConstructor<AppViewModel> = AppViewModel;
const instance = new ctor();
instance.title;  // ✓ OK
```

#### Ejemplo 3: Constructor con Parámetros (No Compatible)

```typescript
class UserViewModel {
  constructor(public userId: string) { }  // ✗ Requiere parámetro
}

const ctor: ViewModelConstructor = UserViewModel;
// ✗ Error: Type 'typeof UserViewModel' is not assignable to type 'ViewModelConstructor<unknown>'.
```

PelelaJS solo soporta constructores sin parámetros.

### Compatibilidad

**Compatible:**

```typescript
class VM1 { }
class VM2 {
  prop = "value";
}
class VM3 {
  constructor() {
    this.prop = "initialized";
  }
  prop: string;
}
```

**No Compatible:**

```typescript
class VM4 {
  constructor(param: string) { }  // ✗ Requiere parámetro
}

class VM5 {
  constructor(param?: string) { }  // ✗ Parámetro opcional no cuenta
}

const vm6 = { };  // ✗ No es clase
```

## 9.2 PelelaOptions

### Definición

```typescript
export type PelelaOptions = {
  document?: Document;
  root?: ParentNode;
};
```

### Propósito

Opciones de configuración para la función `bootstrap()`.

### Campos

```typescript
document?: Document
```

**Propósito:** Especificar un objeto `Document` alternativo (útil para testing o SSR).

**Default:** `window.document` (documento global)

```typescript
root?: ParentNode
```

**Propósito:** Especificar un nodo raíz donde buscar elementos `[view-model]`.

**Default:** `document` (busca en todo el documento)

### Uso

#### Default (Sin Opciones)

```typescript
bootstrap();
```

Equivalente a:

```typescript
bootstrap({
  document: window.document,
  root: window.document
});
```

#### Custom Document (Testing)

```typescript
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`
  <pelela view-model="TestViewModel">
    <div bind-value="value"></div>
  </pelela>
`);

bootstrap({
  document: dom.window.document
});
```

#### Custom Root

```typescript
const container = document.getElementById('app-container');

bootstrap({
  root: container  // Solo busca dentro de este elemento
});
```

Solo los elementos `[view-model]` dentro de `container` serán inicializados.

### Ejemplos

#### Ejemplo 1: Multiples Roots

```typescript
const root1 = document.getElementById('app1');
const root2 = document.getElementById('app2');

bootstrap({ root: root1 });  // Inicializa app1
bootstrap({ root: root2 });  // Inicializa app2
```

#### Ejemplo 2: Shadow DOM

```typescript
const shadowRoot = element.attachShadow({ mode: 'open' });
shadowRoot.innerHTML = `
  <pelela view-model="ShadowViewModel">
    <div bind-value="text"></div>
  </pelela>
`;

bootstrap({ root: shadowRoot });
```

#### Ejemplo 3: Testing con JSDOM

```typescript
import { JSDOM } from 'jsdom';
import { bootstrap } from '@pelelajs/core';

describe('Bootstrap', () => {
  it('should bootstrap in JSDOM', () => {
    const dom = new JSDOM(`
      <pelela view-model="TestVM">
        <div bind-value="value"></div>
      </pelela>
    `);

    defineViewModel('TestVM', class TestVM { value = 'test'; });

    bootstrap({ document: dom.window.document });

    const div = dom.window.document.querySelector('div');
    expect(div?.textContent).toBe('test');
  });
});
```

## 9.3 PelelaElement

### Definición

```typescript
export interface PelelaElement<T = object> extends HTMLElement {
  __pelelaViewModel: T;
}
```

### Propósito

Representa un `HTMLElement` que tiene un ViewModel de Pelela adjunto. Usado internamente para almacenar la referencia al ViewModel.

### Campo Interno

```typescript
__pelelaViewModel: T
```

**Propósito:** Almacenar la instancia reactiva del ViewModel.

**Tipo:** Generic `T` (tipo del ViewModel)

**Convención:** Prefijo `__` indica que es privado/interno.

### Uso Interno

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

    const instance = new ctor();
    const reactiveInstance = createReactiveViewModel(instance, onChange);

    root.__pelelaViewModel = reactiveInstance;  // ← Almacenar en elemento
    
    // ...
  }
}
```

### Acceso al ViewModel

```typescript
const element = document.querySelector<PelelaElement>('[view-model="AppViewModel"]');

if (element) {
  const viewModel = element.__pelelaViewModel;
  console.log(viewModel);  // Instancia reactiva
}
```

**Nota:** No recomendado para uso en aplicaciones. Solo para debugging o testing.

### Tipo Generic

```typescript
interface PelelaElement<T = object>
```

El generic `T` permite tipar el ViewModel:

```typescript
class AppViewModel {
  title = "App";
}

const element = document.querySelector<PelelaElement<AppViewModel>>('[view-model="AppViewModel"]');

if (element) {
  element.__pelelaViewModel.title;  // ✓ OK: tipo 'string'
}
```

### Ejemplo de Debugging

```typescript
function inspectViewModel(selector: string) {
  const element = document.querySelector<PelelaElement>(selector);
  
  if (element && element.__pelelaViewModel) {
    console.log("ViewModel attached:", element.__pelelaViewModel);
    console.log("Raw ViewModel:", element.__pelelaViewModel.$raw);
  } else {
    console.log("No ViewModel found");
  }
}

inspectViewModel('[view-model="AppViewModel"]');
```

## 9.4 ViewModel Type

### Definición

```typescript
export type ViewModel<T extends object = object> = T & {
  [key: string]: unknown;
};
```

### Propósito

Tipo base para ViewModels. Representa un objeto con propiedades dinámicas.

### Anatomía del Tipo

```
ViewModel<T extends object = object>
    │
    ├─► Generic T: Tipo base del ViewModel
    │              Constraint: debe extender object
    │              Default: object (objeto genérico)
    │
    └─► T & { [key: string]: unknown }
          │              └─► Index signature: permite propiedades dinámicas
          └─► Intersection type: combina T con index signature
```

### Intersection Type

```typescript
T & { [key: string]: unknown }
```

**Propósito:** Permitir tanto propiedades tipadas de `T` como propiedades dinámicas.

```typescript
class AppViewModel {
  title = "App";
  count = 0;
}

type AppVM = ViewModel<AppViewModel>;

const vm: AppVM = new AppViewModel();

vm.title;              // ✓ OK: tipo 'string'
vm.count;              // ✓ OK: tipo 'number'
vm["dynamicProp"];     // ✓ OK: tipo 'unknown' (index signature)
```

### Uso en Bindings

```typescript
function setupSingleValueBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,  // ← Acepta cualquier ViewModel
): ValueBinding | null {
  const propertyName = element.getAttribute("bind-value");
  if (!propertyName) return null;

  const value = viewModel[propertyName];  // ✓ OK: index signature
  // ...
}
```

### Index Signature

```typescript
[key: string]: unknown
```

**Por qué:** Permite acceder a propiedades por nombre dinámico:

```typescript
const propertyName: string = "title";  // Dynamic
const value = viewModel[propertyName]; // ✓ OK
```

Sin index signature:

```typescript
type StrictViewModel = AppViewModel;  // Sin index signature

const vm: StrictViewModel = new AppViewModel();
const prop = "title";
vm[prop];  // ✗ Error: Element implicitly has an 'any' type
```

### Ejemplos

#### Ejemplo 1: ViewModel Tipado

```typescript
class UserViewModel {
  username = "John";
  age = 30;
}

const vm: ViewModel<UserViewModel> = new UserViewModel();

vm.username;           // ✓ tipo 'string'
vm.age;                // ✓ tipo 'number'
vm["username"];        // ✓ tipo 'unknown' (via index signature)
vm["nonExistent"];     // ✓ tipo 'unknown' (no error en compile time)
```

#### Ejemplo 2: ViewModel Genérico

```typescript
const vm: ViewModel = {
  prop1: "value",
  prop2: 123
};

vm.prop1;          // ✓ tipo 'unknown'
vm["prop2"];       // ✓ tipo 'unknown'
```

## 9.5 ReactiveViewModel Type

### Definición

```typescript
export type ReactiveViewModel<T extends object> = T & {
  $raw: T;
  $set: (target: any, key: PropertyKey, value: any) => void;
  $delete: (target: any, key: PropertyKey) => void;
};
```

### Propósito

Representa un ViewModel envuelto en un Proxy reactivo con operadores especiales.

### Anatomía del Tipo

```
ReactiveViewModel<T extends object>
    │
    ├─► Generic T: Tipo del ViewModel original
    │
    └─► T & { special operators }
          │         │
          │         ├─► $raw: Acceso al objeto original sin Proxy
          │         ├─► $set: Setter explícito que evita Proxy traps
          │         └─► $delete: Deleter explícito que evita Proxy traps
          │
          └─► Intersection: ViewModel + operadores
```

### Operadores Especiales

#### $raw

```typescript
$raw: T
```

**Propósito:** Acceder al objeto original sin pasar por el Proxy.

**Uso:**

```typescript
const reactiveVM = createReactiveViewModel({ count: 0 }, onChange);

reactiveVM.count;        // 0 (pasa por Proxy get trap)
reactiveVM.$raw.count;   // 0 (acceso directo, NO trigger onChange)
```

**Cuándo usar:**
- Leer valor sin triggear dependencias
- Debugging
- Operaciones que no deben ser reactivas

#### $set

```typescript
$set: (target: any, key: PropertyKey, value: any) => void
```

**Propósito:** Establecer valor explícitamente, útil cuando el set trap normal falla.

**Uso:**

```typescript
const reactiveVM = createReactiveViewModel({ obj: {} }, onChange);

// Método 1: Normal (pasa por Proxy)
reactiveVM.obj.newProp = "value";

// Método 2: Explícito (bypass issues)
reactiveVM.$set(reactiveVM.obj, "newProp", "value");
```

#### $delete

```typescript
$delete: (target: any, key: PropertyKey) => void
```

**Propósito:** Eliminar propiedad explícitamente.

**Uso:**

```typescript
const reactiveVM = createReactiveViewModel({ count: 0 }, onChange);

// Método 1: Normal
delete reactiveVM.count;

// Método 2: Explícito
reactiveVM.$delete(reactiveVM, "count");
```

### Diagrama de Estructura

```
┌────────────────────────────────────────────────────────────────┐
│              ReactiveViewModel<T>                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Propiedades del ViewModel Original (T)                       │
│  ─────────────────────────────────────                        │
│  • count: number                                               │
│  • title: string                                               │
│  • increment(): void                                           │
│  • ...                                                          │
│                                                                 │
│  Operadores Especiales                                         │
│  ─────────────────────                                         │
│  • $raw: T                                                     │
│      └─► Objeto original sin Proxy                            │
│                                                                 │
│  • $set(target, key, value): void                             │
│      └─► Set explícito                                         │
│                                                                 │
│  • $delete(target, key): void                                 │
│      └─► Delete explícito                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Ejemplos

#### Ejemplo 1: Uso de $raw

```typescript
class CounterViewModel {
  count = 0;
}

let changeCount = 0;
const onChange = () => changeCount++;

const reactive = createReactiveViewModel(new CounterViewModel(), onChange);

reactive.count;        // Trigger get trap
reactive.count = 1;    // Trigger set trap, onChange() llamado

reactive.$raw.count;   // NO trigger get trap
reactive.$raw.count = 2;  // NO trigger set trap, onChange() NO llamado
```

#### Ejemplo 2: Uso de $set

```typescript
const reactive = createReactiveViewModel({ user: { name: "John" } }, onChange);

// Problema potencial con nested objects
reactive.user.age = 30;  // Puede no funcionar correctamente

// Solución con $set
reactive.$set(reactive.user, "age", 30);
```

#### Ejemplo 3: Uso de $delete

```typescript
const reactive = createReactiveViewModel({ temp: "value", keep: "value" }, onChange);

// Eliminar propiedad
reactive.$delete(reactive, "temp");

console.log("temp" in reactive);  // false
console.log(reactive.keep);       // "value"
```

### Función createReactiveViewModel

```typescript
export function createReactiveViewModel<T extends object>(
  target: T,
  onChange: (changedPath: string) => void,
): ReactiveViewModel<T> {
  return makeReactive(target, onChange);
}
```

**Parámetros:**
- `target`: ViewModel original
- `onChange`: Callback cuando cambia una propiedad

**Retorna:** `ReactiveViewModel<T>` con operadores especiales

## 9.6 Tipos de Bindings

### ValueBinding

```typescript
export type ValueBinding = {
  element: HTMLElement;
  propertyName: string;
  isInput: boolean;
};
```

**Propósito:** Binding para `bind-value`.

**Campos:**
- `element`: Elemento HTML vinculado
- `propertyName`: Nombre de la propiedad del ViewModel
- `isInput`: `true` si es input/textarea (two-way), `false` si es otros elementos (one-way)

**Ejemplo:**

```typescript
const binding: ValueBinding = {
  element: document.querySelector('input'),
  propertyName: "username",
  isInput: true
};
```

### IfBinding

```typescript
export type IfBinding = {
  element: HTMLElement;
  propertyName: string;
  originalDisplay: string;
};
```

**Propósito:** Binding para `if` (conditional rendering).

**Campos:**
- `element`: Elemento a mostrar/ocultar
- `propertyName`: Propiedad booleana del ViewModel
- `originalDisplay`: Valor original de `display` CSS (para restaurar)

**Ejemplo:**

```typescript
const binding: IfBinding = {
  element: document.querySelector('.notification'),
  propertyName: "showNotification",
  originalDisplay: "block"
};
```

### ClassBinding

```typescript
export type ClassBinding = {
  element: HTMLElement;
  propertyName: string;
  staticClassName: string;
};
```

**Propósito:** Binding para `bind-class`.

**Campos:**
- `element`: Elemento a aplicar clases
- `propertyName`: Propiedad con clases dinámicas
- `staticClassName`: Clases estáticas originales (preservar)

**Ejemplo:**

```typescript
const binding: ClassBinding = {
  element: document.querySelector('button'),
  propertyName: "buttonClasses",
  staticClassName: "btn btn-primary"
};
```

### StyleBinding

```typescript
export type StyleBinding = {
  element: HTMLElement;
  propertyName: string;
};
```

**Propósito:** Binding para `bind-style`.

**Campos:**
- `element`: Elemento a aplicar estilos
- `propertyName`: Propiedad con objeto de estilos

**Ejemplo:**

```typescript
const binding: StyleBinding = {
  element: document.querySelector('.box'),
  propertyName: "boxStyles"
};
```

### ForEachBinding

```typescript
export type ForEachBinding = {
  collectionName: string;
  itemName: string;
  template: HTMLElement;
  placeholder: Comment;
  renderedElements: {
    element: HTMLElement;
    viewModel: ViewModel;
    itemRef: { current: any };
    render: () => void;
  }[];
  previousLength: number;
};
```

**Propósito:** Binding para `for-each` (list rendering).

**Campos:**

```typescript
collectionName: string
```

Nombre de la colección en el ViewModel (`"todos"` en `for-each="todo of todos"`).

```typescript
itemName: string
```

Nombre del item en el scope local (`"todo"` en `for-each="todo of todos"`).

```typescript
template: HTMLElement
```

Clon del elemento original (usado para crear nuevos elementos).

```typescript
placeholder: Comment
```

Comment node que marca la posición en el DOM (`<!-- for-each: todo of todos -->`).

```typescript
renderedElements: Array<{...}>
```

Array de elementos renderizados, cada uno con:
- `element`: Elemento HTML en el DOM
- `viewModel`: Extended ViewModel con scope local
- `itemRef`: Referencia mutable al item actual
- `render`: Función para re-renderizar este elemento

```typescript
previousLength: number
```

Longitud anterior de la colección (para detectar cambios).

**Ejemplo:**

```typescript
const binding: ForEachBinding = {
  collectionName: "todos",
  itemName: "todo",
  template: templateElement.cloneNode(true) as HTMLElement,
  placeholder: document.createComment("for-each: todo of todos"),
  renderedElements: [
    {
      element: div1,
      viewModel: extendedVM1,
      itemRef: { current: { id: 1, title: "Task 1" } },
      render: renderFn1
    },
    {
      element: div2,
      viewModel: extendedVM2,
      itemRef: { current: { id: 2, title: "Task 2" } },
      render: renderFn2
    }
  ],
  previousLength: 2
};
```

### BindingsCollection

```typescript
export type BindingsCollection = {
  valueBindings: ValueBinding[];
  ifBindings: IfBinding[];
  classBindings: ClassBinding[];
  styleBindings: StyleBinding[];
  forEachBindings: ForEachBinding[];
};
```

**Propósito:** Colección de todos los bindings de un ViewModel.

**Uso:**

```typescript
function setupBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): BindingsCollection {
  return {
    valueBindings: setupValueBindings(root, viewModel),
    ifBindings: setupIfBindings(root, viewModel),
    classBindings: setupClassBindings(root, viewModel),
    styleBindings: setupStyleBindings(root, viewModel),
    forEachBindings: setupForEachBindings(root, viewModel)
  };
}
```

## Tipos de Errores

### BindingKind

```typescript
export type BindingKind = "bind-class" | "bind-value" | "bind-style" | 'for-each' | "if";
```

**Propósito:** Tipos de bindings para errores de validación.

**Uso:**

```typescript
throw new PropertyValidationError(
  "userName",
  "bind-value",  // ← BindingKind
  "UserViewModel",
  "<div>"
);
```

### RegistrationType

```typescript
export type RegistrationType = "duplicate" | "missing";
```

**Propósito:** Tipos de errores de registro de ViewModels.

**Valores:**
- `"duplicate"`: ViewModel ya registrado
- `"missing"`: ViewModel no registrado

**Uso:**

```typescript
throw new ViewModelRegistrationError(
  "AppViewModel",
  "missing"  // ← RegistrationType
);
```

### EventType

```typescript
export type EventType = "click" | "submit" | "change" | "input" | "keypress" | (string & {});
```

**Propósito:** Tipos de eventos para errores de handler.

**Valores:**
- Valores comunes: `"click"`, `"submit"`, `"change"`, `"input"`, `"keypress"`
- `string & {}`: Permite cualquier string (otros eventos)

**Uso:**

```typescript
throw new InvalidHandlerError(
  "handleClick",
  "ViewModel",
  "click"  // ← EventType
);
```

**Truco de TypeScript:**

```typescript
(string & {})
```

Esto permite:
- Autocompletado de valores comunes en el IDE
- Aceptar cualquier string

```typescript
const event1: EventType = "click";      // ✓ Autocompleta
const event2: EventType = "mouseover";  // ✓ También válido
```

## Tabla Resumen de Tipos

| Tipo | Categoría | Propósito | Ubicación |
|------|-----------|-----------|-----------|
| `ViewModelConstructor` | Principal | Constructor de ViewModel | `types.ts` |
| `PelelaOptions` | Principal | Opciones de bootstrap | `types.ts` |
| `PelelaElement` | Principal | Elemento con ViewModel | `types.ts` |
| `ViewModel<T>` | ViewModel | Tipo base de ViewModel | `bindings/types.ts` |
| `ReactiveViewModel<T>` | ViewModel | ViewModel reactivo | `reactivity/reactiveProxy.ts` |
| `ValueBinding` | Binding | bind-value | `bindings/types.ts` |
| `IfBinding` | Binding | if | `bindings/types.ts` |
| `ClassBinding` | Binding | bind-class | `bindings/types.ts` |
| `StyleBinding` | Binding | bind-style | `bindings/types.ts` |
| `ForEachBinding` | Binding | for-each | `bindings/types.ts` |
| `BindingsCollection` | Binding | Colección de bindings | `bindings/types.ts` |
| `BindingKind` | Error | Tipos de bindings | `errors/PropertyValidationError.ts` |
| `RegistrationType` | Error | Tipos de errores de registro | `errors/ViewModelRegistrationError.ts` |
| `EventType` | Error | Tipos de eventos | `errors/InvalidHandlerError.ts` |

## Uso en Aplicaciones

### Type Safety en ViewModels

```typescript
import type { ViewModel, ReactiveViewModel } from '@pelelajs/core';

class TodoViewModel {
  todos: Array<{ id: number; title: string; done: boolean }> = [];
  newTodo = "";
  
  addTodo() {
    this.todos.push({
      id: Date.now(),
      title: this.newTodo,
      done: false
    });
    this.newTodo = "";
  }
}

// Tipo del ViewModel
type TodoVM = ViewModel<TodoViewModel>;

// Tipo reactivo (en runtime)
type ReactiveTodoVM = ReactiveViewModel<TodoViewModel>;
```

### Type Safety en Functions

```typescript
function setupCustomBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>
): void {
  const prop = element.getAttribute('custom-bind');
  if (!prop) return;
  
  const value = viewModel[prop];  // ✓ Type-safe con index signature
  // ...
}
```

### Extending Types

```typescript
import type { PelelaOptions } from '@pelelajs/core';

interface ExtendedOptions extends PelelaOptions {
  debug?: boolean;
  logger?: (message: string) => void;
}

function customBootstrap(options: ExtendedOptions = {}) {
  if (options.debug) {
    console.log("Debug mode enabled");
  }
  
  bootstrap({
    document: options.document,
    root: options.root
  });
}
```

## TypeScript Configuration

### Recommended tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve"
  }
}
```

**Key settings:**
- `strict: true`: Habilita todos los checks estrictos
- `lib: ["ES2022", "DOM"]`: Soporta APIs modernas + DOM
- `esModuleInterop: true`: Mejor interop con CommonJS

## Conclusión

El sistema de tipos de PelelaJS proporciona:

1. **Type Safety** - Errores en compile-time, no runtime
2. **IntelliSense** - Autocompletado en IDEs
3. **Documentación** - Tipos como documentación viva
4. **Refactoring** - Cambios seguros con TypeScript
5. **Contracts** - Contratos claros entre componentes

Todos los tipos están exportados y disponibles para uso en aplicaciones, permitiendo aprovechar al máximo TypeScript.

## Referencias

- [Arquitectura General](../01-architecture/01-general-architecture.md)
- [Registro de ViewModels](../06-registry/01-viewmodel-registry.md)
- [Sistema de Reactividad](../03-reactivity/01-reactive-proxy.md)
- [Sistema de Bindings](../04-bindings/01-binding-system.md)
- [Sistema de Errores](../08-errors/01-error-system.md)

