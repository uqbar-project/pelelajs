# 1.3 Flujo de Datos Reactivo en PelelaJS

## Introducción

El sistema reactivo de PelelaJS es el corazón del framework. Permite que los cambios en el ViewModel se propaguen automáticamente al DOM sin intervención manual del desarrollador. Este documento explica en profundidad cómo funciona la reactividad, desde la detección de cambios hasta la actualización del DOM.

## Visión General del Sistema Reactivo

```
┌────────────────────────────────────────────────────────────────┐
│                   SISTEMA REACTIVO COMPLETO                    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ViewModel (Plain Object)                                      │
│         │                                                       │
│         ▼                                                       │
│  Reactive Proxy (JavaScript Proxy)                             │
│         │                                                       │
│         ├─► Intercepta: get, set, delete                       │
│         │                                                       │
│         └─► Detecta cambios                                    │
│                   │                                             │
│                   ▼                                             │
│         onChange(changedPath)                                  │
│                   │                                             │
│                   ▼                                             │
│         Dependency Tracker                                     │
│                   │                                             │
│                   ├─► Filtra bindings afectados                │
│                   │                                             │
│                   ▼                                             │
│         Render Function                                        │
│                   │                                             │
│                   ├─► Re-render selectivo                       │
│                   │                                             │
│                   ▼                                             │
│         DOM actualizado                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 1. JavaScript Proxy: La Base de la Reactividad

### ¿Qué es un Proxy?

Un Proxy es una característica de ES6 que permite interceptar operaciones sobre objetos:

```typescript
const handler = {
  get(target, property) {
    console.log(`Reading property: ${String(property)}`);
    return target[property];
  },
  set(target, property, value) {
    console.log(`Writing property: ${String(property)} = ${value}`);
    target[property] = value;
    return true;
  }
};

const obj = { name: "John" };
const proxy = new Proxy(obj, handler);

proxy.name;
proxy.name = "Jane";
```

Output:
```
Reading property: name
Writing property: name = Jane
```

### Proxy en PelelaJS

```typescript
function makeReactive(
  target: any,
  onChange: (changedPath: string) => void,
  visited = new WeakSet<object>(),
  parentPath = "",
): any {
  if (!isObject(target)) {
    return target;
  }

  if (proxyCache.has(target)) {
    return proxyCache.get(target);
  }

  if (visited.has(target)) {
    return target;
  }

  visited.add(target);

  const handler: ProxyHandler<any> = {
    get(obj, prop) { /* ... */ },
    set(obj, prop, value) { /* ... */ },
    deleteProperty(obj, prop) { /* ... */ }
  };

  const proxy = new Proxy(target, handler);
  proxyCache.set(target, proxy);
  
  return proxy;
}
```

## 2. Detección de Cambios

### 2.1 Set Trap: Detectar Escrituras

```typescript
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
}
```

#### Diagrama de Flujo Set

```
viewModel.count = 5
       │
       ▼
Proxy.set(obj, "count", 5)
       │
       ├─► oldValue = obj["count"]  (= 0)
       │
       ├─► oldValue === value?
       │         ├─ Sí → return true (sin onChange)
       │         └─ No → continuar
       │
       ├─► value es objeto?
       │         ├─ Sí → makeReactive(value)
       │         └─ No → usar value directamente
       │
       ├─► Reflect.set(obj, "count", 5)
       │         └─► obj.count = 5
       │
       ├─► fullPath = "count"
       │
       └─► onChange("count")
                 │
                 └─► [Propagación del cambio]
