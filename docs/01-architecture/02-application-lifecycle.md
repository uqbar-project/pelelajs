# 1.2 Ciclo de Vida de la Aplicación PelelaJS

## Introducción

El ciclo de vida de una aplicación PelelaJS comprende todas las fases desde que el código JavaScript se carga hasta que la aplicación está completamente funcional y responde a interacciones del usuario. Este documento detalla cada fase con precisión técnica.

## Visión General del Ciclo de Vida

```
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO DE VIDA COMPLETO                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CARGA DE MÓDULOS                                            │
│     ├─ Importar @pelelajs/core                                  │
│     ├─ Importar ViewModel classes                               │
│     └─ Ejecutar código de setup                                 │
│                      │                                           │
│                      ▼                                           │
│  2. REGISTRO DE VIEWMODELS                                      │
│     ├─ defineViewModel("Name", Constructor)                     │
│     └─ Guardar en Registry                                      │
│                      │                                           │
│                      ▼                                           │
│  3. BOOTSTRAP                                                    │
│     ├─ Buscar elementos <pelela view-model="...">               │
│     ├─ Validar ViewModels registrados                           │
│     └─ Para cada elemento encontrado:                           │
│         ├─ Instanciar ViewModel                                 │
│         ├─ Crear Reactive Proxy                                 │
│         ├─ Setup Bindings                                       │
│         └─ Render inicial                                       │
│                      │                                           │
│                      ▼                                           │
│  4. APLICACIÓN LISTA                                            │
│     ├─ DOM sincronizado con estado inicial                      │
│     ├─ Event listeners activos                                  │
│     └─ Sistema reactivo funcionando                             │
│                      │                                           │
│                      ▼                                           │
│  5. FASE INTERACTIVA                                            │
│     └─ Loop de interacción:                                     │
│         ├─ Usuario interactúa                                   │
│         ├─ Event handler modifica ViewModel                     │
│         ├─ Proxy detecta cambio                                 │
│         ├─ onChange() dispara re-render                         │
│         ├─ Dependency Tracker filtra bindings                   │
│         ├─ Re-render selectivo                                  │
│         └─ ↻ Vuelve al inicio del loop                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Fase 1: Carga de Módulos

### Código de Usuario

```typescript
import { defineViewModel, bootstrap } from "@pelelajs/core";
import "./app.css";

class AppViewModel {
  message = "Hello PelelaJS!";
  counter = 0;
  
  increment() {
    this.counter++;
  }
}

defineViewModel("AppViewModel", AppViewModel);
bootstrap();
```

### Diagrama de Carga

```
main.ts execution
       │
       ├─► import @pelelajs/core
       │         │
       │         ├─► export { defineViewModel }
       │         ├─► export { bootstrap }
       │         ├─► export { mountTemplate }
       │         └─► Módulos listos
       │
       ├─► import "./app.css"
       │         └─► Estilos aplicados al document
       │
       ├─► class AppViewModel { ... }
       │         └─► Clase definida en memoria
       │
       ├─► defineViewModel("AppViewModel", AppViewModel)
       │         │
       │         └─► Registry: Map { "AppViewModel" => AppViewModel }
       │
       └─► bootstrap()
                 └─► [Continúa en Fase 3]
```

### Detalles Internos

En esta fase, el JavaScript engine:

1. **Parse del código:** Convierte el código fuente a AST
2. **Resolución de imports:** Carga módulos desde node_modules o rutas relativas
3. **Ejecución de top-level code:** Ejecuta las declaraciones en orden
4. **Llamada a defineViewModel:** Registra la clase en el Map global

```typescript
const viewModelRegistry = new Map<string, ViewModelConstructor>();

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

**Estado del Registry después de esta fase:**

```
Map {
  "AppViewModel" => class AppViewModel { ... }
}
```

## Fase 2: Bootstrap - Descubrimiento

### Entrada a Bootstrap

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
```

### Diagrama de Descubrimiento

```
Document DOM
    │
    └─► querySelectorAll("pelela[view-model]")
              │
              ├─► <pelela view-model="AppViewModel">
              │        └─► roots[0]
              │
              ├─► <pelela view-model="TodoViewModel">
              │        └─► roots[1]
              │
              └─► <pelela view-model="UserViewModel">
                       └─► roots[2]

