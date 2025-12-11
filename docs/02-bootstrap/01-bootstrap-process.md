# 2.1 Proceso de Bootstrap

## Introducción

El proceso de bootstrap es la fase de inicialización de una aplicación PelelaJS. Durante esta fase, el framework descubre los elementos `<pelela>` en el DOM, instancia los ViewModels correspondientes, configura el sistema reactivo y establece todos los bindings necesarios.

Este documento detalla cada paso del proceso con precisión técnica.

## Visión General del Bootstrap

```
┌────────────────────────────────────────────────────────────────┐
│                    PROCESO DE BOOTSTRAP                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  bootstrap(options?)                                           │
│       │                                                         │
│       ├─► 1. CONFIGURACIÓN                                     │
│       │     └─► Determinar document y root                     │
│       │                                                         │
│       ├─► 2. DESCUBRIMIENTO                                    │
│       │     └─► querySelectorAll("pelela[view-model]")         │
│       │                                                         │
│       ├─► 3. VALIDACIÓN                                        │
│       │     └─► Advertir si no hay elementos                   │
│       │                                                         │
│       └─► 4. INICIALIZACIÓN (para cada elemento)              │
│             │                                                   │
│             ├─► 4.1 Obtener nombre del ViewModel               │
│             ├─► 4.2 Buscar constructor en Registry             │
│             ├─► 4.3 Instanciar ViewModel                       │
│             ├─► 4.4 Crear Reactive Proxy                       │
│             ├─► 4.5 Almacenar en elemento                      │
│             ├─► 4.6 Setup de Bindings                          │
│             ├─► 4.7 Registrar Dependencias                     │
│             ├─► 4.8 Crear función render                       │
│             ├─► 4.9 Ejecutar render inicial                    │
│             └─► 4.10 Log de confirmación                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Código Fuente Completo

```typescript
export function bootstrap(options: PelelaOptions = {}): void {
  const doc = options.document ?? window.document;
  const searchRoot: ParentNode = options.root ?? doc;

  const roots = Array.from(
    searchRoot.querySelectorAll<HTMLElement>("pelela[view-model]"),
  );

  if (roots.length === 0) {
    console.warn("[pelela] No <pelela view-model=\"...\"> elements found");
  }

  for (const root of roots) {
    const name = root.getAttribute("view-model");
    if (!name) continue;

    const ctor = getViewModel(name);
    if (!ctor) {
      throw new ViewModelRegistrationError(name, "missing");
    }

    const instance = new ctor();

    let render: (changedPath?: string) => void = () => {};

    const reactiveInstance = createReactiveViewModel(
      instance as Record<string, unknown>,
      (changedPath: string) => {
        render(changedPath);
      },
    );

    (root as any).__pelelaViewModel = reactiveInstance;

    render = setupBindings(root, reactiveInstance);

    console.log(
      `[pelela] View model "${name}" instantiated and bound`,
      reactiveInstance,
    );
  }
}
```

## Paso 1: Configuración

### 1.1 Opciones de Bootstrap

```typescript
export type PelelaOptions = {
  document?: Document;
  root?: ParentNode;
};
```

#### Parámetros

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `document` | `Document` | `window.document` | Documento donde buscar elementos |
| `root` | `ParentNode` | `document` | Nodo raíz para búsqueda |

### 1.2 Resolución de Opciones

```typescript
const doc = options.document ?? window.document;
const searchRoot: ParentNode = options.root ?? doc;
```

```
Caso 1: Sin opciones
────────────────────
bootstrap()
    │
    └─► doc = window.document
    └─► searchRoot = window.document


Caso 2: Con root específico
────────────────────────────
const container = document.getElementById("app");
bootstrap({ root: container })
    │
    └─► doc = window.document
    └─► searchRoot = container


Caso 3: Testing con document mock
──────────────────────────────────
const mockDoc = new JSDOM("...").window.document;
bootstrap({ document: mockDoc })
    │
    └─► doc = mockDoc
    └─► searchRoot = mockDoc
