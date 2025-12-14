# 4.1 Sistema de Binding General

## Introducción

El sistema de bindings de PelelaJS es el puente entre el ViewModel y el DOM. Permite que los cambios en el ViewModel se reflejen automáticamente en la interfaz de usuario sin código imperativo manual.

Este documento explica cómo funciona el sistema general de bindings: el setup, el render pipeline, y la estructura de datos que los mantiene organizados.

## Arquitectura del Sistema de Bindings

```
┌─────────────────────────────────────────────────────────────────┐
│                   BINDING SYSTEM ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FASE 1: SETUP                                                  │
│  ──────────────                                                 │
│  setupBindings(root, viewModel)                                 │
│       │                                                          │
│       ├─► setupForEachBindings()  → ForEachBinding[]            │
│       ├─► setupValueBindings()    → ValueBinding[]              │
│       ├─► setupContentBindings()  → ContentBinding[]            │
│       ├─► setupIfBindings()       → IfBinding[]                 │
│       ├─► setupClassBindings()    → ClassBinding[]              │
│       ├─► setupStyleBindings()    → StyleBinding[]              │
│       └─► setupClickBindings()    → Event Listeners             │
│                                                                  │
│  FASE 2: REGISTRO DE DEPENDENCIAS                               │
│  ─────────────────────────────────                              │
│  DependencyTracker.register(binding, propertyPath)              │
│                                                                  │
│  FASE 3: CREACIÓN DE RENDER FUNCTION                            │
│  ────────────────────────────────────                           │
│  render = (changedPath?) => {                                   │
│    const targetBindings = changedPath                           │
│      ? tracker.getDependentBindings(changedPath)                │
│      : allBindings;                                             │
│    executeRenderPipeline(targetBindings, viewModel);            │
│  }                                                               │
│                                                                  │
│  FASE 4: RENDER INICIAL                                         │
│  ───────────────────────                                        │
│  render() → Sincroniza DOM con estado inicial                   │
│                                                                  │
│  FASE 5: RENDER REACTIVO                                        │
│  ───────────────────────                                        │
│  onChange(path) → render(path) → Actualización selectiva        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## setupBindings: Función Principal

### Signatura

```typescript
export function setupBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): (changedPath?: string) => void
```

### Parámetros

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `root` | `HTMLElement` | Elemento raíz donde buscar bindings |
| `viewModel` | `ViewModel<T>` | ViewModel reactivo |

### Retorno

Función `render` que acepta un `changedPath` opcional y actualiza el DOM.

### Código Fuente Completo

```typescript
export function setupBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): (changedPath?: string) => void {
  const bindings: BindingsCollection = {
    forEachBindings: setupForEachBindings(root, viewModel),
    valueBindings: setupValueBindings(root, viewModel),
    contentBindings: setupContentBindings(root, viewModel),
    ifBindings: setupIfBindings(root, viewModel),
    classBindings: setupClassBindings(root, viewModel),
    styleBindings: setupStyleBindings(root, viewModel),
  };

  setupClickBindings(root, viewModel);

  const tracker = new DependencyTracker();
  registerAllBindingDependencies(bindings, tracker, viewModel);

  const render = (changedPath?: string) => {
    const targetBindings = changedPath 
      ? tracker.getDependentBindingsWithGetterSupport(changedPath, bindings)
      : bindings;

    executeRenderPipeline(targetBindings, viewModel);
  };

  render();
  return render;
}
```

## BindingsCollection: Estructura de Datos

### Definición

```typescript
export type BindingsCollection = {
  valueBindings: ValueBinding[];
  contentBindings: ContentBinding[];
  ifBindings: IfBinding[];
  classBindings: ClassBinding[];
  styleBindings: StyleBinding[];
  forEachBindings: ForEachBinding[];
};
```

### Propósito

La `BindingsCollection` agrupa todos los bindings por tipo, permitiendo:

1. **Organización:** Cada tipo de binding en su array
2. **Iteración eficiente:** Fácil iterar por tipo
3. **Render ordenado:** Ejecutar renders en orden específico
4. **Type safety:** TypeScript valida la estructura

### Ejemplo de Collection

```html
<pelela view-model="AppViewModel">
  <input bind-value="title" />
  <h1 bind-content="title"></h1>
  <p if="showDescription" bind-content="description"></p>
  <button click="handleClick" bind-class="buttonClass">Click</button>
  <div for-each="item of items">
    <span bind-content="item.name"></span>
  </div>