Resultado: roots = [elemento1, elemento2, elemento3]
```

### Ejemplo de HTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>PelelaJS App</title>
</head>
<body>
  <div id="app">
    <pelela view-model="AppViewModel">
      <h1 bind-value="message"></h1>
      <p>Counter: <span bind-value="counter"></span></p>
      <button click="increment">+1</button>
    </pelela>
  </div>
  
  <script type="module" src="/main.ts"></script>
</body>
</html>
```

## Fase 3: Bootstrap - Inicialización por Elemento

Para cada elemento `<pelela>` encontrado, se ejecuta el siguiente proceso:

### 3.1 Obtención del ViewModel

```typescript
for (const root of roots) {
  const name = root.getAttribute("view-model");
  if (!name) continue;

  const ctor = getViewModel(name);
  if (!ctor) {
    throw new ViewModelRegistrationError(name, "missing");
  }
```

```
root element: <pelela view-model="AppViewModel">
     │
     ├─► getAttribute("view-model") = "AppViewModel"
     │
     └─► getViewModel("AppViewModel")
              │
              └─► viewModelRegistry.get("AppViewModel")
                       │
                       └─► Returns: class AppViewModel { ... }
```

### 3.2 Instanciación del ViewModel

```typescript
  const instance = new ctor();
```

```
Constructor: class AppViewModel {
  message = "Hello PelelaJS!";
  counter = 0;
  
  increment() {
    this.counter++;
  }
}

Resultado: instance = {
  message: "Hello PelelaJS!",
  counter: 0,
  increment: function() { this.counter++; }
}
```

**Estado en memoria:**

```
instance (Plain Object)
├─ message: "Hello PelelaJS!"
├─ counter: 0
└─ increment: [Function]
```

### 3.3 Creación del Reactive Proxy

```typescript
  let render: (changedPath?: string) => void = () => {};

  const reactiveInstance = createReactiveViewModel(
    instance as Record<string, unknown>,
    (changedPath: string) => {
      render(changedPath);
    },
  );
```

#### Diagrama de Transformación Reactiva

```
ANTES (Plain Object)                    DESPUÉS (Reactive Proxy)
────────────────────                    ─────────────────────────

instance = {                            reactiveInstance = Proxy {
  message: "Hello",        ─────►         target: instance,
  counter: 0,                             handler: {
  increment: [Function]                     get(obj, prop) { ... },
}                                           set(obj, prop, val) {
                                              ...
                                              onChange(changedPath);
                                              return true;
                                            },
                                            deleteProperty(obj, prop) { ... }
                                          }
                                        }

Acceso:                                 Acceso:
  instance.counter                        reactiveInstance.counter
  └─► Lee directamente                    └─► Interceptado por get()

Modificación:                           Modificación:
  instance.counter = 1                    reactiveInstance.counter = 1
  └─► Sin notificación                    ├─► Interceptado por set()
                                          ├─► Actualiza valor
                                          └─► onChange("counter")
```

#### Código Interno del Proxy

```typescript
const handler: ProxyHandler<any> = {
  get(obj, prop) {
    if (prop === "$raw") {
      return obj;
    }

    const value = Reflect.get(obj, prop);

    if (isObject(value)) {
      const childPath = parentPath 
        ? `${parentPath}.${String(prop)}` 
        : String(prop);
      return makeReactive(value, onChange, newVisited, childPath);
    }

    return value;
  },

  set(obj, prop, value) {
    const oldValue = obj[prop];

    if (oldValue === value) {
      return true;
    }

    const reactiveValue = isObject(value)
      ? makeReactive(value, onChange, new WeakSet(), parentPath)
      : value;

    const result = Reflect.set(obj, prop, reactiveValue);

    if (result) {
      const fullPath = parentPath ? `${parentPath}.${String(prop)}` : String(prop);
      onChange(fullPath);
    }

    return result;
  },
};
```

### 3.4 Almacenamiento en el Elemento

```typescript
  (root as any).__pelelaViewModel = reactiveInstance;
```