```

### 1.3 Casos de Uso

#### Caso de Uso 1: Aplicación Completa

```typescript
import { bootstrap } from "@pelelajs/core";

bootstrap();
```

Busca en todo `window.document`.

#### Caso de Uso 2: Aplicación Parcial

```typescript
const appContainer = document.getElementById("app");

bootstrap({ root: appContainer });
```

Busca solo dentro de `#app`.

#### Caso de Uso 3: Multiple Apps

```typescript
const app1 = document.getElementById("app1");
const app2 = document.getElementById("app2");

bootstrap({ root: app1 });
bootstrap({ root: app2 });
```

Inicializa dos aplicaciones independientes.

#### Caso de Uso 4: Testing

```typescript
import { JSDOM } from "jsdom";

const dom = new JSDOM(`
  <pelela view-model="TestViewModel">
    <span bind-value="test"></span>
  </pelela>
`);

bootstrap({ document: dom.window.document });
```

## Paso 2: Descubrimiento

### 2.1 Query Selector

```typescript
const roots = Array.from(
  searchRoot.querySelectorAll<HTMLElement>("pelela[view-model]"),
);
```

#### Selector Utilizado

```
"pelela[view-model]"
```

**Significado:**
- `pelela`: Elemento con tag name "pelela"
- `[view-model]`: Que tenga el atributo "view-model"

#### Estructura HTML Esperada

```html
<pelela view-model="AppViewModel">
  <!-- contenido -->
</pelela>
```

### 2.2 Diagrama de Descubrimiento

```
Document
    │
    └─► searchRoot.querySelectorAll("pelela[view-model]")
              │
              ├─► <pelela view-model="AppViewModel">
              │        └─► Match ✓
              │
              ├─► <pelela view-model="TodoViewModel">
              │        └─► Match ✓
              │
              ├─► <pelela>
              │        └─► No match (sin view-model) ✗
              │
              ├─► <div view-model="OtroViewModel">
              │        └─► No match (no es pelela) ✗
              │
              └─► Result: NodeList [elemento1, elemento2]
                       │
                       └─► Array.from() → [elemento1, elemento2]
```

### 2.3 Por Qué Array.from()

```typescript
const roots = Array.from(
  searchRoot.querySelectorAll<HTMLElement>("pelela[view-model]"),
);
```

`querySelectorAll()` retorna `NodeList`, no `Array`. `Array.from()` convierte para tener métodos de array:

```typescript
const nodeList = searchRoot.querySelectorAll("pelela[view-model]");

nodeList.forEach();    // ✓ Disponible
nodeList.map();        // ✗ No disponible
nodeList.filter();     // ✗ No disponible

const array = Array.from(nodeList);

array.forEach();       // ✓ Disponible
array.map();           // ✓ Disponible
array.filter();        // ✓ Disponible
```

### 2.4 Ejemplo Práctico

#### HTML Input

```html
<!DOCTYPE html>
<html>
<body>
  <div id="header">
    <pelela view-model="HeaderViewModel">
      <nav bind-class="navClass">Header</nav>
    </pelela>
  </div>
  
  <div id="main">
    <pelela view-model="TodoListViewModel">
      <ul>
        <li for-each="todo of todos">
          <span bind-value="todo.title"></span>
        </li>
      </ul>
    </pelela>
  </div>
  
  <div id="footer">
    <pelela view-model="FooterViewModel">
      <p bind-value="copyright"></p>
    </pelela>
  </div>
  
  <script type="module" src="/main.ts"></script>
</body>
</html>
```

#### Resultado del Query

```typescript
roots = [
  <pelela view-model="HeaderViewModel">,
  <pelela view-model="TodoListViewModel">,
  <pelela view-model="FooterViewModel">
]
```

## Paso 3: Validación

### 3.1 Advertencia si No Hay Elementos