</pelela>
```

Resultado después de setup:

```typescript
bindings = {
  valueBindings: [
    { element: <input>, propertyName: "title" }
  ],
  contentBindings: [
    { element: <h1>, propertyName: "title" },
    { element: <p>, propertyName: "description" },
    { element: <span>, propertyName: "item.name" }
  ],
  ifBindings: [
    { element: <p>, propertyName: "showDescription", originalDisplay: "" }
  ],
  classBindings: [
    { element: <button>, propertyName: "buttonClass", staticClassName: "" }
  ],
  styleBindings: [],
  forEachBindings: [
    {
      collectionName: "items",
      itemName: "item",
      template: <div>,
      placeholder: Comment,
      renderedElements: [],
      previousLength: 0
    }
  ]
}
```

### Tipos de Bindings

#### ValueBinding

```typescript
export type ValueBinding = {
  element: HTMLElement;
  propertyName: string;
};
```

**Propósito:** Sincronizar el valor de una propiedad con elementos de formulario (input, textarea, select).

**Atributo HTML:** `bind-value="propertyName"`

**Características:** Bidireccional, solo para inputs.

#### ContentBinding

```typescript
export type ContentBinding = {
  element: HTMLElement;
  propertyName: string;
};
```

**Propósito:** Mostrar contenido de una propiedad en elementos de display (span, div, p, etc.).

**Atributo HTML:** `bind-content="propertyName"`

**Características:** Unidireccional, usa innerHTML.

#### IfBinding

```typescript
export type IfBinding = {
  element: HTMLElement;
  propertyName: string;
  originalDisplay: string;
};
```

**Propósito:** Mostrar/ocultar elementos basado en una condición.

**Atributo HTML:** `if="propertyName"`

#### ClassBinding

```typescript
export type ClassBinding = {
  element: HTMLElement;
  propertyName: string;
  staticClassName: string;
};
```

**Propósito:** Aplicar clases CSS dinámicas.

**Atributo HTML:** `bind-class="propertyName"`

#### StyleBinding

```typescript
export type StyleBinding = {
  element: HTMLElement;
  propertyName: string;
};
```

**Propósito:** Aplicar estilos inline dinámicos.

**Atributo HTML:** `bind-style="propertyName"`

#### ForEachBinding

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

**Propósito:** Renderizar listas de elementos.

**Atributo HTML:** `for-each="item of collection"`

## Fase 1: Setup de Bindings

### Proceso de Setup

```
setupBindings(root, viewModel)
    │
    ├─► 1. setupForEachBindings(root, viewModel)
    │     │
    │     ├─► querySelectorAll("[for-each]")
    │     │
    │     └─► Para cada elemento:
    │           ├─ Parse expresión
    │           ├─ Validar colección
    │           ├─ Clonar template
    │           ├─ Crear placeholder
    │           └─ Reemplazar elemento
    │
    ├─► 2. setupValueBindings(root, viewModel)
    │     │
    │     ├─► querySelectorAll("[bind-value]")
    │     │
    │     └─► Para cada elemento:
    │           ├─ Obtener propertyName
    │           ├─ Validar propiedad
    │           ├─ Detectar si es input
    │           ├─ Agregar event listener si es input
    │           └─ Crear ValueBinding
    │
    ├─► 3. setupIfBindings(root, viewModel)
    │     │
    │     ├─► querySelectorAll("[if]")
    │     │
    │     └─► Para cada elemento:
    │           ├─ Obtener propertyName
    │           ├─ Validar propiedad
    │           ├─ Guardar display original
    │           └─ Crear IfBinding
    │
    ├─► 4. setupClassBindings(root, viewModel)
    │     │
    │     ├─► querySelectorAll("[bind-class]")
    │     │
    │     └─► Para cada elemento:
    │           ├─ Obtener propertyName
    │           ├─ Validar propiedad
    │           ├─ Guardar clases estáticas
    │           └─ Crear ClassBinding
    │
    ├─► 5. setupStyleBindings(root, viewModel)
    │     │
    │     ├─► querySelectorAll("[bind-style]")
    │     │
    │     └─► Para cada elemento:
    │           ├─ Obtener propertyName
    │           ├─ Validar propiedad
    │           └─ Crear StyleBinding
    │
    └─► 6. setupClickBindings(root, viewModel)
          │
          ├─► querySelectorAll("[click]")
          │
          └─► Para cada elemento:
                ├─ Obtener handlerName
                └─ Agregar event listener
