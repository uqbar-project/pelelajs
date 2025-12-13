# 1.1 Arquitectura General del Framework PelelaJS

## Introducción

PelelaJS es un framework reactivo para construir aplicaciones web basado en el patrón MVVM (Model-View-ViewModel). Su arquitectura está diseñada para ser simple, predecible y fácil de entender, siguiendo principios de programación didáctica.

## Arquitectura de Alto Nivel

```
┌────────────────────────────────────────────────────────────────┐
│                        APLICACIÓN WEB                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐        ┌──────────────┐        ┌──────────┐  │
│  │              │        │              │        │          │  │
│  │     VIEW     │◄──────►│  VIEW MODEL  │◄──────►│  MODEL   │  │
│  │   (HTML)     │ Bind   │ (TypeScript) │  Data  │  (Data)  │  │
│  │              │        │              │        │          │  │
│  └──────────────┘        └──────────────┘        └──────────┘  │
│         │                       │                              │
│         │                       │                              │
│         └───────────┬───────────┘                              │
│                     │                                          │
│              ┌──────▼──────┐                                   │
│              │             │                                   │
│              │   PELELA    │                                   │
│              │   CORE      │                                   │
│              │             │                                   │
│              └─────────────┘                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Componentes Principales

### 1. PelelaJS Core

El núcleo del framework se divide en 6 subsistemas principales:

```
┌─────────────────────────────────────────────────────────────┐
│                      PELELAJS CORE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌──────────────────┐                │
│  │   BOOTSTRAP     │───►│    REGISTRY      │                │
│  │   SYSTEM        │    │  ViewModels Map  │                │
│  └─────────────────┘    └──────────────────┘                │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐    ┌──────────────────┐                │
│  │   REACTIVITY    │───►│  CHANGE TRACKER  │                │
│  │   SYSTEM        │    │  Dependencies    │                │
│  └─────────────────┘    └──────────────────┘                │
│           │                      │                          │
│           └──────────┬───────────┘                          │
│                      ▼                                      │
│           ┌──────────────────┐                              │
│           │  BINDING SYSTEM  │                              │
│           │                  │                              │
│           │  • bind-value    │                              │
│           │  • if            │                              │
│           │  • bind-class    │                              │
│           │  • bind-style    │                              │
│           │  • click         │                              │
│           │  • for-each      │                              │
│           │  • ...           │                              │
│           └──────────────────┘                              │
│                      │                                      │
│                      ▼                                      │
│           ┌──────────────────┐                              │
│           │  VALIDATION      │                              │
│           │  & ERRORS        │                              │
│           └──────────────────┘                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Subsistemas en Detalle

#### 2.1 Bootstrap System
**Responsabilidad:** Inicialización de la aplicación

```
bootstrap()
    │
    ├─► Buscar elementos <pelela view-model="...">
    │
    ├─► Obtener ViewModel del Registry
    │
    ├─► Instanciar ViewModel
    │
    ├─► Crear Reactive Proxy
    │
    ├─► Setup Bindings
    │
    └─► Render inicial
```

**Archivos principales:**
- `bootstrap/bootstrap.ts`
- `bootstrap/mountTemplate.ts`

#### 2.2 Registry System
**Responsabilidad:** Registro y recuperación de ViewModels

```
┌─────────────────────────────────┐
│     ViewModelRegistry           │
├─────────────────────────────────┤
│  Map<string, Constructor>       │
│                                 │
│  "AppViewModel" ──► AppClass    │
│  "TodoViewModel" ──► TodoClass  │
│  "UserViewModel" ──► UserClass  │
└─────────────────────────────────┘
```

**Operaciones:**
- `defineViewModel(name, constructor)`: Registrar un ViewModel
- `getViewModel(name)`: Obtener constructor por nombre
- `hasViewModel(name)`: Verificar existencia
- `clearRegistry()`: Limpiar registro (testing)

**Archivos principales:**
- `registry/viewModelRegistry.ts`

#### 2.3 Reactivity System
**Responsabilidad:** Convertir objetos JavaScript en objetos reactivos