```typescript
if (roots.length === 0) {
  console.warn("[pelela] No <pelela view-model=\"...\"> elements found");
}
```

#### Casos que Disparan la Advertencia

**Caso 1: HTML sin elementos pelela**

```html
<body>
  <div id="app">
    <h1>No hay elementos pelela</h1>
  </div>
</body>
```

**Caso 2: Elementos pelela sin view-model**

```html
<body>
  <pelela>
    <h1>Elemento pelela sin atributo view-model</h1>
  </pelela>
</body>
```

**Caso 3: Bootstrap con root incorrecto**

```typescript
const wrongContainer = document.getElementById("nonexistent");
bootstrap({ root: wrongContainer });
```

### 3.2 Por Qué Solo Advertencia

El framework **no lanza error** porque podría ser intencional:

1. **Single Page Application:** El contenido se carga dinámicamente después
2. **Multiple Roots:** Bootstrap se llama en diferentes contenedores
3. **Conditional Rendering:** Los elementos pueden no existir aún

### 3.3 Output de Console

```
Console Output:
[pelela] No <pelela view-model="..."> elements found
```

## Paso 4: Inicialización por Elemento

### 4.1 Obtención del Nombre del ViewModel

```typescript
for (const root of roots) {
  const name = root.getAttribute("view-model");
  if (!name) continue;
```

```
<pelela view-model="AppViewModel">
       │
       └─► root.getAttribute("view-model")
                 │
                 └─► "AppViewModel"

Validación:
  if (!name) continue;
       │
       └─► Si name es null, undefined o "", skip este elemento
```

#### Edge Cases

**Caso 1: Atributo vacío**

```html
<pelela view-model="">
```

```typescript
name = ""
if (!name) continue;
```

Elemento saltado, no genera error.

**Caso 2: Atributo con espacios**

```html
<pelela view-model="  AppViewModel  ">
```

```typescript
name = "  AppViewModel  "
```

El nombre **incluye los espacios**. El `getViewModel()` buscará con espacios y fallará. Mejor práctica: trim en la búsqueda o documentar que no debe haber espacios.

### 4.2 Búsqueda del Constructor en Registry

```typescript
const ctor = getViewModel(name);
if (!ctor) {
  throw new ViewModelRegistrationError(name, "missing");
}
```

#### Flujo de Búsqueda

```
getViewModel("AppViewModel")
       │
       └─► viewModelRegistry.get("AppViewModel")
                 │
                 ├─► Found: return Constructor
                 │
                 └─► Not Found: return undefined
                       │
                       └─► throw ViewModelRegistrationError
```

#### Código de getViewModel

```typescript
export function getViewModel(name: string): ViewModelConstructor | undefined {
  return viewModelRegistry.get(name);
}
```

#### ViewModelRegistrationError

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

#### Error Output

```
ViewModelRegistrationError: View model "AppViewModel" is not registered. 
Did you forget to call defineViewModel("AppViewModel", AppViewModel)?
    at bootstrap (bootstrap.ts:24)
    at main.ts:10
```

### 4.3 Instanciación del ViewModel

```typescript
const instance = new ctor();
```

#### Diagrama de Instanciación

```
Constructor: class AppViewModel {
  message = "Hello";
  count = 0;
  
  increment() {
    this.count++;
  }
}
       │
       └─► new ctor()
             │
             ├─► Ejecuta constructor()
             ├─► Inicializa propiedades
             │     ├─ message = "Hello"
             │     └─ count = 0
             │
             └─► return instance
                   │
                   └─► {
                         message: "Hello",
                         count: 0,
                         increment: [Function]
                       }
```

#### Estado en Memoria

```
instance (Plain Object)
├─ message: "Hello"
├─ count: 0
└─ increment: [Function: increment]
     └─ Closure: acceso a 'this'
```

#### Ejecución del Constructor