```

### Orden de Setup

El orden es **importante**:

1. **for-each primero:** Modifica el DOM (remueve elementos)
2. **Otros bindings después:** Operan sobre el DOM ya procesado
3. **click último:** Solo agrega listeners, no modifica estructura

### Ejemplo Detallado

```html
<pelela view-model="TodoViewModel">
  <input bind-value="newTodo">
  <button click="addTodo">Add</button>
  <div for-each="todo of todos">
    <span bind-value="todo.title" if="todo.visible"></span>
  </div>
</pelela>
```

```typescript
class TodoViewModel {
  newTodo = "";
  todos = [
    { title: "Task 1", visible: true },
    { title: "Task 2", visible: false }
  ];
  
  addTodo() {
    this.todos.push({ title: this.newTodo, visible: true });
    this.newTodo = "";
  }
}
```

**Traza de Setup:**

```
1. setupForEachBindings()
   └─► <div for-each="todo of todos">
         ├─ Parse: itemName="todo", collectionName="todos"
         ├─ Validar: viewModel.todos existe? SÍ
         ├─ Template: clone de <div>
         ├─ Placeholder: <!-- for-each: todo of todos -->
         └─ DOM: <div> reemplazado por comment

2. setupValueBindings()
   ├─► <input bind-value="newTodo">
   │     ├─ propertyName = "newTodo"
   │     ├─ isInput = true
   │     ├─ addEventListener("input", ...)
   │     └─ ValueBinding { element: <input>, propertyName: "newTodo", isInput: true }
   │
   └─► Los <span> dentro del for-each NO se encuentran aún
       (serán procesados cuando for-each renderice)

3. setupIfBindings()
   └─► NO encuentra elementos (el <span> está en el template, no en el DOM)

4. setupClassBindings()
   └─► NO encuentra elementos

5. setupStyleBindings()
   └─► NO encuentra elementos

6. setupClickBindings()
   └─► <button click="addTodo">
         ├─ handlerName = "addTodo"
         ├─ addEventListener("click", ...)
         └─ Handler registrado