```

### 2.2 Get Trap: Reactividad Profunda

```typescript
get(obj, prop) {
  if (prop === "$raw") {
    return obj;
  }

  if (prop === "$set") {
    return (target: any, key: PropertyKey, value: any) => {
      const reactive = makeReactive(value, onChange, new WeakSet(), parentPath);
      target[key] = reactive;
      const fullPath = parentPath ? `${parentPath}.${String(key)}` : String(key);
      onChange(fullPath);
    };
  }

  if (prop === "$delete") {
    return (target: any, key: PropertyKey) => {
      delete target[key];
      const fullPath = parentPath ? `${parentPath}.${String(key)}` : String(key);
      onChange(fullPath);
    };
  }

  const value = Reflect.get(obj, prop);

  if (isObject(value)) {
    const newVisited = new WeakSet<object>();
    newVisited.add(target);
    const childPath = parentPath 
      ? `${parentPath}.${String(prop)}` 
      : String(prop);
    return makeReactive(value, onChange, newVisited, childPath);
  }

  return value;
}
```

#### Diagrama de Flujo Get

```
const name = viewModel.user.name
                       │    │
                       │    └──────────────┐
                       │                   │
                       ▼                   ▼
           Proxy.get(obj, "user")    Proxy.get(userObj, "name")
                       │                   │
                       ▼                   │
           value = obj["user"]             │
                  │                        │
                  ├─ isObject?             │
                  │    └─ Sí               │
                  │                        │
                  ├─ makeReactive(value)   │
                  │         │              │
                  │         └─ childPath = "user"
                  │         │              │
                  │         └─ return Proxy│
                  │                   │    │
                  └───────────────────┘    │
                                           ▼
                                  value = userObj["name"]
                                           │
                                           ├─ isObject?
                                           │    └─ No
                                           │
                                           └─ return "John"
```

### 2.3 DeleteProperty Trap

```typescript
deleteProperty(obj, prop) {
  const hadProperty = prop in obj;
  const result = Reflect.deleteProperty(obj, prop);

  if (result && hadProperty) {
    const fullPath = parentPath ? `${parentPath}.${String(prop)}` : String(prop);
    onChange(fullPath);
  }

  return result;
}
```

#### Ejemplo de Delete

```typescript
delete viewModel.tempData
       │
       ▼
Proxy.deleteProperty(obj, "tempData")
       │
       ├─► hadProperty = "tempData" in obj  (= true)
       │
       ├─► Reflect.deleteProperty(obj, "tempData")
       │         └─► delete obj.tempData
       │
       ├─► result = true, hadProperty = true
       │
       └─► onChange("tempData")
```

## 3. Objetos Anidados

### 3.1 Estructura Anidada

```typescript
class UserViewModel {
  user = {
    profile: {
      name: "John",
      age: 30
    },
    settings: {
      theme: "dark"
    }
  };
}
```

### 3.2 Proxies Anidados

```
viewModel (Proxy)
    │
    └─► .user (Proxy)
            │
            ├─► .profile (Proxy)
            │       ├─► .name: "John"
            │       └─► .age: 30
            │
            └─► .settings (Proxy)
                    └─► .theme: "dark"
```

### 3.3 Tracking de Paths

```typescript
parentPath = ""
     │
     └─► Acceso: viewModel.user
               │
               ├─ childPath = "" + "user" = "user"
               └─ Return: Proxy con parentPath = "user"
                       │
                       └─► Acceso: .profile
                                 │
                                 ├─ childPath = "user.profile"
                                 └─ Return: Proxy con parentPath = "user.profile"
                                         │
                                         └─► Acceso: .name
                                                   │
                                                   └─ childPath = "user.profile.name"
```

### 3.4 Cambio en Propiedad Anidada

```
viewModel.user.profile.name = "Jane"
       │      │       │
       │      │       └─► Proxy.set(profileObj, "name", "Jane")
       │      │                  │
       │      │                  └─► parentPath = "user.profile"
       │      │                  │
       │      │                  └─► fullPath = "user.profile.name"
       │      │                  │
       │      │                  └─► onChange("user.profile.name")
       │      │                             │
       │      │                             └─► render("user.profile.name")
       │      │                                        │
       │      │                                        └─► getDependentBindings()
       │      │                                                  │
       │      │                                                  └─► Busca bindings que matcheen:
       │      │                                                       • "user.profile.name" (exact)
       │      │                                                       • "user.profile" (parent)
       │      │                                                       • "user" (grandparent)
       │      │
       │      └─► Estos accesos son interceptados por get() durante
       │           la asignación, creando proxies si no existen
       │
       └─► viewModel es el Proxy raíz
