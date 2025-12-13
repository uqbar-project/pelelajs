# 3.2 Change Detection (Detección de Cambios)

## Introducción

El sistema de detección de cambios de PelelaJS es responsable de identificar qué partes del ViewModel cambiaron y propagar esa información al sistema de bindings para actualizar el DOM de manera eficiente.

Este documento explica cómo funciona el tracking de cambios, cómo se construyen los paths, y cómo se propagan los cambios a través de objetos anidados.

## Arquitectura del Change Detection

```
┌────────────────────────────────────────────────────────────────┐
│                    CHANGE DETECTION SYSTEM                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. MODIFICACIÓN                                               │
│     viewModel.user.name = "Jane"                               │
│              │                                                  │
│              ▼                                                  │
│  2. PROXY INTERCEPTA                                           │
│     Proxy.set(obj, "name", "Jane")                             │
│              │                                                  │
│              ▼                                                  │
│  3. CONSTRUCCIÓN DEL PATH                                      │
│     fullPath = parentPath + "." + prop                         │
│     fullPath = "user.name"                                     │
│              │                                                  │
│              ▼                                                  │
│  4. CALLBACK onChange                                          │
│     onChange("user.name")                                      │
│              │                                                  │
│              ▼                                                  │
│  5. RENDER FUNCTION                                            │
│     render("user.name")                                        │
│              │                                                  │
│              ▼                                                  │
│  6. DEPENDENCY TRACKER                                         │
│     getDependentBindings("user.name")                          │
│              │                                                  │
│              ▼                                                  │
│  7. RENDER PIPELINE                                            │
│     executeRenderPipeline(affectedBindings)                    │
│              │                                                  │
│              ▼                                                  │
│  8. DOM ACTUALIZADO                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Sistema de Tracking: changedPath

### Concepto de changedPath

El `changedPath` es un string que representa la ruta completa a la propiedad que cambió:

```typescript
viewModel.count = 5
└─► changedPath = "count"

viewModel.user.name = "Jane"
└─► changedPath = "user.name"

viewModel.company.departments[0].name = "Engineering"
└─► changedPath = "company.departments.0.name"
```

### Formato del Path

```
path ::= segment | segment "." path
segment ::= identifier | number

Ejemplos:
  "name"
  "user.name"
  "items.0"
  "company.departments.0.teams.1.members.2.name"
```

### Construcción del Path

#### En el Set Handler

```typescript
set(obj, prop, value) {
  // ...
  const fullPath = parentPath 
    ? `${parentPath}.${String(prop)}` 
    : String(prop);
  
  onChange(fullPath);
  // ...
}
```

#### Ejemplo Paso a Paso

```typescript
const vm = createReactiveViewModel(
  {
    user: {
      profile: {
        name: "John"
      }
    }
  },
  (path) => console.log(`Changed: ${path}`)
);

vm.user.profile.name = "Jane";
```

```
Construcción del Path:

Nivel 1: vm (root)
  parentPath = ""

Nivel 2: vm.user
  ├─► Proxy.get(vm, "user")
  ├─► childPath = "" + "user" = "user"
  └─► makeReactive(..., parentPath="user")

Nivel 3: user.profile
  ├─► Proxy.get(user, "profile")
  ├─► childPath = "user" + "." + "profile" = "user.profile"
  └─► makeReactive(..., parentPath="user.profile")

Nivel 4: profile.name = "Jane"
  ├─► Proxy.set(profile, "name", "Jane")
  ├─► fullPath = "user.profile" + "." + "name"
  ├─► fullPath = "user.profile.name"
  └─► onChange("user.profile.name")
        └─► Console: Changed: user.profile.name
```

## onChange Callback

### Definición

```typescript
type OnChangeFn = (changedPath: string) => void;
```

El callback `onChange` es una función que se invoca cada vez que el Proxy detecta un cambio.

### Conexión con Render

Durante el bootstrap:

```typescript
let render: (changedPath?: string) => void = () => {};

const reactiveInstance = createReactiveViewModel(
  instance,
  (changedPath: string) => {
    render(changedPath);
  },
);

render = setupBindings(root, reactiveInstance);
```

### Flujo Completo

```
1. Proxy detecta cambio
   └─► onChange("user.name")

2. onChange es el callback:
   (changedPath: string) => {
     render(changedPath);
   }