```typescript
class UserViewModel {
  users: User[] = [];
  
  constructor() {
    console.log("UserViewModel constructor called");
    this.loadUsers();
  }
  
  private loadUsers() {
    this.users = [
      { id: 1, name: "John" },
      { id: 2, name: "Jane" }
    ];
  }
}
```

**Timeline:**

```
T=0ms:  new UserViewModel()
T=0ms:    └─► users = []
T=0ms:    └─► constructor()
T=0ms:         └─► console.log()
T=0ms:         └─► this.loadUsers()
T=0ms:              └─► this.users = [...]
T=1ms:    └─► return instance
```

**Importante:** En este punto, el objeto aún **NO es reactivo**. Las asignaciones en el constructor no disparan onChange.

### 4.4 Creación del Reactive Proxy

```typescript
let render: (changedPath?: string) => void = () => {};

const reactiveInstance = createReactiveViewModel(
  instance as Record<string, unknown>,
  (changedPath: string) => {
    render(changedPath);
  },
);
```

#### Estructura del onChange Callback

```typescript
onChange: (changedPath: string) => void
```

El callback se define **antes** de tener la función `render` real:

```typescript
let render = () => {};

const onChange = (changedPath: string) => {
  render(changedPath);
};
```

Luego, `render` se reasigna:

```typescript
render = setupBindings(root, reactiveInstance);
```

#### Diagrama de Closure

```
reactiveInstance (Proxy)
    │
    └─► onChange callback
            │
            └─► Captura 'render' por referencia (closure)
                  │
                  ├─► Inicialmente: () => {}
                  │
                  └─► Después de setup: función real de render
```

Este patrón permite que el Proxy tenga acceso a `render` antes de que exista:

```
Timeline:
  1. render = () => {}
  2. onChange = (path) => render(path)
  3. reactiveInstance = Proxy con onChange
  4. render = setupBindings(...)
  5. Cambio en proxy → onChange → render real
```

#### Transformación a Reactive

```
ANTES                           DESPUÉS
─────────────────────           ───────────────────────

instance = {                    reactiveInstance = Proxy {
  message: "Hello",               target: instance,
  count: 0,                       handler: {
  increment: [Function]             get(obj, prop) {
}                                     ...
                                      return makeReactive(value)
                                    },
                                    set(obj, prop, val) {
                                      ...
                                      onChange(path)
                                    }
                                  }
                                }

Acceso:                         Acceso:
  instance.count                  reactiveInstance.count
  └─► Lee directamente            └─► Interceptado por get()

Modificación:                   Modificación:
  instance.count = 5              reactiveInstance.count = 5
  └─► Sin notificación            ├─► Interceptado por set()
                                  └─► onChange("count")
```

### 4.5 Almacenamiento en el Elemento

```typescript
(root as any).__pelelaViewModel = reactiveInstance;
```

#### Propósito

Permite acceso al ViewModel desde el elemento DOM:

```typescript
const element = document.querySelector("pelela[view-model='AppViewModel']");
const vm = (element as any).__pelelaViewModel;

vm.count++;
```

#### Estructura en el DOM

```
<pelela view-model="AppViewModel">
    │
    ├─── Standard Properties
    │    ├─ tagName: "PELELA"
    │    ├─ id: ""
    │    ├─ className: ""
    │    └─ ...
    │
    └─── Custom Properties
         └─ __pelelaViewModel: Proxy {
              message: "Hello",
              count: 0,
              increment: [Function]
            }
```

#### Interfaz TypeScript

```typescript
export interface PelelaElement<T = object> extends HTMLElement {
  __pelelaViewModel: T;
}
```

Uso tipado:

```typescript
const element = document.querySelector("pelela") as PelelaElement<AppViewModel>;
const vm = element.__pelelaViewModel;

vm.count++;
```

#### Casos de Uso

**Caso 1: Debugging en DevTools**

```javascript
$0
$0.__pelelaViewModel
$0.__pelelaViewModel.count = 100
```