```
Plain Object          Reactive Proxy          Change Detection
�────────────         ────────────────         ────────────────
                                              
{ name: "John" }  ──► Proxy Handler ──────►  onChange("name")
                      │                              │
                      ├─ get()                       ▼
                      ├─ set() ────────────►  Re-render afectado
                      └─ deleteProperty()
```

**Características:**
- Detecta cambios en propiedades
- Soporta objetos anidados
- Maneja arrays y métodos de mutación
- Operadores especiales: `$raw`, `$set`, `$delete`
- Cache de proxies para evitar duplicación

**Archivos principales:**
- `reactivity/reactiveProxy.ts`

#### 2.4 Binding System
**Responsabilidad:** Conectar el DOM con el ViewModel

```
┌──────────────────────────────────────────────────────┐
│                  BINDING LIFECYCLE                   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  SETUP PHASE                                         │
│  ────────────                                        │
│  setupBindings()                                     │
│       │                                              │
│       ├─► setupValueBindings()                       │
│       ├─► setupIfBindings()                          │
│       ├─► setupClassBindings()                       │
│       ├─► setupStyleBindings()                       │
│       ├─► setupClickBindings()                       │
│       └─► setupForEachBindings()                     │
│                   │                                  │
│                   ▼                                  │
│  ┌───────────────────────────────┐                  │
│  │  BindingsCollection           │                  │
│  │  ─────────────────            │                  │
│  │  • valueBindings: []          │                  │
│  │  • ifBindings: []             │                  │
│  │  • classBindings: []          │                  │
│  │  • styleBindings: []          │                  │
│  │  • forEachBindings: []        │                  │
│  └───────────────────────────────┘                  │
│                   │                                  │
│                   ▼                                  │
│  DEPENDENCY REGISTRATION                             │
│  ────────────────────────                           │
│  DependencyTracker.register(binding, propertyPath)  │
│                   │                                  │
│                   ▼                                  │
│  RENDER PHASE                                        │
│  ────────────                                        │
│  render(changedPath?)                                │
│       │                                              │
│       ├─► Filter affected bindings                   │
│       │                                              │
│       └─► executeRenderPipeline()                    │
│             │                                        │
│             ├─► renderForEachBindings()              │
│             ├─► renderValueBindings()                │
│             ├─► renderIfBindings()                   │
│             ├─► renderClassBindings()                │
│             └─► renderStyleBindings()                │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Tipos de Bindings:**

| Binding | Propósito | Two-Way | Ejemplo |
|---------|-----------|---------|---------|
| `bind-value` | Sincronizar valor con propiedad | ✅ Sí (inputs) | `<input bind-value="name">` |
| `if` | Mostrar/ocultar elemento | ❌ No | `<div if="isVisible">` |
| `bind-class` | Clases CSS dinámicas | ❌ No | `<div bind-class="activeClass">` |
| `bind-style` | Estilos inline dinámicos | ❌ No | `<div bind-style="customStyle">` |
| `click` | Event handler | ❌ No | `<button click="handleClick">` |
| `for-each` | Renderizado de listas | ❌ No | `<div for-each="item of items">` |

**Archivos principales:**
- `bindings/setupBindings.ts`
- `bindings/bindValue.ts`
- `bindings/bindIf.ts`
- `bindings/bindClass.ts`
- `bindings/bindStyle.ts`
- `bindings/bindClick.ts`
- `bindings/bindForEach.ts`

#### 2.5 Dependency Tracker
**Responsabilidad:** Optimizar renders mediante seguimiento de dependencias

```
Cambio en ViewModel              Dependency Tracker              Render Selectivo
──────────────────              ──────────────────              ────────────────

viewModel.user.name = "John"
         │
         ▼
changedPath: "user.name"  ────►  getDependentBindings()  ────►  Solo bindings que
                                          │                     dependen de:
                                          │                     - "user"
                                          ▼                     - "user.name"
                                  ┌──────────────┐              - "user.name.*"
                                  │ Path Matcher │
                                  │              │
                                  │ • Exact      │
                                  │ • Parent     │
                                  │ • Child      │
                                  └──────────────┘
```

**Algoritmo de Matching:**

```
bindingPath = "user.name"
changedPath = "user"

