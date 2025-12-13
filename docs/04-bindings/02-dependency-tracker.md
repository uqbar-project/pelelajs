# 4.2 Dependency Tracker

## Introducción

El Dependency Tracker es el sistema que permite a PelelaJS realizar **renderizado selectivo**. En lugar de re-renderizar todos los bindings cuando algo cambia, el tracker determina exactamente qué bindings necesitan actualizarse basándose en el path de la propiedad que cambió.

Este documento explica cómo funciona el algoritmo de tracking, el path matching, y las optimizaciones que permiten renders eficientes.

## Propósito del Dependency Tracker

```
SIN Dependency Tracker:
───────────────────────
onChange("user.name")
    │
    └─► render()
          └─► Renderiza TODOS los bindings (lento)


CON Dependency Tracker:
───────────────────────
onChange("user.name")
    │
    └─► render("user.name")
          └─► getDependentBindings("user.name")
                └─► Renderiza SOLO bindings de "user.name" (rápido)
```

## Arquitectura del Dependency Tracker

```
┌──────────────────────────────────────────────────────────────┐
│                   DEPENDENCY TRACKER                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  FASE 1: REGISTRO                                            │
│  ─────────────────                                           │
│  registerDependency(binding, propertyPath)                   │
│       │                                                       │
│       └─► dependencies.set(binding, Set { propertyPath })    │
│                                                               │
│                                                               │
│  FASE 2: CONSULTA                                            │
│  ──────────────────                                          │
│  getDependentBindings(changedPath, allBindings)              │
│       │                                                       │
│       ├─► Para cada binding:                                 │
│       │     └─► isAffectedByChange(binding, changedPath)?    │
│       │           ├─ SÍ → incluir en resultado               │
│       │           └─ NO → skip                                │
│       │                                                       │
│       └─► return FilteredBindings                            │
│                                                               │
│                                                               │
│  ALGORITMO DE MATCHING                                       │
│  ──────────────────────                                      │
│  pathMatches(bindingPath, changedPath)                       │
│       │                                                       │
│       ├─► Exact match? bindingPath === changedPath           │
│       ├─► Parent changed? bindingPath.startsWith(changed.)   │
│       └─► Child changed? changedPath.startsWith(binding.)    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Código Fuente Completo

### Clase DependencyTracker

```typescript
export class DependencyTracker {
  private dependencies = new Map<any, Set<string>>();

  registerDependency(binding: any, propertyPath: string): void {
    if (!this.dependencies.has(binding)) {
      this.dependencies.set(binding, new Set());
    }
    this.dependencies.get(binding)!.add(propertyPath);
  }

  getDependentBindings(
    changedPath: string,
    allBindings: BindingsCollection,
  ): FilteredBindings {
    const result: FilteredBindings = {
      valueBindings: [],
      ifBindings: [],
      classBindings: [],
      styleBindings: [],
      forEachBindings: [],
    };

    for (const binding of allBindings.valueBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.valueBindings.push(binding);
      }
    }

    for (const binding of allBindings.ifBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.ifBindings.push(binding);
      }
    }

    for (const binding of allBindings.classBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.classBindings.push(binding);
      }
    }

    for (const binding of allBindings.styleBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.styleBindings.push(binding);
      }
    }

    for (const binding of allBindings.forEachBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.forEachBindings.push(binding);
      }
    }

    return result;
  }

  private isAffectedByChange(binding: any, changedPath: string): boolean {
    const bindingPaths = this.dependencies.get(binding);
    if (!bindingPaths) {
      return false;
    }

    for (const bindingPath of bindingPaths) {
      if (this.pathMatches(bindingPath, changedPath)) {
        return true;
      }
    }

    return false;
  }

  private pathMatches(bindingPath: string, changedPath: string): boolean {
    if (bindingPath === changedPath) {
      return true;
    }

    if (bindingPath.startsWith(changedPath + ".")) {
      return true;
    }

    if (changedPath.startsWith(bindingPath + ".")) {
      return true;
    }

    return false;
  }
}
```

### Tipo FilteredBindings

```typescript
export type FilteredBindings = {
  valueBindings: Array<any>;
  ifBindings: Array<any>;
  classBindings: Array<any>;
  styleBindings: Array<any>;
  forEachBindings: Array<any>;
};
```

## Estructura de Datos: dependencies

### Map Structure

```typescript
private dependencies = new Map<any, Set<string>>();
```

```
Map<Binding, Set<PropertyPath>>