3. Invoca render("user.name")

4. render es la función retornada por setupBindings:
   (changedPath?: string) => {
     const targetBindings = changedPath 
       ? tracker.getDependentBindings(changedPath, bindings)
       : bindings;
     
     executeRenderPipeline(targetBindings, viewModel);
   }

5. getDependentBindings filtra bindings afectados

6. executeRenderPipeline actualiza el DOM
```

### Timing de onChange

```typescript
viewModel.count++;
```

```
Timeline:

T=0ms:    this.count++
T=0ms:      ├─► this.count (get)
T=0ms:      │     └─► Proxy.get() → return 0
T=0ms:      └─► this.count = 1 (set)
T=0ms:            ├─► Proxy.set()
T=0ms:            ├─► onChange("count")
T=0ms:            │     └─► render("count")
T=1ms:            │           └─► DOM actualizado
T=0ms:            └─► return from Proxy.set()
T=0ms:    Continúa ejecución después de ++
```

**Importante:** onChange es **síncrono**. El DOM se actualiza antes de que la línea siguiente se ejecute.

## Propagación de Cambios

### Cambios en Diferentes Niveles

#### Nivel 1: Propiedad Root

```typescript
viewModel.title = "New Title";
```

```
onChange("title")
    │
    └─► Afecta bindings que dependen de:
          • "title" (exact match)
```

#### Nivel 2: Propiedad Anidada

```typescript
viewModel.user.name = "Jane";
```

```
onChange("user.name")
    │
    └─► Afecta bindings que dependen de:
          • "user.name" (exact match)
          • "user" (parent)
```

#### Nivel 3: Reemplazo de Objeto

```typescript
viewModel.user = { name: "Alice", age: 25 };
```

```
onChange("user")
    │
    └─► Afecta bindings que dependen de:
          • "user" (exact match)
          • "user.name" (child)
          • "user.age" (child)
          • "user.profile.email" (nested child)
```

### Path Matching Algorithm

El Dependency Tracker usa este algoritmo:

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

### Ejemplos de Path Matching

#### Ejemplo 1: Exact Match

```
bindingPath = "user.name"
changedPath = "user.name"

Resultado: TRUE ✓
Razón: Match exacto
```

#### Ejemplo 2: Parent Changed

```
bindingPath = "user.name"
changedPath = "user"

Check: "user.name".startsWith("user" + ".") = TRUE ✓
Razón: El padre cambió, afecta a todos los hijos
```

#### Ejemplo 3: Child Changed

```
bindingPath = "user"
changedPath = "user.name"

Check: "user.name".startsWith("user" + ".") = TRUE ✓
Razón: Un hijo cambió, puede afectar renderizado del padre
```

#### Ejemplo 4: No Match

```
bindingPath = "user.name"
changedPath = "post.title"

Resultado: FALSE ✗
Razón: Paths completamente diferentes
```

#### Ejemplo 5: Similar but Different

```
bindingPath = "username"
changedPath = "user"

Check 1: "username" === "user"? NO
Check 2: "username".startsWith("user" + ".")? NO
Check 3: "user".startsWith("username" + ".")? NO

Resultado: FALSE ✗
Razón: Aunque empiezan similar, son propiedades diferentes
```

## Escenarios de Propagación

### Escenario 1: Cambio Simple

```typescript
class CounterViewModel {
  count = 0;
  
  increment() {
    this.count++;
  }
}
```

```html
<pelela view-model="CounterViewModel">
  <span bind-value="count"></span>
</pelela>
```

**Flujo:**

```
1. Button click
2. increment()
3. this.count++
4. Proxy.set("count", 1)
5. onChange("count")
6. render("count")
7. getDependentBindings("count")
   └─► [ValueBinding(<span>, "count")]
8. renderValueBindings()
   └─► <span>.textContent = "1"
```

### Escenario 2: Cambio Anidado

```typescript
class UserViewModel {
  user = {
    profile: {
      name: "John",
      email: "john@example.com"
    }
  };
  
  updateName(newName: string) {
    this.user.profile.name = newName;
  }
}
```

```html
<pelela view-model="UserViewModel">
  <h1 bind-value="user.profile.name"></h1>
  <p bind-value="user.profile.email"></p>
  <div bind-value="user"></div>