**Caso 2: Testing**

```typescript
const element = container.querySelector("pelela") as PelelaElement;
const vm = element.__pelelaViewModel;

expect(vm.count).toBe(0);

vm.increment();

expect(vm.count).toBe(1);
```

**Caso 3: Integration con Librerías Externas**

```typescript
const chartElement = document.getElementById("chart");
const vm = (chartElement.closest("pelela") as PelelaElement).__pelelaViewModel;

updateChartData(vm.chartData);
```

### 4.6 Setup de Bindings

```typescript
render = setupBindings(root, reactiveInstance);
```

Esta línea ejecuta:

1. **Setup de todos los bindings**
2. **Registro de dependencias**
3. **Creación de la función render**

#### Retorno de setupBindings

```typescript
export function setupBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): (changedPath?: string) => void {
  const bindings: BindingsCollection = {
    forEachBindings: setupForEachBindings(root, viewModel),
    valueBindings: setupValueBindings(root, viewModel),
    ifBindings: setupIfBindings(root, viewModel),
    classBindings: setupClassBindings(root, viewModel),
    styleBindings: setupStyleBindings(root, viewModel),
  };

  setupClickBindings(root, viewModel);

  const tracker = new DependencyTracker();
  registerAllBindingDependencies(bindings, tracker);

  const render = (changedPath?: string) => {
    const targetBindings = changedPath 
      ? tracker.getDependentBindings(changedPath, bindings)
      : bindings;

    executeRenderPipeline(targetBindings, viewModel);
  };

  render();
  return render;
}
```

#### Flujo Interno

```
setupBindings(root, vm)
    │
    ├─► setupForEachBindings() → forEachBindings[]
    ├─► setupValueBindings() → valueBindings[]
    ├─► setupIfBindings() → ifBindings[]
    ├─► setupClassBindings() → classBindings[]
    ├─► setupStyleBindings() → styleBindings[]
    └─► setupClickBindings() → event listeners registrados
    │
    └─► Create DependencyTracker
    │
    └─► registerAllBindingDependencies()
    │
    └─► Create render function
    │     │
    │     └─► Closure sobre: bindings, tracker, viewModel
    │
    └─► render() inicial
    │
    └─► return render
```

#### Closure de la Función Render

La función `render` retornada tiene acceso a:

```typescript
const render = (changedPath?: string) => {
  const targetBindings = changedPath 
    ? tracker.getDependentBindings(changedPath, bindings)
    : bindings;

  executeRenderPipeline(targetBindings, viewModel);
};
```

**Variables capturadas:**
- `bindings`: BindingsCollection
- `tracker`: DependencyTracker
- `viewModel`: Reactive ViewModel

Estas permanecen en memoria mientras el elemento exista.

### 4.7 Registrar Dependencias

Esto ocurre dentro de `setupBindings`:

```typescript
const tracker = new DependencyTracker();
registerAllBindingDependencies(bindings, tracker);
```

#### Código de Registro

```typescript
function registerAllBindingDependencies(
  bindings: BindingsCollection,
  tracker: DependencyTracker
): void {
  const bindingConfigurations = [
    { 
      list: bindings.forEachBindings, 
      getPath: (binding) => (binding as ForEachBinding).collectionName 
    },
    { 
      list: bindings.valueBindings, 
      getPath: (binding) => (binding as ValueBinding).propertyName 
    },
    { 
      list: bindings.ifBindings, 
      getPath: (binding) => (binding as IfBinding).propertyName 
    },
    { 
      list: bindings.classBindings, 
      getPath: (binding) => (binding as ClassBinding).propertyName 
    },
    { 
      list: bindings.styleBindings, 
      getPath: (binding) => (binding as StyleBinding).propertyName 
    },
  ];

  for (const config of bindingConfigurations) {
    for (const binding of config.list) {
      tracker.registerDependency(binding, config.getPath(binding));
    }
  }
}
```

#### Ejemplo de Registro