```
<pelela view-model="AppViewModel">
    │
    └─► .__pelelaViewModel = Proxy { ... }
    
Esto permite acceder al ViewModel desde el DOM:
  element.__pelelaViewModel.counter
  element.__pelelaViewModel.increment()
```

### 3.5 Setup de Bindings

```typescript
  render = setupBindings(root, reactiveInstance);
```

#### Diagrama del Proceso de Setup

```
setupBindings(root, viewModel)
       │
       ├─► setupForEachBindings()
       │        │
       │        └─► querySelectorAll("[for-each]")
       │                  └─► forEachBindings: []
       │
       ├─► setupValueBindings()
       │        │
       │        └─► querySelectorAll("[bind-value]")
       │                  │
       │                  ├─► <h1 bind-value="message">
       │                  │        └─► { element, propertyName: "message", isInput: false }
       │                  │
       │                  └─► <span bind-value="counter">
       │                           └─► { element, propertyName: "counter", isInput: false }
       │
       ├─► setupIfBindings()
       │        │
       │        └─► querySelectorAll("[if]")
       │                  └─► ifBindings: []
       │
       ├─► setupClassBindings()
       │        │
       │        └─► querySelectorAll("[bind-class]")
       │                  └─► classBindings: []
       │
       ├─► setupStyleBindings()
       │        │
       │        └─► querySelectorAll("[bind-style]")
       │                  └─► styleBindings: []
       │
       └─► setupClickBindings()
                │
                └─► querySelectorAll("[click]")
                          │
                          └─► <button click="increment">
                                    │
                                    └─► addEventListener("click", (event) => {
                                          viewModel.increment.call(viewModel, event);
                                        })
```

#### Estructura de BindingsCollection

```typescript
const bindings: BindingsCollection = {
  forEachBindings: [],
  valueBindings: [
    { 
      element: <h1>,
      propertyName: "message",
      isInput: false
    },
    { 
      element: <span>,
      propertyName: "counter",
      isInput: false
    }
  ],
  ifBindings: [],
  classBindings: [],
  styleBindings: []
};
```

### 3.6 Registro de Dependencias

```typescript
const tracker = new DependencyTracker();
registerAllBindingDependencies(bindings, tracker);
```

```
DependencyTracker
    │
    └─► dependencies: Map {
          ValueBinding(<h1>) => Set { "message" },
          ValueBinding(<span>) => Set { "counter" }
        }

Esta estructura permite:
  tracker.getDependentBindings("message")
    └─► Returns: [ValueBinding(<h1>)]
  
  tracker.getDependentBindings("counter")
    └─► Returns: [ValueBinding(<span>)]
```

### 3.7 Creación de la Función Render

```typescript
const render = (changedPath?: string) => {
  const targetBindings = changedPath 
    ? tracker.getDependentBindings(changedPath, bindings)
    : bindings;

  executeRenderPipeline(targetBindings, viewModel);
};
```

#### Flujo de la Función Render

```
render(changedPath?)
    │
    ├─ Si changedPath === undefined
    │       │
    │       └─► targetBindings = ALL bindings
    │
    └─ Si changedPath === "counter"
            │
            └─► tracker.getDependentBindings("counter")
                     │
                     └─► targetBindings = bindings que dependen de "counter"
                              │
                              └─► executeRenderPipeline(targetBindings, viewModel)
                                       │
                                       ├─► renderForEachBindings([])
                                       ├─► renderValueBindings([ValueBinding(<span>)])
                                       ├─► renderIfBindings([])
                                       ├─► renderClassBindings([])
                                       └─► renderStyleBindings([])
```

### 3.8 Render Inicial

```typescript
render();
return render;
```

```
render() sin argumentos
    │
    └─► targetBindings = ALL bindings
              │
              └─► executeRenderPipeline(ALL, viewModel)
                       │
                       └─► renderValueBindings([...])
                                 │
                                 ├─► <h1>.textContent = "Hello PelelaJS!"
                                 └─► <span>.textContent = "0"
```

**Estado del DOM después del render inicial:**

```html
<pelela view-model="AppViewModel">
  <h1 bind-value="message">Hello PelelaJS!</h1>
  <p>Counter: <span bind-value="counter">0</span></p>
  <button click="increment">+1</button>
</pelela>
```