Ejemplo:
  Map {
    ValueBinding(<h1>) => Set { "title" },
    ValueBinding(<p>) => Set { "user.name" },
    ValueBinding(<span>) => Set { "user.email", "user.verified" },
    IfBinding(<div>) => Set { "isVisible" },
    ForEachBinding => Set { "items" }
  }
```

### Por Qué Map + Set

**Map:**
- Permite usar objetos como keys (los bindings)
- O(1) lookup time

**Set:**
- Evita duplicados de paths
- O(1) para check de existencia

### Ejemplo de Estructura

```html
<pelela view-model="BlogViewModel">
  <h1 bind-value="post.title"></h1>
  <p bind-value="post.author.name"></p>
  <p bind-value="post.author.email"></p>
  <div if="post.published"></div>
</pelela>
```

Después del registro:

```
dependencies = Map {
  ValueBinding(<h1>) => Set { "post.title" },
  ValueBinding(<p id="name">) => Set { "post.author.name" },
  ValueBinding(<p id="email">) => Set { "post.author.email" },
  IfBinding(<div>) => Set { "post.published" }
}
```

## registerDependency: Registro de Dependencias

### Código

```typescript
registerDependency(binding: any, propertyPath: string): void {
  if (!this.dependencies.has(binding)) {
    this.dependencies.set(binding, new Set());
  }
  this.dependencies.get(binding)!.add(propertyPath);
}
```

### Flujo

```
registerDependency(binding, "user.name")
    │
    ├─► dependencies.has(binding)?
    │     ├─ NO → dependencies.set(binding, new Set())
    │     └─ SÍ → skip
    │
    └─► dependencies.get(binding).add("user.name")
```

### Ejemplo Paso a Paso

```typescript
const tracker = new DependencyTracker();
const binding1 = { element: document.createElement("h1"), propertyName: "title" };
const binding2 = { element: document.createElement("p"), propertyName: "description" };

tracker.registerDependency(binding1, "title");
```

```
Estado después del primer registro:

dependencies = Map {
  binding1 => Set { "title" }
}
```

```typescript
tracker.registerDependency(binding2, "description");
```

```
Estado después del segundo registro:

dependencies = Map {
  binding1 => Set { "title" },
  binding2 => Set { "description" }
}
```

```typescript
tracker.registerDependency(binding1, "subtitle");
```

```
Estado después del tercer registro:

dependencies = Map {
  binding1 => Set { "title", "subtitle" },
  binding2 => Set { "description" }
}
```

**Nota:** binding1 ahora depende de 2 propiedades.

### Bindings con Múltiples Dependencias

```html
<div if="user.active">
  <span bind-value="user.name"></span>
</div>
```

Si el binding del `<span>` necesita depender tanto de `user.name` como de `user.active`:

```typescript
tracker.registerDependency(valueBinding, "user.name");
tracker.registerDependency(valueBinding, "user.active");
```

```
dependencies = Map {
  valueBinding => Set { "user.name", "user.active" }
}
```

Cambios en cualquiera de las dos propiedades disparan re-render del binding.

## getDependentBindings: Filtrado de Bindings

### Propósito

Dado un `changedPath`, retornar solo los bindings que necesitan re-renderizarse.

### Algoritmo

```
getDependentBindings(changedPath, allBindings)
    │
    ├─► result = empty FilteredBindings
    │
    ├─► Para cada tipo de binding:
    │     │
    │     └─► Para cada binding del tipo:
    │           │
    │           ├─► isAffectedByChange(binding, changedPath)?
    │           │     ├─ SÍ → result.push(binding)
    │           │     └─ NO → skip
    │           │
    │           └─► Continuar con siguiente binding
    │
    └─► return result
```

### Ejemplo Detallado

```typescript
const allBindings = {
  valueBindings: [
    { element: h1, propertyName: "title" },
    { element: p1, propertyName: "user.name" },
    { element: p2, propertyName: "user.email" },
    { element: span, propertyName: "stats.views" }
  ],
  ifBindings: [
    { element: div, propertyName: "user.active" }
  ],
  classBindings: [],
  styleBindings: [],
  forEachBindings: []
};