```

## 4. Manejo de Arrays

### 4.1 Métodos de Mutación

PelelaJS intercepta los métodos que mutan arrays:

```typescript
const ARRAY_MUTATION_METHODS = [
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
] as const;
```

### 4.2 Interceptación de Métodos

```typescript
if (isArray && ARRAY_MUTATION_METHODS.includes(prop as any)) {
  return function (this: any, ...args: any[]) {
    const reactiveArgs = args.map((arg) => 
      isObject(arg) ? makeReactive(arg, onChange, new WeakSet(), parentPath) : arg
    );
    const result = Array.prototype[prop as any].apply(this, reactiveArgs);
    onChange(parentPath || "root");
    return result;
  };
}
```

### 4.3 Ejemplo: push()

```typescript
viewModel.items.push({ name: "New Task" })
              │
              ▼
Proxy.get(obj, "push")
    │
    ├─► isArray(obj) = true
    ├─► "push" in ARRAY_MUTATION_METHODS = true
    │
    └─► Return wrapped function
            │
            └─► Ejecución:
                  │
                  ├─► makeReactive({ name: "New Task" })
                  │         │
                  │         └─► Reactive { name: "New Task" }
                  │
                  ├─► Array.prototype.push.apply(arr, [reactiveItem])
                  │         │
                  │         └─► arr[arr.length] = reactiveItem
                  │
                  └─► onChange("items")
                            │
                            └─► render("items")
                                      │
                                      └─► Re-render elementos for-each
```

### 4.4 Ejemplo: splice()

```typescript
viewModel.items.splice(1, 1, { name: "Updated Task" })
              │
              ▼
Intercepted splice
    │
    ├─► args = [1, 1, { name: "Updated Task" }]
    │
    ├─► reactiveArgs = [1, 1, Reactive { name: "Updated Task" }]
    │
    ├─► Array.prototype.splice.apply(arr, reactiveArgs)
    │         │
    │         └─► arr.splice(1, 1, reactiveItem)
    │
    └─► onChange("items")
```

### 4.5 Acceso por Índice

```typescript
viewModel.items[0] = { name: "Changed" }
              │
              ▼
Proxy.set(arr, "0", { name: "Changed" })
    │
    ├─► oldValue = arr[0]
    │
    ├─► makeReactive({ name: "Changed" })
    │
    ├─► Reflect.set(arr, "0", reactiveValue)
    │
    └─► onChange("items.0")
              │
              └─► render("items.0")
```

## 5. Cache de Proxies

### 5.1 Propósito

Evitar crear múltiples proxies para el mismo objeto:

```typescript
const proxyCache = new WeakMap<object, any>();
const rawObjectCache = new WeakMap<object, any>();
```

### 5.2 Diagrama de Cache

```
Primer acceso: viewModel.user
       │
       ▼
makeReactive(userObj)
       │
       ├─► proxyCache.has(userObj)?
       │         └─ No
       │
       ├─► crear nuevo Proxy
       │
       ├─► proxyCache.set(userObj, proxy)
       │
       └─► return proxy


Segundo acceso: viewModel.user
       │
       ▼
makeReactive(userObj)
       │
       └─► proxyCache.has(userObj)?
                 ├─ Sí!
                 └─► return proxyCache.get(userObj)
                           │
                           └─► Retorna el MISMO proxy
```

### 5.3 Beneficios

1. **Performance:** No se crean proxies redundantes
2. **Consistencia:** Mismo objeto → mismo proxy
3. **Memory:** Reduce el uso de memoria

### 5.4 Operator $raw

Permite acceder al objeto original sin proxy:

```typescript
const raw = viewModel.$raw;

raw.count = 10;
```

```
viewModel.$raw
       │
       ▼
Proxy.get(obj, "$raw")
       │
       └─► return obj
             │
             └─► Objeto original (sin proxy)