```html
<pelela view-model="AppViewModel">
  <h1 bind-value="title"></h1>
  <p bind-value="description"></p>
  <span bind-value="user.name"></span>
</pelela>
```

Después del registro:

```
DependencyTracker.dependencies = Map {
  ValueBinding(<h1>) => Set { "title" },
  ValueBinding(<p>) => Set { "description" },
  ValueBinding(<span>) => Set { "user.name" }
}
```

### 4.8 Crear Función Render

La función render ya fue creada en `setupBindings` y asignada:

```typescript
render = setupBindings(root, reactiveInstance);
```

Ahora `render` en el scope del bootstrap contiene la función real.

### 4.9 Ejecutar Render Inicial

Esto también ocurre dentro de `setupBindings`:

```typescript
render();
return render;
```

El render inicial se ejecuta **sin argumentos**:

```typescript
render()
    │
    └─► changedPath = undefined
          │
          └─► targetBindings = bindings (ALL)
                │
                └─► executeRenderPipeline(ALL bindings)
                      │
                      ├─► renderForEachBindings()
                      ├─► renderValueBindings()
                      ├─► renderIfBindings()
                      ├─► renderClassBindings()
                      └─► renderStyleBindings()
```

Resultado: El DOM se sincroniza con el estado inicial del ViewModel.

### 4.10 Log de Confirmación

```typescript
console.log(
  `[pelela] View model "${name}" instantiated and bound`,
  reactiveInstance,
);
```

#### Output de Console

```
[pelela] View model "AppViewModel" instantiated and bound
Proxy {
  message: "Hello",
  count: 0,
  increment: [Function: increment]
}
```

#### Propósito

1. **Confirmación:** El ViewModel se inicializó correctamente
2. **Debugging:** Ver el nombre y estado inicial
3. **Development:** Identificar qué ViewModels están activos

## Timeline Completa del Bootstrap

```
TIEMPO   ACCIÓN
─────────────────────────────────────────────────────────────────

T=0ms    bootstrap() llamado
T=0ms    ├─► Configuración (doc, searchRoot)
T=1ms    ├─► querySelectorAll("pelela[view-model]")
T=2ms    │     └─► Encontrados: 2 elementos
T=2ms    │
T=2ms    ├─► Validación (2 > 0, no warning)
T=2ms    │
T=2ms    └─► Loop por elementos
T=2ms          │
T=2ms          ├─► Elemento 1: "AppViewModel"
T=2ms          │     │
T=2ms          │     ├─► getAttribute("view-model")
T=2ms          │     ├─► getViewModel("AppViewModel")
T=3ms          │     ├─► new AppViewModel()
T=3ms          │     ├─► createReactiveViewModel()
T=5ms          │     ├─► element.__pelelaViewModel = proxy
T=5ms          │     ├─► setupBindings()
T=5ms          │     │     ├─► setupForEachBindings()
T=6ms          │     │     ├─► setupValueBindings()
T=8ms          │     │     ├─► setupIfBindings()
T=9ms          │     │     ├─► setupClassBindings()
T=10ms         │     │     ├─► setupStyleBindings()
T=11ms         │     │     ├─► setupClickBindings()
T=12ms         │     │     ├─► new DependencyTracker()
T=12ms         │     │     ├─► registerDependencies()
T=13ms         │     │     ├─► render() inicial
T=15ms         │     │     └─► return render
T=15ms         │     │
T=15ms         │     └─► console.log()
T=15ms         │
T=15ms         └─► Elemento 2: "TodoViewModel"
T=15ms               └─► [Mismo proceso]
T=30ms               
T=30ms    bootstrap() completado
```

## Ejemplo Completo Paso a Paso

### HTML

```html
<!DOCTYPE html>
<html>
<body>
  <pelela view-model="CounterViewModel">
    <div>
      <p>Count: <span bind-value="count"></span></p>
      <button click="increment">+1</button>
    </div>
  </pelela>
  
  <script type="module" src="/main.ts"></script>
</body>
</html>
```