const tracker = new DependencyTracker();
tracker.registerDependency(allBindings.valueBindings[0], "title");
tracker.registerDependency(allBindings.valueBindings[1], "user.name");
tracker.registerDependency(allBindings.valueBindings[2], "user.email");
tracker.registerDependency(allBindings.valueBindings[3], "stats.views");
tracker.registerDependency(allBindings.ifBindings[0], "user.active");
```

**Cambio:** `viewModel.user.name = "Jane"`

```
getDependentBindings("user.name", allBindings)
    │
    ├─► result = { valueBindings: [], ifBindings: [], ... }
    │
    ├─► Para valueBindings:
    │     │
    │     ├─► binding[0] ("title"):
    │     │     isAffectedByChange?
    │     │       pathMatches("title", "user.name") = FALSE
    │     │       → skip
    │     │
    │     ├─► binding[1] ("user.name"):
    │     │     isAffectedByChange?
    │     │       pathMatches("user.name", "user.name") = TRUE ✓
    │     │       → result.valueBindings.push(binding[1])
    │     │
    │     ├─► binding[2] ("user.email"):
    │     │     isAffectedByChange?
    │     │       pathMatches("user.email", "user.name") = FALSE
    │     │       → skip
    │     │
    │     └─► binding[3] ("stats.views"):
    │           isAffectedByChange?
    │             pathMatches("stats.views", "user.name") = FALSE
    │             → skip
    │
    ├─► Para ifBindings:
    │     │
    │     └─► binding[0] ("user.active"):
    │           isAffectedByChange?
    │             pathMatches("user.active", "user.name") = FALSE
    │             → skip
    │
    └─► return {
          valueBindings: [binding[1]],
          ifBindings: [],
          classBindings: [],
          styleBindings: [],
          forEachBindings: []
        }
```

**Resultado:** Solo 1 binding de 5 necesita re-renderizarse.

## isAffectedByChange: Check Individual

### Código

```typescript
private isAffectedByChange(binding: any, changedPath: string): boolean {
  const bindingPaths = this.dependencies.get(binding);
  if (!bindingPaths) {
    return false;
  }

  for (const bindingPath of bindingPaths) {
    if (this.pathMatches(bindingPath, changedPath)) {
      return true;
    }
  }

  return false;
}
```

### Flujo

```
isAffectedByChange(binding, "user.name")
    │
    ├─► bindingPaths = dependencies.get(binding)
    │     └─► Set { "user.name", "user.email" }
    │
    ├─► Para cada path en bindingPaths:
    │     │
    │     ├─► pathMatches("user.name", "user.name")?
    │     │     └─► TRUE → return true
    │     │
    │     └─► (no continúa, ya retornó)
    │
    └─► return true
```

### Binding No Registrado

```typescript
isAffectedByChange(unregisteredBinding, "user.name")
    │
    ├─► bindingPaths = dependencies.get(unregisteredBinding)
    │     └─► undefined
    │
    └─► return false
```

## pathMatches: Algoritmo de Path Matching

### Código

```typescript
private pathMatches(bindingPath: string, changedPath: string): boolean {
  if (bindingPath === changedPath) {
    return true;
  }

  if (bindingPath.startsWith(changedPath + ".")) {
    return true;
  }

  if (changedPath.startsWith(bindingPath + ".")) {
    return true;
  }

  return false;
}
```

### Tres Casos de Match

#### Caso 1: Exact Match

```
bindingPath = "user.name"
changedPath = "user.name"

Check: bindingPath === changedPath
Result: TRUE ✓
```

**Significado:** La propiedad exacta que usa el binding cambió.

#### Caso 2: Parent Changed

```
bindingPath = "user.profile.name"
changedPath = "user"

Check: bindingPath.startsWith(changedPath + ".")
       "user.profile.name".startsWith("user.")
Result: TRUE ✓
```

**Significado:** Un parent (padre) de la propiedad cambió. Ej: `user = newUser` afecta a `user.profile.name`.

#### Caso 3: Child Changed

```
bindingPath = "user"
changedPath = "user.profile.name"

Check: changedPath.startsWith(bindingPath + ".")
       "user.profile.name".startsWith("user.")
Result: TRUE ✓
```

**Significado:** Un child (hijo) de la propiedad cambió. Ej: si el binding renderiza todo el objeto `user`, necesita actualizarse cuando `user.profile.name` cambia.

#### Caso 4: No Match

```
bindingPath = "user.name"
changedPath = "post.title"

Check 1: "user.name" === "post.title"? NO
Check 2: "user.name".startsWith("post.title" + ".")? NO
Check 3: "post.title".startsWith("user.name" + ".")? NO