Uso:
  raw.count = 10
       │
       └─► Modificación directa SIN onChange()
```

## 6. Operadores Especiales

### 6.1 $set

Para agregar propiedades dinámicas reactivas:

```typescript
viewModel.$set(viewModel.user, "email", "john@example.com")
```

```
$set(target, key, value)
    │
    ├─► makeReactive(value)
    │         │
    │         └─► reactiveValue
    │
    ├─► target[key] = reactiveValue
    │
    └─► onChange(fullPath)
```

Sin `$set`:

```typescript
viewModel.user.email = "john@example.com";
```

En JavaScript moderno (ES6 Proxy), esto también funciona y es reactivo. El operador `$set` es principalmente para compatibilidad con patrones de otros frameworks.

### 6.2 $delete

Para eliminar propiedades de forma reactiva:

```typescript
viewModel.$delete(viewModel.user, "email")
```

```
$delete(target, key)
    │
    ├─► delete target[key]
    │
    └─► onChange(fullPath)
```

Equivalente reactivo a:

```typescript
delete viewModel.user.email;
```

## 7. Propagación de Cambios

### 7.1 Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│              PROPAGACIÓN COMPLETA DE CAMBIOS                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. DETECCIÓN                                               │
│     viewModel.user.name = "Jane"                            │
│              │                                               │
│              ▼                                               │
│     Proxy.set() intercepta                                  │
│              │                                               │
│              ├─► oldValue: "John"                            │
│              ├─► newValue: "Jane"                            │
│              └─► fullPath: "user.name"                       │
│                        │                                     │
│                        ▼                                     │
│  2. NOTIFICACIÓN                                            │
│     onChange("user.name")                                   │
│              │                                               │
│              ▼                                               │
│  3. RENDER DISPATCH                                         │
│     render("user.name")                                     │
│              │                                               │
│              ▼                                               │
│  4. DEPENDENCY TRACKING                                     │
│     tracker.getDependentBindings("user.name")               │
│              │                                               │
│              └─► Busca bindings que dependen de:            │
│                  • "user.name" (exact match)                │
│                  • "user" (parent)                           │
│                  • Cualquier propiedad hija                  │
│                        │                                     │
│                        ▼                                     │
│  5. FILTRADO                                                │
│     Resultado: [                                            │
│       ValueBinding(<span>, "user.name"),                    │
│       IfBinding(<div>, "user")                              │
│     ]                                                        │
│              │                                               │
│              ▼                                               │
│  6. RE-RENDER                                               │
│     executeRenderPipeline(filteredBindings)                 │
│              │                                               │
│              ├─► renderValueBindings()                       │
│              │     └─► <span>.textContent = "Jane"          │
│              │                                               │
│              └─► renderIfBindings()                          │
│                    └─► <div>.style.display = ...            │
│                              │                               │
│                              ▼                               │
│  7. DOM ACTUALIZADO                                         │
│     Usuario ve los cambios                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 Algoritmo de Path Matching

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

#### Ejemplos de Matching

```
Caso 1: Exact Match
────────────────────
bindingPath = "user.name"
changedPath = "user.name"
Result: TRUE ✓


Caso 2: Parent Changed
──────────────────────
bindingPath = "user.name.first"
changedPath = "user"
Check: "user.name.first".startsWith("user" + ".") = TRUE ✓


Caso 3: Child Changed
─────────────────────
bindingPath = "user"
changedPath = "user.name"
Check: "user.name".startsWith("user" + ".") = TRUE ✓


Caso 4: No Match
────────────────
bindingPath = "user.name"
changedPath = "post.title"
Result: FALSE ✗
```

### 7.3 Ejemplo Completo

```typescript
class BlogViewModel {
  post = {
    title: "Hello",
    author: {
      name: "John",
      email: "john@example.com"
    }
  };
}
```

```html
<pelela view-model="BlogViewModel">
  <h1 bind-value="post.title"></h1>
  <p bind-value="post.author.name"></p>
  <span bind-value="post.author.email"></span>