</pelela>
```

**Bindings registrados:**

```
ValueBinding(<h1>) → "user.profile.name"
ValueBinding(<p>) → "user.profile.email"
ValueBinding(<div>) → "user"
```

**Flujo:**

```
1. updateName("Jane")
2. this.user.profile.name = "Jane"
3. Proxy.set(profile, "name", "Jane")
4. onChange("user.profile.name")
5. render("user.profile.name")
6. getDependentBindings("user.profile.name")
   │
   ├─► Check ValueBinding(<h1>, "user.profile.name"):
   │     pathMatches("user.profile.name", "user.profile.name") = TRUE ✓
   │
   ├─► Check ValueBinding(<p>, "user.profile.email"):
   │     pathMatches("user.profile.email", "user.profile.name") = FALSE ✗
   │
   └─► Check ValueBinding(<div>, "user"):
         pathMatches("user", "user.profile.name")
           └─► "user.profile.name".startsWith("user" + ".") = TRUE ✓

   Result: [ValueBinding(<h1>), ValueBinding(<div>)]

7. renderValueBindings()
   ├─► <h1>.textContent = "Jane"
   └─► <div>.textContent = "[object Object]"
```

### Escenario 3: Reemplazo de Objeto Completo

```typescript
class DataViewModel {
  data = {
    title: "Original",
    items: [1, 2, 3]
  };
  
  reset() {
    this.data = {
      title: "Reset",
      items: []
    };
  }
}
```

```html
<pelela view-model="DataViewModel">
  <h1 bind-value="data.title"></h1>
  <div for-each="item of data.items">
    <span bind-value="item"></span>
  </div>
</pelela>
```

**Bindings registrados:**

```
ValueBinding(<h1>) → "data.title"
ForEachBinding → "data.items"
```

**Flujo:**

```
1. reset()
2. this.data = { title: "Reset", items: [] }
3. Proxy.set(vm, "data", newObject)
4. makeReactive(newObject)
5. onChange("data")
6. render("data")
7. getDependentBindings("data")
   │
   ├─► Check ValueBinding(<h1>, "data.title"):
   │     pathMatches("data.title", "data")
   │       └─► "data.title".startsWith("data" + ".") = TRUE ✓
   │
   └─► Check ForEachBinding("data.items"):
         pathMatches("data.items", "data")
           └─► "data.items".startsWith("data" + ".") = TRUE ✓

   Result: [ValueBinding(<h1>), ForEachBinding]

8. executeRenderPipeline()
   ├─► renderForEachBindings()
   │     └─► Elimina elementos anteriores
   │     └─► No crea nuevos (items = [])
   │
   └─► renderValueBindings()
         └─► <h1>.textContent = "Reset"
```

### Escenario 4: Array Mutations

```typescript
class TodoViewModel {
  todos = [
    { id: 1, title: "Task 1", done: false },
    { id: 2, title: "Task 2", done: true }
  ];
  
  addTodo(title: string) {
    this.todos.push({
      id: Date.now(),
      title,
      done: false
    });
  }
}
```

```html
<pelela view-model="TodoViewModel">
  <div for-each="todo of todos">
    <span bind-value="todo.title"></span>
    <input type="checkbox" bind-value="todo.done">
  </div>
</pelela>
```

**Flujo:**

```
1. addTodo("Task 3")
2. this.todos.push({ ... })
3. Wrapped push function
4. makeReactive({ id: 3, title: "Task 3", done: false })
5. Array.prototype.push.apply(todos, [reactiveItem])
6. onChange("todos")
7. render("todos")
8. getDependentBindings("todos")
   └─► [ForEachBinding("todos")]
9. renderForEachBindings()
   ├─► currentLength = 3, previousLength = 2
   ├─► addNewElements()
   │     └─► createNewElement(todo3)
   │           ├─► Clone template
   │           ├─► setupBindingsForElement()
   │           └─► Insert en DOM
   └─► updateExistingElements()
```

## Múltiples Cambios

### Cambios Secuenciales

```typescript
class FormViewModel {
  firstName = "";
  lastName = "";
  