### 3.9 Conexión del Callback onChange

```typescript
const reactiveInstance = createReactiveViewModel(
  instance,
  (changedPath: string) => {
    render(changedPath);
  },
);
```

```
Reactive Proxy
    │
    └─► onChange callback = (changedPath) => render(changedPath)
              │
              └─► Esta función será invocada cada vez que
                  el Proxy detecte una modificación

Ejemplo:
  reactiveInstance.counter = 5
       │
       ├─► Proxy.set() intercepta
       ├─► Actualiza obj.counter = 5
       └─► onChange("counter")
                │
                └─► render("counter")
                         │
                         └─► Re-render selectivo
```

### 3.10 Log de Confirmación

```typescript
console.log(
  `[pelela] View model "${name}" instantiated and bound`,
  reactiveInstance,
);
```

Output en consola:

```
[pelela] View model "AppViewModel" instantiated and bound
Proxy {
  message: "Hello PelelaJS!",
  counter: 0,
  increment: [Function: increment]
}
```

## Fase 4: Aplicación Lista

En este punto, la aplicación está completamente inicializada:

```
ESTADO COMPLETO
────────────────────────────────────────────────────────

1. REGISTRY
   ├─ Map { "AppViewModel" => class AppViewModel }

2. DOM
   ├─ <pelela view-model="AppViewModel">
   │    ├─ .__pelelaViewModel = Proxy { ... }
   │    ├─ <h1> muestra "Hello PelelaJS!"
   │    ├─ <span> muestra "0"
   │    └─ <button> tiene event listener

3. REACTIVE PROXY
   ├─ Intercepta gets/sets
   └─ onChange conectado a render()

4. BINDINGS
   ├─ valueBindings: [2 bindings]
   ├─ clickBindings: [1 listener registrado]
   └─ Otros bindings: []

5. DEPENDENCY TRACKER
   ├─ "message" → ValueBinding(<h1>)
   └─ "counter" → ValueBinding(<span>)

6. RENDER FUNCTION
   └─ Captura bindings y viewModel en closure
```

## Fase 5: Ciclo de Interacción

### Escenario: Usuario hace click en el botón

```
┌─────────────────────────────────────────────────────────────┐
│               CICLO COMPLETO DE INTERACCIÓN                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Usuario hace click en <button>                          │
│                    │                                         │
│                    ▼                                         │
│  2. Browser dispara "click" event                           │
│                    │                                         │
│                    ▼                                         │
│  3. Event listener registrado se ejecuta                    │
│                    │                                         │
│                    └─► viewModel.increment.call(viewModel)  │
│                                  │                           │
│                                  ▼                           │
│  4. Ejecución del método                                    │
│                                  │                           │
│     increment() {                │                           │
│       this.counter++;  ◄─────────┘                          │
│     }                                                        │
│                    │                                         │
│                    ▼                                         │
│  5. Asignación: this.counter = this.counter + 1             │
│                    │                                         │
│                    ├─► Lee: this.counter                     │
│                    │         │                               │
│                    │         └─► Proxy.get("counter")        │
│                    │                   └─► return 0          │
│                    │                                         │
│                    └─► Escribe: this.counter = 1             │
│                              │                               │
│                              └─► Proxy.set("counter", 1)     │
│                                        │                     │
│                                        ├─► obj.counter = 1   │
│                                        │                     │
│                                        └─► onChange("counter")│
│                                                  │            │
│                                                  ▼            │
│  6. Invocación de render("counter")                          │
│                    │                                         │
│                    └─► tracker.getDependentBindings()        │
│                              │                               │
│                              └─► [ValueBinding(<span>)]      │
│                                        │                     │
│                                        ▼                     │
│  7. executeRenderPipeline()                                  │
│                    │                                         │
│                    └─► renderValueBindings()                 │
│                              │                               │
│                              └─► <span>.textContent = "1"    │
│                                                              │
│  8. DOM actualizado, usuario ve "1"                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Timing Detallado

```
T=0ms:    Click event
T=0ms:    Event listener invocado
T=0ms:    increment() ejecutado
T=0ms:    Proxy.set() detecta cambio
T=0ms:    onChange("counter") invocado
T=0ms:    render("counter") ejecutado
T=0ms:    getDependentBindings() filtra
T=1ms:    renderValueBindings() actualiza DOM
T=1ms:    Browser re-paint
T=16ms:   Usuario ve actualización (siguiente frame)
```

### Ejemplo con Múltiples Cambios

```typescript
class AppViewModel {
  firstName = "John";
  lastName = "Doe";
  