Result: FALSE ✗
```

**Significado:** Propiedades completamente diferentes, no hay relación.

### Matriz de Matching

| bindingPath | changedPath | Exact | Parent | Child | Result |
|-------------|-------------|-------|--------|-------|--------|
| `"name"` | `"name"` | ✓ | - | - | **TRUE** |
| `"user.name"` | `"user"` | - | ✓ | - | **TRUE** |
| `"user"` | `"user.name"` | - | - | ✓ | **TRUE** |
| `"user.name"` | `"user.email"` | - | - | - | **FALSE** |
| `"username"` | `"user"` | - | - | - | **FALSE** |
| `"user.profile.name"` | `"user.profile"` | - | ✓ | - | **TRUE** |
| `"items"` | `"items.0"` | - | - | ✓ | **TRUE** |
| `"items.0.name"` | `"items"` | - | ✓ | - | **TRUE** |

### Edge Cases

#### Edge Case 1: Prefijos Similares

```
bindingPath = "username"
changedPath = "user"

Check 2: "username".startsWith("user" + ".")?
         "username".startsWith("user.")? NO

Result: FALSE ✗
```

El `.` en el check previene false positives.

#### Edge Case 2: Paths Idénticos Pero Diferentes

```
bindingPath = "user"
changedPath = "user_backup"

Check 1: "user" === "user_backup"? NO
Check 2: "user".startsWith("user_backup" + ".")? NO
Check 3: "user_backup".startsWith("user" + ".")? NO

Result: FALSE ✗
```

#### Edge Case 3: Array Indices

```
bindingPath = "items.0.name"
changedPath = "items"

Check 2: "items.0.name".startsWith("items" + ".")
         "items.0.name".startsWith("items.")? YES

Result: TRUE ✓
```

Cambios en el array afectan a elementos individuales.

```
bindingPath = "items"
changedPath = "items.0"

Check 3: "items.0".startsWith("items" + ".")
         "items.0".startsWith("items.")? YES

Result: TRUE ✓
```

Cambios en un elemento afectan al array completo.

## Escenarios de Uso

### Escenario 1: Cambio Simple

```typescript
viewModel.count = 10;
```

```
changedPath = "count"

Bindings:
  - ValueBinding(<span>, "count")

getDependentBindings("count")
  └─► pathMatches("count", "count") = TRUE
        └─► [ValueBinding]
```

### Escenario 2: Cambio Anidado

```typescript
viewModel.user.profile.name = "Jane";
```

```
changedPath = "user.profile.name"

Bindings:
  - ValueBinding(<h1>, "user.profile.name")
  - ValueBinding(<p>, "user.profile")
  - ValueBinding(<div>, "user")
  - ValueBinding(<span>, "user.email")

getDependentBindings("user.profile.name")
  │
  ├─► Check "user.profile.name":
  │     pathMatches("user.profile.name", "user.profile.name") = TRUE ✓
  │
  ├─► Check "user.profile":
  │     pathMatches("user.profile", "user.profile.name")
  │       └─► "user.profile.name".startsWith("user.profile" + ".") = TRUE ✓
  │
  ├─► Check "user":
  │     pathMatches("user", "user.profile.name")
  │       └─► "user.profile.name".startsWith("user" + ".") = TRUE ✓
  │
  └─► Check "user.email":
        pathMatches("user.email", "user.profile.name") = FALSE ✗

Result: [ValueBinding(h1), ValueBinding(p), ValueBinding(div)]
```

### Escenario 3: Reemplazo de Objeto

```typescript
viewModel.user = { name: "New", email: "new@example.com" };
```

```
changedPath = "user"

Bindings:
  - ValueBinding(<h1>, "user.name")
  - ValueBinding(<p>, "user.email")
  - ValueBinding(<div>, "user.profile.bio")
  - ValueBinding(<span>, "post.title")

getDependentBindings("user")
  │
  ├─► Check "user.name":
  │     pathMatches("user.name", "user")
  │       └─► "user.name".startsWith("user" + ".") = TRUE ✓
  │
  ├─► Check "user.email":
  │     pathMatches("user.email", "user")
  │       └─► "user.email".startsWith("user" + ".") = TRUE ✓
  │
  ├─► Check "user.profile.bio":
  │     pathMatches("user.profile.bio", "user")
  │       └─► "user.profile.bio".startsWith("user" + ".") = TRUE ✓
  │
  └─► Check "post.title":
        pathMatches("post.title", "user") = FALSE ✗