### TypeScript

```typescript
import { defineViewModel, bootstrap } from "@pelelajs/core";

class CounterViewModel {
  count = 0;
  
  increment() {
    this.count++;
  }
}

defineViewModel("CounterViewModel", CounterViewModel);
bootstrap();
```

### Traza Completa

```
1. Import modules
   └─► @pelelajs/core loaded

2. defineViewModel("CounterViewModel", CounterViewModel)
   └─► viewModelRegistry.set("CounterViewModel", CounterViewModel)

3. bootstrap()
   │
   ├─► doc = window.document
   ├─► searchRoot = window.document
   │
   ├─► querySelectorAll("pelela[view-model]")
   │     └─► Found: [<pelela view-model="CounterViewModel">]
   │
   ├─► roots.length = 1 (no warning)
   │
   └─► for (const root of roots)
         │
         └─► root = <pelela view-model="CounterViewModel">
               │
               ├─► name = "CounterViewModel"
               │
               ├─► ctor = class CounterViewModel
               │
               ├─► instance = { count: 0, increment: [Function] }
               │
               ├─► render = () => {}
               │
               ├─► reactiveInstance = Proxy {
               │     target: instance,
               │     onChange: (path) => render(path)
               │   }
               │
               ├─► root.__pelelaViewModel = reactiveInstance
               │
               ├─► render = setupBindings(root, reactiveInstance)
               │     │
               │     ├─► setupValueBindings()
               │     │     └─► Found: <span bind-value="count">
               │     │           └─► ValueBinding { element: <span>, propertyName: "count" }
               │     │
               │     ├─► setupClickBindings()
               │     │     └─► Found: <button click="increment">
               │     │           └─► addEventListener("click", ...)
               │     │
               │     ├─► tracker.registerDependency(ValueBinding, "count")
               │     │
               │     ├─► render = (changedPath?) => { ... }
               │     │
               │     ├─► render() inicial
               │     │     └─► <span>.textContent = "0"
               │     │
               │     └─► return render
               │
               └─► console.log("[pelela] View model "CounterViewModel" instantiated and bound")

4. Application ready

5. User clicks button
   │
   ├─► Event listener ejecuta
   │
   ├─► viewModel.increment()
   │     └─► this.count++
   │           │
   │           └─► Proxy.set("count", 1)
   │                 └─► onChange("count")
   │                       └─► render("count")
   │                             └─► <span>.textContent = "1"
   │
   └─► User ve "1"
```

## Múltiples Elementos Pelela

### HTML

```html
<body>
  <pelela view-model="HeaderViewModel">
    <nav bind-value="title"></nav>
  </pelela>
  
  <pelela view-model="AppViewModel">
    <main bind-value="content"></main>
  </pelela>
  
  <pelela view-model="FooterViewModel">
    <footer bind-value="copyright"></footer>
  </pelela>
</body>
```

### Proceso

```
bootstrap()
    │
    └─► querySelectorAll() → [Header, App, Footer]
          │
          ├─► Loop iteration 1: HeaderViewModel
          │     ├─► Instance 1 creada
          │     ├─► Proxy 1 creado
          │     ├─► Bindings 1 setup
          │     └─► Render 1 ejecutado
          │
          ├─► Loop iteration 2: AppViewModel
          │     ├─► Instance 2 creada
          │     ├─► Proxy 2 creado
          │     ├─► Bindings 2 setup
          │     └─► Render 2 ejecutado
          │
          └─► Loop iteration 3: FooterViewModel
                ├─► Instance 3 creada
                ├─► Proxy 3 creado
                ├─► Bindings 3 setup
                └─► Render 3 ejecutado
```

Cada ViewModel es **completamente independiente**:
- Instancias separadas
- Proxies separados
- Bindings separados
- Dependency trackers separados

## Errores Comunes y Soluciones