  updateName(first: string, last: string) {
    this.firstName = first;
    this.lastName = last;
  }
}
```

**Flujo:**

```
updateName("John", "Doe")
    │
    ├─► this.firstName = "John"
    │     ├─► Proxy.set()
    │     ├─► onChange("firstName")
    │     ├─► render("firstName")
    │     └─► DOM actualizado
    │
    └─► this.lastName = "Doe"
          ├─► Proxy.set()
          ├─► onChange("lastName")
          ├─► render("lastName")
          └─► DOM actualizado
```

**Resultado:** 2 renders separados.

### Batching (No Implementado)

PelelaJS **no** implementa batching automático. Cada cambio dispara un render inmediato.

Frameworks de producción baten cambios:

```
Framework con batching:
  updateName() {
    this.firstName = "John";   ─┐
    this.lastName = "Doe";      ├─► Cambios en cola
  }                            ─┘
         │
         └─► Al finalizar función: render UNA vez
```

**Implementación manual de batching:**

```typescript
class ViewModel {
  private pendingChanges = new Set<string>();
  private renderScheduled = false;
  
  private scheduleRender() {
    if (this.renderScheduled) return;
    
    this.renderScheduled = true;
    
    Promise.resolve().then(() => {
      for (const path of this.pendingChanges) {
        this.render(path);
      }
      this.pendingChanges.clear();
      this.renderScheduled = false;
    });
  }
  
  private onChange(path: string) {
    this.pendingChanges.add(path);
    this.scheduleRender();
  }
}
```

## Detección de Cambios en Arrays

### Índices como Strings

```typescript
viewModel.items[0] = "Updated";
```

```
Proxy.set(items, "0", "Updated")
    │
    ├─► prop = "0" (string, no number)
    ├─► fullPath = "items.0"
    └─► onChange("items.0")
```

**Nota:** Los índices se convierten a strings automáticamente por JavaScript.

### Métodos de Mutación

```typescript
viewModel.items.push("New");
viewModel.items.pop();
viewModel.items.splice(1, 1);
```

Todos disparan:

```
onChange(parentPath || "root")
    │
    └─► onChange("items")
```

**No** se reporta qué índice específico cambió, solo que el array cambió.

### length Property

```typescript
viewModel.items.length = 0;
```

```
Proxy.set(items, "length", 0)
    │
    ├─► fullPath = "items.length"
    └─► onChange("items.length")
```

Esto **dispara** onChange, pero la mayoría de bindings ignoran `length` porque dependen de `items`.

## Cambios que NO Disparan onChange

### 1. Lectura de Propiedades

```typescript
const name = viewModel.user.name;
```

**NO** dispara onChange (solo get trap).

### 2. Métodos No-Mutantes de Arrays

```typescript
const filtered = viewModel.items.filter(x => x > 5);
const mapped = viewModel.items.map(x => x * 2);
```

**NO** dispara onChange (no mutan el array original).

### 3. Modificaciones en $raw

```typescript
viewModel.$raw.count = 10;
```

**NO** dispara onChange (bypass del proxy).

### 4. Propiedades de Métodos

```typescript
viewModel.increment.bind(viewModel);
viewModel.increment.toString();
```

**NO** dispara onChange (acceso a propiedades de función).

## Debugging del Change Detection

### Log de Cambios

```typescript
const vm = createReactiveViewModel(
  instance,
  (changedPath: string) => {
    console.log(`[CHANGE] ${changedPath}`);
    render(changedPath);
  }
);
```

### Stack Trace

```typescript
const vm = createReactiveViewModel(
  instance,
  (changedPath: string) => {
    console.log(`[CHANGE] ${changedPath}`);
    console.trace();
    render(changedPath);
  }
);
```

Output:

```
[CHANGE] user.name
    at onChange (bootstrap.ts:35)
    at Proxy.set (reactiveProxy.ts:95)
    at updateName (UserViewModel.ts:12)
    at HTMLButtonElement.click (bindClick.ts:15)
```

### Contar Cambios

```typescript
let changeCount = 0;

const vm = createReactiveViewModel(
  instance,
  (changedPath: string) => {
    changeCount++;
    console.log(`[CHANGE #${changeCount}] ${changedPath}`);
    render(changedPath);
  }
);
```

### Medir Performance

```typescript
const vm = createReactiveViewModel(
  instance,
  (changedPath: string) => {
    const start = performance.now();
    render(changedPath);
    const end = performance.now();
    console.log(`[PERF] Render ${changedPath} took ${end - start}ms`);
  }
);
```

## Comparación con Otros Frameworks

### Vue 3

```typescript
const state = reactive({ count: 0 });