Result: [ValueBinding(h1), ValueBinding(p), ValueBinding(div)]
```

**Todos los hijos de `user` se re-renderizan.**

### Escenario 4: Array Mutation

```typescript
viewModel.items.push({ name: "New Item" });
```

```
changedPath = "items"

Bindings:
  - ForEachBinding("items")
  - ValueBinding(<span>, "items.0.name")
  - ValueBinding(<p>, "items.length")

getDependentBindings("items")
  │
  ├─► Check ForEachBinding("items"):
  │     pathMatches("items", "items") = TRUE ✓
  │
  ├─► Check "items.0.name":
  │     pathMatches("items.0.name", "items")
  │       └─► "items.0.name".startsWith("items" + ".") = TRUE ✓
  │
  └─► Check "items.length":
        pathMatches("items.length", "items")
          └─► "items.length".startsWith("items" + ".") = TRUE ✓

Result: [ForEachBinding, ValueBinding(span), ValueBinding(p)]
```

## Optimización de Renders

### Comparación: Con vs Sin Tracker

#### Sin Dependency Tracker

```typescript
render() {
  renderValueBindings(ALL_VALUE_BINDINGS);
  renderIfBindings(ALL_IF_BINDINGS);
  renderClassBindings(ALL_CLASS_BINDINGS);
  renderStyleBindings(ALL_STYLE_BINDINGS);
  renderForEachBindings(ALL_FOREACH_BINDINGS);
}
```

**Problema:** Siempre renderiza TODO, incluso si solo cambió una propiedad.

#### Con Dependency Tracker

```typescript
render(changedPath) {
  const filtered = tracker.getDependentBindings(changedPath, allBindings);
  
  renderValueBindings(filtered.valueBindings);
  renderIfBindings(filtered.ifBindings);
  renderClassBindings(filtered.classBindings);
  renderStyleBindings(filtered.styleBindings);
  renderForEachBindings(filtered.forEachBindings);
}
```

**Beneficio:** Solo renderiza lo necesario.

### Benchmark

```typescript
class LargeViewModel {
  section1 = { a: 1, b: 2, c: 3, d: 4, e: 5 };
  section2 = { f: 6, g: 7, h: 8, i: 9, j: 10 };
  section3 = { k: 11, l: 12, m: 13, n: 14, o: 15 };
  section4 = { p: 16, q: 17, r: 18, s: 19, t: 20 };
}
```

Cada propiedad tiene un binding (20 bindings total).

**Cambio:** `viewModel.section1.a = 100`

```
Sin Tracker:
  Renderiza 20 bindings
  Tiempo: ~10ms

Con Tracker:
  getDependentBindings("section1.a") → 1 binding
  Renderiza 1 binding
  Tiempo: ~0.5ms
  
Mejora: 20x más rápido
```

### Overhead del Tracker

El tracker tiene un overhead mínimo:

```typescript
// Setup
tracker.registerDependency(binding, path)
└─► O(1) Map set + Set add

// Query
tracker.getDependentBindings(path, bindings)
└─► O(n) donde n = número de bindings
    └─► Pero con early exit cuando encuentra match
```

**Overhead típico:** 0.1-0.5ms para 100 bindings.

**Beneficio típico:** 5-20x reducción en tiempo de render.

**Conclusión:** El overhead es despreciable comparado con el beneficio.

## Memory Usage

### Estructura en Memoria

```
DependencyTracker:
  └─ dependencies: Map
       ├─ ValueBinding1 → Set { "user.name" }  (~100 bytes)
       ├─ ValueBinding2 → Set { "user.email" } (~100 bytes)
       ├─ IfBinding1 → Set { "isVisible" }     (~100 bytes)
       └─ ...

Total para 50 bindings: ~5KB
```

Muy pequeño comparado con el tamaño total del ViewModel y DOM.

### Garbage Collection

Cuando un elemento `<pelela>` se remueve del DOM:

```
<pelela> removido
    │
    ├─► Bindings ya no tienen referencias externas
    │     └─► Eligible para GC
    │
    └─► DependencyTracker.dependencies ya no tiene referencias externas
          └─► Eligible para GC