</pelela>
```

#### Bindings Registrados

```
DependencyTracker.dependencies:
  ValueBinding(<h1>) → Set { "post.title" }
  ValueBinding(<p>) → Set { "post.author.name" }
  ValueBinding(<span>) → Set { "post.author.email" }
```

#### Cambio: viewModel.post.author.name = "Jane"

```
1. onChange("post.author.name")

2. tracker.getDependentBindings("post.author.name")
   
   Chequear ValueBinding(<h1>):
     bindingPath = "post.title"
     changedPath = "post.author.name"
     pathMatches() = FALSE ✗
   
   Chequear ValueBinding(<p>):
     bindingPath = "post.author.name"
     changedPath = "post.author.name"
     pathMatches() = TRUE ✓
   
   Chequear ValueBinding(<span>):
     bindingPath = "post.author.email"
     changedPath = "post.author.name"
     pathMatches() = FALSE ✗

3. Resultado: [ValueBinding(<p>)]

4. Re-render solo <p>:
     <p>.textContent = "Jane"
```

#### Cambio: viewModel.post = { ... }

```
1. onChange("post")

2. tracker.getDependentBindings("post")
   
   Chequear ValueBinding(<h1>):
     bindingPath = "post.title"
     changedPath = "post"
     pathMatches("post.title", "post"):
       "post.title".startsWith("post" + ".") = TRUE ✓
   
   Chequear ValueBinding(<p>):
     bindingPath = "post.author.name"
     changedPath = "post"
     pathMatches("post.author.name", "post"):
       "post.author.name".startsWith("post" + ".") = TRUE ✓
   
   Chequear ValueBinding(<span>):
     bindingPath = "post.author.email"
     changedPath = "post"
     pathMatches("post.author.email", "post"):
       "post.author.email".startsWith("post" + ".") = TRUE ✓

3. Resultado: [ValueBinding(<h1>), ValueBinding(<p>), ValueBinding(<span>)]

4. Re-render TODOS los bindings de post
```

## 8. Optimizaciones del Sistema Reactivo

### 8.1 Early Return en Set

```typescript
if (oldValue === value) {
  return true;
}
```

Evita notificaciones cuando el valor no cambió realmente:

```typescript
viewModel.count = 5;
viewModel.count = 5;
```

Segunda asignación no dispara onChange().

### 8.2 WeakMap para Cache

```typescript
const proxyCache = new WeakMap<object, any>();
```

Los WeakMap permiten garbage collection automática:

```
objeto original → GC eligible
     │
     └─► proxyCache entry también se elimina automáticamente
```

### 8.3 Visited Set para Ciclos

```typescript
function makeReactive(
  target: any,
  onChange: (changedPath: string) => void,
  visited = new WeakSet<object>(),
  parentPath = "",
): any {
  if (visited.has(target)) {
    return target;
  }
  
  visited.add(target);
  // ...
}
```

Previene loops infinitos en objetos con referencias circulares:

```typescript
const obj: any = { name: "Test" };
obj.self = obj;

makeReactive(obj, onChange);
```

Sin `visited`, esto causaría:
```
makeReactive(obj)
  └─► makeReactive(obj.self)
        └─► makeReactive(obj.self.self)
              └─► [STACK OVERFLOW]
```

Con `visited`:
```
makeReactive(obj)
  ├─► visited.add(obj)
  └─► makeReactive(obj.self)
        └─► visited.has(obj) = true → return obj
```

## 9. Comparación con Otros Sistemas Reactivos

### 9.1 Vue 3 (Proxy-based)

```typescript
const state = reactive({ count: 0 });

effect(() => {
  console.log(state.count);
});

state.count++;
```

**Similitudes con PelelaJS:**
- Usa Proxy
- Detección automática de cambios
- Objetos anidados reactivos

**Diferencias:**
- Vue tiene `effect()` para side effects
- Vue tiene `computed()` para propiedades derivadas
- PelelaJS conecta directamente con bindings

### 9.2 React (Virtual DOM)

```typescript
const [count, setCount] = useState(0);