### Error 1: ViewModel No Registrado

```typescript
bootstrap();
```

```
Error: ViewModelRegistrationError: View model "AppViewModel" is not registered.
Did you forget to call defineViewModel("AppViewModel", AppViewModel)?
```

**Solución:**

```typescript
defineViewModel("AppViewModel", AppViewModel);
bootstrap();
```

### Error 2: Bootstrap Antes de DOM Ready

```typescript
bootstrap();
```

Si se ejecuta antes de que el DOM esté listo, `querySelectorAll` no encuentra elementos.

**Solución 1: defer/type="module"**

```html
<script type="module" src="/main.ts"></script>
```

Los módulos se cargan con defer automático.

**Solución 2: DOMContentLoaded**

```typescript
document.addEventListener("DOMContentLoaded", () => {
  bootstrap();
});
```

### Error 3: Typo en Nombre de ViewModel

```html
<pelela view-model="AppViewMdoel">
```

```typescript
defineViewModel("AppViewModel", AppViewModel);
```

```
Error: ViewModelRegistrationError: View model "AppViewMdoel" is not registered.
```

**Solución:** Corregir el typo en HTML o TypeScript.

### Error 4: Root No Contiene Elementos

```typescript
const wrongRoot = document.getElementById("nonexistent");
bootstrap({ root: wrongRoot });
```

```
TypeError: Cannot read properties of null (reading 'querySelectorAll')
```

**Solución:** Verificar que el root existe.

## Performance del Bootstrap

### Tiempo de Inicialización

Para una aplicación típica:

| Cantidad | Tiempo Aproximado |
|----------|-------------------|
| 1 ViewModel, 10 bindings | ~15-20ms |
| 3 ViewModels, 30 bindings | ~40-50ms |
| 10 ViewModels, 100 bindings | ~120-150ms |

### Optimizaciones Implementadas

1. **Query único:** `querySelectorAll` se ejecuta una sola vez
2. **Array.from una vez:** Conversión de NodeList a Array
3. **Cache de proxies:** Objetos anidados no se re-proxifican
4. **Dependency tracking:** Setup de dependencias en O(n)

### Bottlenecks Potenciales

1. **DOM queries:** `querySelectorAll` en cada binding setup
2. **Proxy creation:** Objetos muy anidados requieren múltiples proxies
3. **Initial render:** Actualización de todos los bindings

## Testing del Bootstrap

### Test Básico

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import { bootstrap, defineViewModel, clearRegistry } from "@pelelajs/core";

describe("bootstrap", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("should initialize ViewModel", () => {
    const dom = new JSDOM(`
      <pelela view-model="TestViewModel">
        <span bind-value="message"></span>
      </pelela>
    `);

    class TestViewModel {
      message = "Hello";
    }

    defineViewModel("TestViewModel", TestViewModel);
    bootstrap({ document: dom.window.document });

    const element = dom.window.document.querySelector("pelela");
    const vm = (element as any).__pelelaViewModel;

    expect(vm.message).toBe("Hello");
  });
});
```

## Conclusión

El proceso de bootstrap de PelelaJS:

1. **Es simple:** Un loop sobre elementos encontrados
2. **Es predecible:** Siempre el mismo flujo
3. **Es extensible:** Fácil agregar nuevos pasos
4. **Es testeable:** Mockeable con JSDOM
5. **Es performante:** Optimizado para apps pequeñas/medianas

El bootstrap es el punto de entrada del framework y establece toda la infraestructura reactiva necesaria para la aplicación.

## Referencias

- [Arquitectura General](../01-architecture/01-general-architecture.md)
- [Ciclo de Vida de la Aplicación](../01-architecture/02-application-lifecycle.md)
- [mountTemplate](./02-mount-template.md)
- [Sistema de Reactividad](../03-reactivity/01-reactive-proxy.md)
- [Setup de Bindings](../04-bindings/01-binding-system.md)