  updateName() {
    this.firstName = "Jane";
    this.lastName = "Smith";
  }
}
```

```
updateName() ejecutado
       │
       ├─► this.firstName = "Jane"
       │         │
       │         └─► Proxy.set() → onChange("firstName") → render("firstName")
       │                                                         │
       │                                                         └─► Re-render bindings de firstName
       │
       └─► this.lastName = "Smith"
                 │
                 └─► Proxy.set() → onChange("lastName") → render("lastName")
                                                              │
                                                              └─► Re-render bindings de lastName

Resultado: 2 renders separados (uno por cada propiedad)
```

### Optimización: Batch Updates

PelelaJS actualmente NO implementa batching, por lo que cada cambio dispara un render individual. En frameworks de producción esto se optimiza:

```
Framework con batching:
  updateName() {
    this.firstName = "Jane";   ─┐
    this.lastName = "Smith";    ├─► Cambios acumulados
  }                            ─┘
         │
         └─► Al finalizar función: render UNA VEZ con todos los cambios
```

## Ciclo de Vida de Bindings Específicos

### bind-value en Input (Two-Way)

```
SETUP
─────
<input bind-value="name">
    │
    ├─► setupSingleValueBinding()
    │        │
    │        ├─► assertViewModelProperty(vm, "name")
    │        │
    │        ├─► addEventListener("input", (event) => {
    │        │     const value = event.target.value;
    │        │     setNestedProperty(vm, "name", value);
    │        │   })
    │        │
    │        └─► return { element, propertyName: "name", isInput: true }
    │
    └─► Binding registrado


INTERACCIÓN: Usuario escribe "Hello"
────────────────────────────────────
1. Usuario presiona tecla "H"
2. Browser actualiza input.value = "H"
3. Browser dispara "input" event
4. Event listener ejecuta:
     setNestedProperty(vm, "name", "H")
          │
          └─► vm.name = "H"
                │
                └─► Proxy.set() → onChange("name") → render("name")
                                                           │
                                                           └─► <input>.value = "H"
                                                               (ya está actualizado, no hace nada)

5. Se repite para cada tecla: "He", "Hel", "Hell", "Hello"
```

### for-each Binding

```
SETUP
─────
<div for-each="item of items">
  <span bind-value="item.name"></span>
</div>

1. parseForEachExpression("item of items")
     └─► { itemName: "item", collectionName: "items" }

2. Clone del template
     └─► template = <div> (sin atributo for-each)

3. Crear placeholder comment
     └─► <!-- for-each: item of items -->

4. Reemplazar elemento por placeholder
     
5. Return binding:
     {
       collectionName: "items",
       itemName: "item",
       template: <div>...</div>,
       placeholder: Comment,
       renderedElements: [],
       previousLength: 0
     }


RENDER INICIAL (items = [])
───────────────────────────
renderSingleForEachBinding()
    │
    └─► collection.length = 0
              │
              └─► No se crean elementos


CAMBIO: items.push({ name: "Task 1" })
───────────────────────────────────────
1. Array.prototype.push interceptado por Proxy
2. onChange("items") invocado
3. render("items") ejecutado
4. renderSingleForEachBinding() ejecutado
     │
     ├─► currentLength = 1, previousLength = 0
     │
     ├─► addNewElements()
     │      │
     │      └─► createNewElement(binding, vm, { name: "Task 1" }, 0)
     │            │
     │            ├─► Clone template
     │            ├─► Crear itemRef = { current: { name: "Task 1" } }
     │            ├─► Crear extendedViewModel (Proxy)
     │            ├─► setupBindingsForElement()
     │            ├─► Insertar en DOM después del placeholder
     │            └─► render() del elemento
     │
     └─► previousLength = 1

Resultado en DOM:
  <!-- for-each: item of items -->
  <div>
    <span>Task 1</span>
  </div>