<div>{count}</div>

setCount(count + 1);
```

**Diferencias con PelelaJS:**
- React no es reactivo (pull-based)
- Requiere `setState()` explícito
- Re-renderiza componentes, no DOM directo
- PelelaJS es push-based y automático

### 9.3 Angular (Zone.js)

```typescript
export class AppComponent {
  count = 0;
  
  increment() {
    this.count++;
  }
}
```

**Diferencias con PelelaJS:**
- Angular usa Zone.js para monkey-patch
- Detecta cambios después de eventos async
- Change detection runs from root
- PelelaJS detecta cambios síncronamente

### 9.4 Svelte (Compiler)

```typescript
let count = 0;
$: doubled = count * 2;
```

**Diferencias con PelelaJS:**
- Svelte compila a código imperativo
- No hay runtime reactivo
- PelelaJS usa Proxy en runtime
- Svelte tiene `$:` para reactive statements

## 10. Limitaciones y Edge Cases

### 10.1 No Detecta Cambios Internos en Objetos Nativos

```typescript
const date = new Date();
viewModel.createdAt = date;

date.setFullYear(2025);
```

El cambio interno a `Date` NO dispara onChange(). Solución:

```typescript
viewModel.createdAt = new Date(2025, 0, 1);
```

### 10.2 Métodos de Array No-Mutation

```typescript
const filtered = viewModel.items.filter(item => item.active);
```

`filter()` NO muta el array, entonces NO dispara onChange(). Esto es correcto porque el array original no cambió.

Para aplicar el filtro:

```typescript
viewModel.items = viewModel.items.filter(item => item.active);
```

### 10.3 Asignación de Propiedades en Constructor

```typescript
class ViewModel {
  items: any[];
  
  constructor() {
    this.items = [];
  }
}
```

Durante `new ViewModel()`, el objeto AÚN NO es reactivo. Las asignaciones en el constructor no disparan onChange(). Esto es correcto y esperado.

## 11. Debugging del Sistema Reactivo

### 11.1 Trazas de Console

Agregar logs en el Proxy:

```typescript
set(obj, prop, value) {
  console.log(`[REACTIVE] Set: ${parentPath ? parentPath + "." : ""}${String(prop)} = ${value}`);
  
  const oldValue = obj[prop];
  
  if (oldValue === value) {
    console.log(`[REACTIVE] No change detected (old === new)`);
    return true;
  }
  
  // ...
  
  onChange(fullPath);
  console.log(`[REACTIVE] onChange dispatched: ${fullPath}`);
  
  return result;
}
```

### 11.2 Visualización del Proxy

```typescript
console.log(viewModel);
```

Mostrará: `Proxy { ... }` con las propiedades.

Para ver el objeto original:

```typescript
console.log(viewModel.$raw);
```

### 11.3 Breakpoints en onChange

```typescript
const reactiveInstance = createReactiveViewModel(
  instance,
  (changedPath: string) => {
    console.log(`[DEBUG] onChange called with path: ${changedPath}`);
    debugger;
    render(changedPath);
  },
);
```

## Conclusión

El sistema reactivo de PelelaJS es:

1. **Basado en Proxy:** Intercepta operaciones de lectura y escritura
2. **Automático:** No requiere llamadas explícitas a setters
3. **Profundo:** Funciona con objetos anidados y arrays
4. **Optimizado:** Cache de proxies, early returns, dependency tracking
5. **Predecible:** Flujo claro desde cambio hasta DOM

El uso de JavaScript Proxy permite una API simple para el desarrollador mientras mantiene un control fino sobre la detección de cambios.

## Referencias

- [Arquitectura General](./01-general-architecture.md)
- [Ciclo de Vida de la Aplicación](./02-application-lifecycle.md)
- [Sistema de Reactividad Detallado](../03-reactivity/01-reactive-proxy.md)
- [Dependency Tracker](../04-bindings/02-dependency-tracker.md)