Casos de match:
1. Exact match:     bindingPath === changedPath
2. Parent changed:  bindingPath.startsWith(changedPath + ".")
3. Child changed:   changedPath.startsWith(bindingPath + ".")
```

**Archivos principales:**
- `bindings/dependencyTracker.ts`

#### 2.6 Validation & Errors
**Responsabilidad:** Validar bindings y generar errores informativos

```
Binding Setup                    Validation                    Error Handling
─────────────                    ──────────                    ──────────────

<div bind-value="userName">  ──► assertViewModelProperty()  ──► ✓ Pass
                                          │                      │
                                          ├─ Check existence     ▼
                                          ├─ Check nested        Render OK
                                          └─ Check type          

<div bind-value="invalid">   ──► assertViewModelProperty()  ──► ✗ Fail
                                          │                      │
                                          ▼                      ▼
                                    Property not found     PropertyValidationError
                                                                  │
                                                                  ├─ Property name
                                                                  ├─ Binding kind
                                                                  ├─ ViewModel name
                                                                  └─ Element snippet
```

**Tipos de Errores:**
- `PelelaError`: Clase base para todos los errores
- `PropertyValidationError`: Propiedad no existe en ViewModel
- `ViewModelRegistrationError`: ViewModel no registrado o duplicado
- `InvalidHandlerError`: Handler de evento inválido

**Archivos principales:**
- `validation/assertViewModelProperty.ts`
- `errors/PelelaError.ts`
- `errors/PropertyValidationError.ts`
- `errors/ViewModelRegistrationError.ts`
- `errors/InvalidHandlerError.ts`

## Flujo de Datos Unidireccional

PelelaJS sigue un patrón de flujo de datos unidireccional con capacidad bidireccional en inputs:

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO UNIDIRECCIONAL                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Action (click, etc.)                                  │
│         │                                                    │
│         ▼                                                    │
│  Event Handler en ViewModel                                 │
│         │                                                    │
│         ▼                                                    │
│  Modificación de Propiedad                                  │
│         │                                                    │
│         ▼                                                    │
│  Reactive Proxy detecta cambio                              │
│         │                                                    │
│         ▼                                                    │
│  onChange(changedPath)                                      │
│         │                                                    │
│         ▼                                                    │
│  render(changedPath)                                        │
│         │                                                    │
│         ▼                                                    │
│  Dependency Tracker filtra bindings                         │
│         │                                                    │
│         ▼                                                    │
│  Re-render solo elementos afectados                         │
│         │                                                    │
│         ▼                                                    │
│  DOM actualizado                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              FLUJO BIDIRECCIONAL (bind-value)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User escribe en input                                      │
│         │                                                    │
│         ▼                                                    │
│  'input' event                                              │
│         │                                                    │
│         ▼                                                    │
│  Event listener de bind-value                               │
│         │                                                    │
│         ▼                                                    │
│  setNestedProperty(viewModel, path, value)                  │
│         │                                                    │
│         ▼                                                    │
│  [Mismo flujo unidireccional desde aquí]                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Ejemplo Completo de Flujo

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

```html
<pelela view-model="CounterViewModel">
  <div>
    <p>Count: <span bind-value="count"></span></p>
    <button click="increment">Increment</button>
  </div>
</pelela>
```

**Paso a paso interno:**

```
INICIALIZACIÓN (bootstrap)
────────────────────────────────────────────────────────────
1. bootstrap() busca <pelela view-model="CounterViewModel">
2. getViewModel("CounterViewModel") obtiene la clase
3. new CounterViewModel() crea instancia { count: 0 }
4. createReactiveViewModel() envuelve en Proxy
   ├─ Proxy intercepta gets/sets
   └─ onChange callback registrado
5. setupBindings() escanea el DOM
   ├─ Encuentra bind-value="count" → crea ValueBinding
   └─ Encuentra click="increment" → registra event listener
6. DependencyTracker registra:
   ├─ ValueBinding depende de "count"
7. render() inicial actualiza DOM:
   ├─ <span> muestra "0"


INTERACCIÓN (click en button)
────────────────────────────────────────────────────────────
1. Usuario hace click en <button>
2. Event listener llama viewModel.increment()
3. Ejecuta: this.count++
4. Proxy.set intercepta: count = 0 → 1
5. onChange("count") es invocado
6. render("count") es llamado
7. DependencyTracker filtra:
   ├─ ValueBinding de "count" → INCLUIR