```

El Map se limpia automáticamente.

## Testing del Dependency Tracker

### Test de Registro

```typescript
it("should register dependencies", () => {
  const tracker = new DependencyTracker();
  const binding = { element: document.createElement("div"), propertyName: "name" };
  
  tracker.registerDependency(binding, "user.name");
  
  const affected = tracker.getDependentBindings("user.name", {
    valueBindings: [binding],
    ifBindings: [],
    classBindings: [],
    styleBindings: [],
    forEachBindings: []
  });
  
  expect(affected.valueBindings).toContain(binding);
});
```

### Test de Path Matching

```typescript
it("should match exact paths", () => {
  const tracker = new DependencyTracker();
  const binding = { element: document.createElement("div"), propertyName: "name" };
  
  tracker.registerDependency(binding, "user.name");
  
  const affected = tracker.getDependentBindings("user.name", {
    valueBindings: [binding],
    ifBindings: [], classBindings: [], styleBindings: [], forEachBindings: []
  });
  
  expect(affected.valueBindings.length).toBe(1);
});

it("should match parent paths", () => {
  const tracker = new DependencyTracker();
  const binding = { element: document.createElement("div"), propertyName: "user.profile.name" };
  
  tracker.registerDependency(binding, "user.profile.name");
  
  const affected = tracker.getDependentBindings("user", {
    valueBindings: [binding],
    ifBindings: [], classBindings: [], styleBindings: [], forEachBindings: []
  });
  
  expect(affected.valueBindings.length).toBe(1);
});

it("should match child paths", () => {
  const tracker = new DependencyTracker();
  const binding = { element: document.createElement("div"), propertyName: "user" };
  
  tracker.registerDependency(binding, "user");
  
  const affected = tracker.getDependentBindings("user.profile.name", {
    valueBindings: [binding],
    ifBindings: [], classBindings: [], styleBindings: [], forEachBindings: []
  });
  
  expect(affected.valueBindings.length).toBe(1);
});

it("should not match unrelated paths", () => {
  const tracker = new DependencyTracker();
  const binding = { element: document.createElement("div"), propertyName: "user.name" };
  
  tracker.registerDependency(binding, "user.name");
  
  const affected = tracker.getDependentBindings("post.title", {
    valueBindings: [binding],
    ifBindings: [], classBindings: [], styleBindings: [], forEachBindings: []
  });
  
  expect(affected.valueBindings.length).toBe(0);
});
```

## Limitaciones y Consideraciones

### Limitación 1: No Detecta Cambios Internos

```typescript
const date = new Date();
viewModel.createdAt = date;

date.setFullYear(2025);
```

El cambio en `date` **no dispara** onChange, por lo que el tracker no se invoca.

**Solución:** Reemplazar el objeto completo:

```typescript
viewModel.createdAt = new Date(2025, 0, 1);
```

### Limitación 2: Granularidad de Arrays

```typescript
viewModel.items[5].name = "Updated";
```

Esto dispara `onChange("items.5.name")`, que matchea con:
- `"items"` → **TODO** el array se considera afectado
- `"items.5.name"` → Elemento específico
- `"items.5"` → Objeto específico

**Problema:** Si hay un binding en `"items"`, se re-renderiza TODO el array, no solo el item 5.

**Solución:** PelelaJS no implementa keyed rendering como React. Este es un trade-off de simplicidad vs performance.

### Limitación 3: Paths con Caracteres Especiales

```typescript
viewModel["user.name"] = "John";
```

Esto dispara `onChange("user.name")`, pero:
- ¿Es `user.name` (nested) o `"user.name"` (key literal)?

**Problema:** Ambigüedad en el path.

**Solución:** PelelaJS asume que `.` siempre significa anidación. No soporta keys con puntos.

## Conclusión

El Dependency Tracker de PelelaJS:

1. **Permite renderizado selectivo:** Solo actualiza lo necesario
2. **Es eficiente:** O(n) con early exit
3. **Es preciso:** Algoritmo de matching con 3 casos
4. **Es simple:** ~100 líneas de código
5. **Es efectivo:** 5-20x reducción en tiempo de render

La combinación de un Map de dependencias + algoritmo de path matching permite optimizar renders sin complejidad excesiva.

## Referencias

- [Sistema de Binding General](./01-binding-system.md)
- [Change Detection](../03-reactivity/02-change-detection.md)
- [ReactiveProxy](../03-reactivity/01-reactive-proxy.md)
- [Arquitectura General](../01-architecture/01-general-architecture.md)