effect(() => {
  console.log(state.count);
});

state.count++;
```

**Similitudes:**
- Usa Proxy
- Detección automática
- Tracking de dependencias

**Diferencias:**
- Vue usa `effect()` para side effects
- Vue tiene scheduling de renders
- PelelaJS conecta directamente con bindings

### React

```typescript
const [count, setCount] = useState(0);

<div>{count}</div>

setCount(count + 1);
```

**Diferencias:**
- React no es reactivo (pull-based)
- Requiere `setState()` explícito
- React batches updates automáticamente
- No hay onChange callback

### MobX

```typescript
const state = observable({ count: 0 });

autorun(() => {
  console.log(state.count);
});

state.count++;
```

**Similitudes:**
- Detección automática
- Proxy-based (MobX 5+)
- Sistema de onChange

**Diferencias:**
- MobX usa `autorun()` para tracking
- MobX tiene transacciones
- MobX soporta computed values

### Angular

```typescript
export class AppComponent {
  count = 0;
  
  increment() {
    this.count++;
  }
}
```

**Diferencias:**
- Angular usa Zone.js (monkey patching)
- Detecta cambios después de eventos async
- Change detection desde root
- No hay onChange callback

## Performance Considerations

### Frecuencia de Cambios

```typescript
for (let i = 0; i < 1000; i++) {
  viewModel.count = i;
}
```

Esto dispara onChange 1000 veces → 1000 renders.

**Solución:**

```typescript
const raw = viewModel.$raw;
for (let i = 0; i < 1000; i++) {
  raw.count = i;
}
viewModel.count = raw.count;
```

Solo 1 render al final.

### Cambios Profundos

```typescript
viewModel.deep.nested.path.value = "change";
```

Cada nivel de acceso crea/obtiene un proxy → overhead.

Para cambios múltiples en el mismo objeto:

```typescript
const target = viewModel.deep.nested.path;
target.value1 = "a";
target.value2 = "b";
target.value3 = "c";
```

Mejor que:

```typescript
viewModel.deep.nested.path.value1 = "a";
viewModel.deep.nested.path.value2 = "b";
viewModel.deep.nested.path.value3 = "c";
```

## Testing de Change Detection

### Test Básico

```typescript
it("should detect changes", () => {
  let changedPath = "";
  
  const vm = createReactiveViewModel(
    { count: 0 },
    (path) => { changedPath = path; }
  );
  
  vm.count = 5;
  
  expect(changedPath).toBe("count");
});
```

### Test de Paths Anidados

```typescript
it("should build correct paths", () => {
  const paths: string[] = [];
  
  const vm = createReactiveViewModel(
    { user: { profile: { name: "John" } } },
    (path) => { paths.push(path); }
  );
  
  vm.user.profile.name = "Jane";
  
  expect(paths).toEqual(["user.profile.name"]);
});
```

### Test de Múltiples Cambios

```typescript
it("should track multiple changes", () => {
  const paths: string[] = [];
  
  const vm = createReactiveViewModel(
    { a: 1, b: 2, c: 3 },
    (path) => { paths.push(path); }
  );
  
  vm.a = 10;
  vm.b = 20;
  vm.c = 30;
  
  expect(paths).toEqual(["a", "b", "c"]);
});
```

## Conclusión

El sistema de Change Detection de PelelaJS:

1. **Es explícito:** Cada cambio reporta un path específico
2. **Es preciso:** Los paths anidados se construyen correctamente
3. **Es síncrono:** onChange se invoca inmediatamente
4. **Es simple:** No requiere configuración adicional
5. **Es predecible:** El flujo es fácil de seguir

La combinación de Proxy + onChange + changedPath permite al framework saber exactamente qué cambió y actualizar solo lo necesario en el DOM.

## Referencias

- [ReactiveProxy](./01-reactive-proxy.md)
- [Arquitectura General](../01-architecture/01-general-architecture.md)
- [Flujo de Datos Reactivo](../01-architecture/03-reactive-data-flow.md)
- [Dependency Tracker](../04-bindings/02-dependency-tracker.md)
- [Sistema de Bindings](../04-bindings/01-binding-system.md)