8. renderValueBindings() ejecuta:
   ├─ Actualiza <span>.textContent = "1"
9. DOM refleja nuevo estado
```

## Características Arquitectónicas Clave

### 1. Separación de Responsabilidades

Cada subsistema tiene una responsabilidad única y bien definida:
- **Bootstrap:** Inicialización
- **Registry:** Gestión de ViewModels
- **Reactivity:** Detección de cambios
- **Bindings:** Sincronización DOM-ViewModel
- **Tracker:** Optimización de renders
- **Validation:** Aseguramiento de calidad

### 2. Extensibilidad

El sistema de bindings es extensible:

```typescript
export function setupCustomBinding<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>
): CustomBinding[] {
  const bindings: CustomBinding[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[custom-attr]");
  
  for (const element of elements) {
    const propertyName = element.getAttribute("custom-attr");
    if (!propertyName) continue;
    
    assertViewModelProperty(viewModel, propertyName, "custom-attr", element);
    
    bindings.push({ element, propertyName });
  }
  
  return bindings;
}

export function renderCustomBindings<T extends object>(
  bindings: CustomBinding[],
  viewModel: ViewModel<T>
): void {
  for (const binding of bindings) {
  }
}
```

### 3. Performance

Optimizaciones implementadas:
- **Renderizado selectivo:** Solo re-renderiza elementos afectados
- **Cache de proxies:** Evita crear múltiples proxies del mismo objeto
- **Lazy binding setup:** Bindings se crean una vez al inicio
- **Event delegation potencial:** Los event listeners se configuran directamente

### 4. Developer Experience

Facilidades para desarrolladores:
- **Error messages detallados:** Incluyen contexto y sugerencias
- **Console logging:** Seguimiento de operaciones en desarrollo
- **Type safety:** TypeScript en todo el core
- **Testing utilities:** Helpers para escribir tests

## Limitaciones y Trade-offs

### 1. Scope Limitado
PelelaJS es un framework didáctico, no busca competir con frameworks de producción. No incluye:
- Virtual DOM
- Routing integrado
- State management global
- Server-side rendering
- Hydration

### 2. Performance en Listas Grandes
El sistema de `for-each` es simple pero no óptimo para listas muy grandes (>1000 elementos).

### 3. Bindings Estáticos
Los bindings se configuran al inicio. Agregar elementos dinámicamente requiere re-ejecutar setup.

### 4. No Soporta Componentes Anidados
Un elemento `<pelela>` no puede contener otro `<pelela>`.

## Comparación con Otros Frameworks

| Característica | PelelaJS | Vue.js | React | Angular |
|----------------|----------|--------|-------|---------|
| Reactividad | Proxy-based | Proxy-based | Virtual DOM | Zone.js/Signals |
| Bindings | Atributos HTML | Directivas | JSX Props | Directivas |
| Two-way binding | bind-value | v-model | Controlled | ngModel |
| Templates | HTML puro | HTML-based | JSX | HTML + Templates |
| Size | ~15KB | ~33KB | ~40KB | ~143KB |
| Curva aprendizaje | Muy baja | Baja | Media | Alta |
| Propósito | Didáctico | Producción | Producción | Producción |

## Conclusión

La arquitectura de PelelaJS está diseñada para ser:
- **Simple:** Fácil de entender y enseñar
- **Modular:** Cada subsistema es independiente
- **Predecible:** Flujo de datos claro y unidireccional
- **Extensible:** Fácil agregar nuevos bindings o features
- **Type-safe:** TypeScript en todo el código

El objetivo es que cualquier desarrollador pueda entender completamente cómo funciona el framework leyendo su código fuente.

## Referencias Internas

- [Ciclo de Vida de la Aplicación](./02-application-lifecycle.md)
- [Flujo de Datos Reactivo](./03-reactive-data-flow.md)
- [Sistema de Bootstrap](../02-bootstrap/01-bootstrap-process.md)
- [Sistema de Reactividad](../03-reactivity/01-reactive-proxy.md)
- [Sistema de Bindings](../04-bindings/01-binding-system.md)