Resultado:
bindings = {
  valueBindings: [{ <input> }],
  ifBindings: [],
  classBindings: [],
  styleBindings: [],
  forEachBindings: [{ collectionName: "todos", ... }]
}
```

## Fase 2: Registro de Dependencias

### registerAllBindingDependencies

```typescript
function registerAllBindingDependencies(
  bindings: BindingsCollection,
  tracker: DependencyTracker
): void {
  const bindingConfigurations: Array<{
    list: AnyBinding[];
    getPath: (binding: AnyBinding) => string;
  }> = [
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

### Propósito

Construir el mapa de dependencias:

```
Binding → PropertyPath

Esta información permite después filtrar qué bindings 
necesitan re-renderizarse cuando una propiedad cambia.
```

### Ejemplo de Registro

```typescript
bindings = {
  valueBindings: [
    { element: <h1>, propertyName: "title" },
    { element: <p>, propertyName: "description" }
  ],
  ifBindings: [
    { element: <div>, propertyName: "isVisible" }
  ]
}

tracker.registerDependency(valueBinding1, "title")
tracker.registerDependency(valueBinding2, "description")
tracker.registerDependency(ifBinding1, "isVisible")
```

Resultado en el tracker:

```
DependencyTracker.dependencies = Map {
  valueBinding1 => Set { "title" },
  valueBinding2 => Set { "description" },
  ifBinding1 => Set { "isVisible" }
}
```

## Fase 3: Creación de la Función Render

### Render Function

```typescript
const render = (changedPath?: string) => {
  const targetBindings = changedPath 
    ? tracker.getDependentBindings(changedPath, bindings)
    : bindings;

  executeRenderPipeline(targetBindings, viewModel);
};
```

### Dos Modos de Render

#### Modo 1: Render Completo (sin changedPath)

```typescript
render()
```

```
changedPath = undefined
    │
    └─► targetBindings = bindings (TODOS)
          │
          └─► Renderiza TODOS los bindings
```

**Uso:** Render inicial después del setup.

#### Modo 2: Render Selectivo (con changedPath)

```typescript
render("user.name")
```

```
changedPath = "user.name"
    │
    └─► tracker.getDependentBindings("user.name", bindings)
          │
          ├─► Filtra bindings que dependen de "user.name"
          │
          └─► targetBindings = solo bindings afectados
                │
                └─► Renderiza SOLO bindings filtrados
```

**Uso:** Re-renders después de cambios en el ViewModel.

### Closure de la Función Render

La función `render` captura en su closure:

```typescript
const render = (changedPath?: string) => {
  const targetBindings = changedPath 
    ? tracker.getDependentBindings(changedPath, bindings)
    : bindings;

  executeRenderPipeline(targetBindings, viewModel);
};
```

**Variables capturadas:**
- `tracker`: DependencyTracker
- `bindings`: BindingsCollection
- `viewModel`: Reactive ViewModel

Estas permanecen en memoria mientras el elemento `<pelela>` exista.

### Memory Layout

```
Heap:
  ├─ ViewModel (Proxy)
  ├─ BindingsCollection
  │   ├─ valueBindings[]
  │   ├─ ifBindings[]
  │   └─ ...
  ├─ DependencyTracker
  │   └─ dependencies Map
  └─ render() function
      └─ [[Scope]]: closure sobre ViewModel, bindings, tracker
```

## Fase 4: Render Inicial

### Llamada Inicial

```typescript
render();
return render;
```

El setup ejecuta `render()` una vez al final:

```
render()
    │
    ├─► changedPath = undefined
    │
    ├─► targetBindings = ALL bindings
    │
    └─► executeRenderPipeline(all, viewModel)
          │
          └─► Sincroniza DOM con estado inicial del ViewModel
```

### Propósito

1. **Sincronización inicial:** DOM refleja el estado del ViewModel
2. **Validación:** Detecta errores de binding temprano
3. **UX:** Usuario ve contenido inmediatamente

## executeRenderPipeline: Render Pipeline

### Código Fuente

```typescript
function executeRenderPipeline<T extends object>(
  targetBindings: BindingsCollection,
  viewModel: ViewModel<T>
): void {
  if (targetBindings.forEachBindings.length > 0) {
    renderForEachBindings(targetBindings.forEachBindings, viewModel);
  }
  if (targetBindings.valueBindings.length > 0) {
    renderValueBindings(targetBindings.valueBindings, viewModel);
  }
  if (targetBindings.ifBindings.length > 0) {
    renderIfBindings(targetBindings.ifBindings, viewModel);
  }
  if (targetBindings.classBindings.length > 0) {
    renderClassBindings(targetBindings.classBindings, viewModel);
  }
  if (targetBindings.styleBindings.length > 0) {
    renderStyleBindings(targetBindings.styleBindings, viewModel);
  }
}
```

### Orden del Pipeline

```
┌────────────────────────────────────┐
│      RENDER PIPELINE ORDER         │
├────────────────────────────────────┤
│                                     │
│  1. for-each                       │
│     └─► Crea/elimina elementos     │
│                                     │
│  2. bind-value                     │
│     └─► Actualiza contenido        │
│                                     │
│  3. if                             │
│     └─► Muestra/oculta             │
│                                     │
│  4. bind-class                     │
│     └─► Aplica clases              │
│                                     │
│  5. bind-style                     │
│     └─► Aplica estilos             │
│                                     │
└─────────────────────────────────────┘
```

### Por Qué Este Orden

1. **for-each primero:** Debe crear elementos antes que otros bindings los usen
2. **bind-value segundo:** Contenido antes de presentación
3. **if tercero:** Visibilidad antes de estilos
4. **bind-class/bind-style último:** Presentación después de estructura y contenido

### Ejemplo de Pipeline

```html
<div for-each="user of users">
  <span bind-value="user.name" if="user.active" bind-class="user.role"></span>
</div>
```

```
ViewModel:
  users = [
    { name: "John", active: true, role: "admin" },
    { name: "Jane", active: false, role: "user" }
  ]

Pipeline Execution:

1. renderForEachBindings()
   ├─► Crear elementos para users[0] y users[1]
   └─► DOM: 2 <div> insertados

2. renderValueBindings()
   ├─► <span> en users[0]: textContent = "John"
   └─► <span> en users[1]: textContent = "Jane"

3. renderIfBindings()
   ├─► <span> en users[0]: display = "" (visible)
   └─► <span> en users[1]: display = "none" (oculto)

4. renderClassBindings()
   ├─► <span> en users[0]: className = "admin"
   └─► <span> en users[1]: className = "user"

5. No hay styleBindings

Resultado Final:
  <div>
    <span class="admin">John</span>
  </div>
  <div>
    <span class="user" style="display: none;">Jane</span>
  </div>
```

## Render Selectivo vs Render Completo

### Comparación

```
RENDER COMPLETO
───────────────
render()
  └─► Renderiza TODOS los bindings (5-50ms típicamente)

RENDER SELECTIVO
────────────────
render("user.name")
  └─► Renderiza SOLO bindings de "user.name" (0.5-5ms típicamente)
```

### Ejemplo Comparativo

```typescript
class AppViewModel {
  title = "App Title";
  user = {
    name: "John",
    email: "john@example.com"
  };
  stats = {
    visits: 100,
    clicks: 50
  };
}
```

```html
<pelela view-model="AppViewModel">
  <h1 bind-value="title"></h1>
  <p bind-value="user.name"></p>
  <p bind-value="user.email"></p>
  <span bind-value="stats.visits"></span>
  <span bind-value="stats.clicks"></span>
</pelela>
```

**Bindings:**
- ValueBinding(<h1>, "title")
- ValueBinding(<p>, "user.name")
- ValueBinding(<p>, "user.email")
- ValueBinding(<span>, "stats.visits")
- ValueBinding(<span>, "stats.clicks")

**Cambio:** `viewModel.user.name = "Jane"`

```
Render Selectivo:
  render("user.name")
    │
    └─► getDependentBindings("user.name")
          │
          ├─► Check "title": NO match
          ├─► Check "user.name": MATCH ✓
          ├─► Check "user.email": NO match
          ├─► Check "stats.visits": NO match
          └─► Check "stats.clicks": NO match
          
          Result: [ValueBinding(<p>, "user.name")]
          
    └─► Renderiza 1 binding (0.5ms)

Render Completo:
  render()
    │
    └─► Renderiza 5 bindings (2.5ms)
```

**Beneficio:** 5x más rápido.

## Performance del Sistema de Bindings

### Benchmarks

```typescript
class BenchmarkViewModel {
  items = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    value: i * 10
  }));
}
```

```html
<div for-each="item of items">
  <span bind-value="item.name"></span>
  <span bind-value="item.value"></span>
</div>
```

**Setup Time:**
- 100 items × 2 bindings = 200 value bindings
- Setup time: ~50ms

**Render Time:**
- Initial render (all): ~30ms
- Selective render (1 item): ~0.3ms

### Optimizaciones Implementadas

#### 1. Dependency Tracking

Sin tracking:

```typescript
render() {
  renderValueBindings(ALL_VALUE_BINDINGS);
  renderIfBindings(ALL_IF_BINDINGS);
  // ...
}
```

Con tracking:

```typescript
render(changedPath) {
  const affected = getDependentBindings(changedPath);
  renderValueBindings(affected.valueBindings);
  renderIfBindings(affected.ifBindings);
  // ...
}
```

**Mejora:** Solo renderiza lo necesario.

#### 2. Early Exits

```typescript
if (targetBindings.valueBindings.length > 0) {
  renderValueBindings(targetBindings.valueBindings, viewModel);
}
```

Si no hay bindings de ese tipo, no se ejecuta nada.

#### 3. Cached Element References

Los bindings almacenan referencias directas a elementos:

```typescript
type ValueBinding = {
  element: HTMLElement;  // ← Referencia directa
  propertyName: string;
  isInput: boolean;
};
```

No es necesario `querySelector` en cada render.

### Bottlenecks

1. **Setup de for-each con muchos items:** O(n) donde n = items
2. **Render completo con muchos bindings:** O(m) donde m = bindings
3. **DOM operations:** Cada `textContent =` o `className =` es costoso

## Ciclo de Vida del Binding

```
┌──────────────────────────────────────────────────────────────┐
│                  BINDING LIFECYCLE                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. CREACIÓN                                                 │
│     setupBindings() → BindingsCollection                     │
│                                                               │
│  2. REGISTRO                                                 │
│     registerDependencies() → DependencyTracker               │
│                                                               │
│  3. RENDER INICIAL                                           │
│     render() → DOM sincronizado                              │
│                                                               │
│  4. FASE ACTIVA                                              │
│     onChange(path) → render(path) → DOM actualizado          │
│     (se repite cada vez que hay cambios)                     │
│                                                               │
│  5. DESTRUCCIÓN                                              │
│     Elemento <pelela> removido del DOM                       │
│     └─► Bindings eligible para garbage collection           │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Ejemplo Completo con Trazas

### Código

```typescript
class CounterViewModel {
  count = 0;
  message = "Count is zero";
  
  increment() {
    this.count++;
    this.message = `Count is ${this.count}`;
  }
}

defineViewModel("CounterViewModel", CounterViewModel);
bootstrap();
```

```html
<pelela view-model="CounterViewModel">
  <p bind-value="message"></p>
  <p>Value: <span bind-value="count"></span></p>
  <button click="increment">+1</button>
</pelela>
```

### Traza Completa

```
BOOTSTRAP
─────────
1. new CounterViewModel()
   └─► { count: 0, message: "Count is zero", increment: [Function] }

2. createReactiveViewModel(instance, onChange)
   └─► Proxy { count: 0, message: "...", increment: [Function] }

3. setupBindings(root, reactiveInstance)
   
   3.1. setupValueBindings()
        ├─► <p bind-value="message">
        │     └─► ValueBinding { element: <p>, propertyName: "message", isInput: false }
        │
        └─► <span bind-value="count">
              └─► ValueBinding { element: <span>, propertyName: "count", isInput: false }
   
   3.2. setupClickBindings()
        └─► <button click="increment">
              └─► addEventListener("click", ...)
   
   3.3. DependencyTracker
        ├─► register(valueBinding1, "message")
        └─► register(valueBinding2, "count")
   
   3.4. render()
        ├─► renderValueBindings(all)
        │     ├─► <p>.textContent = "Count is zero"
        │     └─► <span>.textContent = "0"
        │
        └─► DOM sincronizado

4. Application ready


USER INTERACTION
────────────────
5. User clicks button

6. Event listener ejecuta
   └─► viewModel.increment()

7. increment()
   ├─► this.count++
   │     ├─► Proxy.get("count") → 0
   │     ├─► Proxy.set("count", 1)
   │     │     └─► onChange("count")
   │     │           └─► render("count")
   │     │                 ├─► getDependentBindings("count")
   │     │                 │     └─► [ValueBinding(<span>, "count")]
   │     │                 │
   │     │                 └─► renderValueBindings([valueBinding2])
   │     │                       └─► <span>.textContent = "1"
   │     │
   │     └─► this.count = 1
   │
   └─► this.message = "Count is 1"
         ├─► Proxy.set("message", "Count is 1")
         │     └─► onChange("message")
         │           └─► render("message")
         │                 ├─► getDependentBindings("message")
         │                 │     └─► [ValueBinding(<p>, "message")]
         │                 │
         │                 └─► renderValueBindings([valueBinding1])
         │                       └─► <p>.textContent = "Count is 1"
         │
         └─► this.message = "Count is 1"

8. increment() completa

9. User ve:
     Count is 1
     Value: 1
```

## Testing del Sistema de Bindings

### Test de Setup

```typescript
it("should setup all bindings", () => {
  const root = document.createElement("div");
  root.innerHTML = `
    <span bind-value="name"></span>
    <div if="visible"></div>
    <p bind-class="className"></p>
  `;
  
  const vm = createReactiveViewModel(
    { name: "Test", visible: true, className: "active" },
    () => {}
  );
  
  const render = setupBindings(root, vm);
  
  expect(typeof render).toBe("function");
});
```

### Test de Render

```typescript
it("should render bindings", () => {
  const root = document.createElement("div");
  root.innerHTML = `<span bind-value="message"></span>`;
  
  const vm = createReactiveViewModel({ message: "Hello" }, () => {});
  const render = setupBindings(root, vm);
  
  const span = root.querySelector("span");
  expect(span?.textContent).toBe("Hello");
});
```

### Test de Render Selectivo

```typescript
it("should selectively render changed bindings", () => {
  let renderCount = 0;
  const originalRender = renderValueBindings;
  
  renderValueBindings = (bindings, vm) => {
    renderCount += bindings.length;
    originalRender(bindings, vm);
  };
  
  const root = document.createElement("div");
  root.innerHTML = `
    <span bind-value="a"></span>
    <span bind-value="b"></span>
  `;
  
  const vm = createReactiveViewModel({ a: 1, b: 2 }, (path) => {
    render(path);
  });
  
  const render = setupBindings(root, vm);
  
  renderCount = 0;
  vm.a = 10;
  
  expect(renderCount).toBe(1);
});
```

## Conclusión

El sistema de bindings de PelelaJS es:

1. **Declarativo:** Los bindings se declaran en HTML
2. **Automático:** Setup y render se ejecutan automáticamente
3. **Eficiente:** Render selectivo basado en dependencias
4. **Ordenado:** Pipeline con orden específico
5. **Extensible:** Fácil agregar nuevos tipos de bindings

La combinación de setup → registro → render inicial → renders selectivos permite una experiencia de desarrollo simple con buena performance.

## Referencias

- [Dependency Tracker](./02-dependency-tracker.md)
- [bind-value](./03-bind-value.md)
- [Arquitectura General](../01-architecture/01-general-architecture.md)
- [Sistema de Reactividad](../03-reactivity/01-reactive-proxy.md)
- [Bootstrap Process](../02-bootstrap/01-bootstrap-process.md)