```

## Diagrama de Timing Completo

```
TIMELINE DE INICIALIZACIÓN
─────────────────────────────────────────────────────────

T=0ms        JavaScript start
               │
T=0ms        ├─► import modules
T=5ms        │
               │
T=5ms        ├─► defineViewModel()
T=5ms        │
               │
T=5ms        ├─► bootstrap() start
T=5ms        │     │
               │     ├─► querySelectorAll()
T=6ms        │     │
               │     │
T=6ms        │     ├─► new ViewModel()
T=6ms        │     │
               │     │
T=6ms        │     ├─► createReactiveViewModel()
T=8ms        │     │
               │     │
T=8ms        │     ├─► setupBindings()
T=15ms       │     │     ├─► querySelectorAll() x5
               │     │     └─► addEventListener()
               │     │
T=15ms       │     ├─► registerDependencies()
T=16ms       │     │
               │     │
T=16ms       │     ├─► render() inicial
T=18ms       │     │
               │     │
T=18ms       │     └─► console.log()
T=18ms       │
               │
T=18ms       └─► bootstrap() end
               │
T=18ms       Application Ready
               │
T=18ms       Browser paint
T=34ms       First Contentful Paint (visible para usuario)
```

## Resumen de Estados

| Fase | Estado Registry | Estado DOM | Estado Proxy | Bindings | Render Function |
|------|----------------|------------|--------------|----------|-----------------|
| 1. Carga | Empty | HTML estático | No existe | No existen | No existe |
| 2. Registro | Populated | HTML estático | No existe | No existen | No existe |
| 3. Bootstrap Start | Populated | HTML estático | No existe | No existen | No existe |
| 4. Instanciación | Populated | HTML estático | Creado | Setup en proceso | Creándose |
| 5. Setup Complete | Populated | HTML estático | Activo | Registrados | Creada |
| 6. After Initial Render | Populated | Sincronizado | Activo | Activos | Lista |
| 7. Fase Interactiva | Populated | Reactivo | Activo | Activos | Ejecutándose |

## Ejemplo Completo con Traces

```typescript
class CounterViewModel {
  count = 0;
  
  increment() {
    console.log("[user] increment() called, count antes:", this.count);
    this.count++;
    console.log("[user] increment() finished, count después:", this.count);
  }
}
```

Console output durante click:

```
[user] increment() called, count antes: 0
[pelela] Proxy.set: property="count", oldValue=0, newValue=1
[pelela] onChange: changedPath="count"
[pelela] render: changedPath="count"
[pelela] getDependentBindings: found 1 binding(s)
[pelela] renderValueBinding: element=SPAN, property="count", value=1
[pelela] set textContent: SPAN to: "1"
[user] increment() finished, count después: 1
```

## Consideraciones de Performance

### Tiempo de Bootstrap

Para una aplicación típica:
- **1 ViewModel:** ~15-20ms
- **10 Bindings:** ~5ms adicionales
- **100 Bindings:** ~30ms adicionales

### Tiempo de Render

- **Render completo:** O(n) donde n = número de bindings
- **Render selectivo:** O(m) donde m = bindings afectados (típicamente << n)

### Memory Footprint

Por cada ViewModel:
- Registry entry: ~100 bytes
- Reactive Proxy: ~500 bytes
- Bindings: ~200 bytes por binding
- Dependency map: ~100 bytes por dependencia

## Conclusión

El ciclo de vida de PelelaJS es lineal y predecible:
1. **Carga:** Módulos y clases
2. **Registro:** ViewModels en el registry
3. **Bootstrap:** Descubrimiento e inicialización
4. **Setup:** Bindings y dependencias
5. **Render inicial:** Sincronización DOM-ViewModel
6. **Loop interactivo:** Cambios → onChange → render selectivo

Cada fase tiene responsabilidades claras y el flujo es fácil de seguir con debugging tools o console logs.

## Referencias

- [Arquitectura General](./01-general-architecture.md)
- [Flujo de Datos Reactivo](./03-reactive-data-flow.md)
- [Sistema de Bootstrap](../02-bootstrap/01-bootstrap-process.md)
- [Sistema de Bindings](../04-bindings/01-binding-system.md)

