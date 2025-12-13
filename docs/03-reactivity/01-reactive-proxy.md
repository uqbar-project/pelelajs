# 3.1 ReactiveProxy (createReactiveViewModel)

## Introducción

El ReactiveProxy es el núcleo del sistema de reactividad de PelelaJS. Utiliza el API de JavaScript Proxy para interceptar operaciones sobre objetos y detectar cambios automáticamente, permitiendo que el framework actualice el DOM sin intervención manual del desarrollador.

Este documento explica en profundidad cómo funciona el sistema de proxies, desde los handlers básicos hasta el manejo de objetos anidados y arrays complejos.

## JavaScript Proxy: Fundamentos

### ¿Qué es un Proxy?

Un Proxy es un objeto que envuelve otro objeto y puede interceptar operaciones sobre él:

```typescript
const target = { name: "John", age: 30 };

const handler = {
  get(target, property, receiver) {
    console.log(`GET ${String(property)}`);
    return Reflect.get(target, property, receiver);
  },
  
  set(target, property, value, receiver) {
    console.log(`SET ${String(property)} = ${value}`);
    return Reflect.set(target, property, value, receiver);
  }
};

const proxy = new Proxy(target, handler);

proxy.name;
proxy.age = 31;
```

Output:
```
GET name
SET age = 31
```

### Traps Disponibles

| Trap | Operación Interceptada | Uso en PelelaJS |
|------|------------------------|-----------------|
| `get` | `obj.prop`, `obj[prop]` | ✅ Reactividad profunda |
| `set` | `obj.prop = value` | ✅ Detección de cambios |
| `deleteProperty` | `delete obj.prop` | ✅ Detección de eliminación |
| `has` | `'prop' in obj` | ❌ No usado |
| `ownKeys` | `Object.keys(obj)` | ❌ No usado |
| `getOwnPropertyDescriptor` | `Object.getOwnPropertyDescriptor()` | ❌ No usado |
| `defineProperty` | `Object.defineProperty()` | ❌ No usado |
| `apply` | `func()` | ❌ No usado |
| `construct` | `new Constructor()` | ❌ No usado |

PelelaJS usa solo 3 traps: `get`, `set`, y `deleteProperty`.

## Arquitectura del ReactiveProxy

```
┌──────────────────────────────────────────────────────────────┐
│                  REACTIVE PROXY SYSTEM                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Plain Object                                                │
│       │                                                       │
│       ▼                                                       │
│  createReactiveViewModel(obj, onChange)                      │
│       │                                                       │
│       └─► makeReactive(obj, onChange, visited, parentPath)   │
│                │                                              │
│                ├─► Validaciones                              │
│                │   ├─ isObject?                              │
│                │   ├─ En proxyCache?                         │
│                │   └─ En visited?                            │
│                │                                              │
│                ├─► Crear ProxyHandler                        │
│                │   ├─ get()    → Reactividad profunda        │
│                │   ├─ set()    → onChange(path)              │
│                │   └─ deleteProperty() → onChange(path)      │
│                │                                              │
│                ├─► new Proxy(target, handler)                │
│                │                                              │
│                ├─► Guardar en cache                          │
│                │   ├─ proxyCache.set(target, proxy)          │
│                │   └─ rawObjectCache.set(proxy, target)      │
│                │                                              │
│                └─► return Proxy                              │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Código Fuente Completo

### Estructura de Archivos

```
packages/core/src/reactivity/
└── reactiveProxy.ts
```

### Variables Globales

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

const proxyCache = new WeakMap<object, any>();
const rawObjectCache = new WeakMap<object, any>();
```

### Función Principal

```typescript
export function createReactiveViewModel<T extends object>(
  target: T,
  onChange: (changedPath: string) => void,
): ReactiveViewModel<T> {
  return makeReactive(target, onChange);
}
```

### Tipo de Retorno

```typescript
export type ReactiveViewModel<T extends object> = T & {
  $raw: T;
  $set: (target: any, key: PropertyKey, value: any) => void;
  $delete: (target: any, key: PropertyKey) => void;
};
```

## makeReactive: Función Core

### Signatura

```typescript
function makeReactive(
  target: any,
  onChange: (changedPath: string) => void,
  visited = new WeakSet<object>(),
  parentPath = "",
): any
```

### Parámetros

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `target` | `any` | Objeto a convertir en reactivo |
| `onChange` | `(path: string) => void` | Callback para notificar cambios |
| `visited` | `WeakSet<object>` | Set para prevenir ciclos infinitos |
| `parentPath` | `string` | Path acumulado para propiedades anidadas |

### Flujo Completo

```
makeReactive(target, onChange, visited, parentPath)
    │
    ├─► 1. VALIDACIÓN DE TIPO
    │      if (!isObject(target)) return target
    │
    ├─► 2. CHECK DE CACHE
    │      if (proxyCache.has(target)) return cached
    │
    ├─► 3. CHECK DE CICLOS
    │      if (visited.has(target)) return target
    │
    ├─► 4. MARCAR COMO VISITADO
    │      visited.add(target)
    │
    ├─► 5. DETERMINAR TIPO
    │      isArray = Array.isArray(target)
    │
    ├─► 6. CREAR HANDLER
    │      handler: ProxyHandler<any> = { get, set, deleteProperty }
    │
    ├─► 7. CREAR PROXY
    │      proxy = new Proxy(target, handler)
    │
    ├─► 8. GUARDAR EN CACHE
    │      proxyCache.set(target, proxy)
    │      rawObjectCache.set(proxy, target)
    │
    └─► 9. RETURN PROXY
```

## Proxy Handler: Get Trap

### Código Completo

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

### Casos Manejados por Get

#### Caso 1: Operador $raw

```typescript
viewModel.$raw
```

```
Flujo:
  Proxy.get(obj, "$raw")
    │
    └─► return obj (el objeto original sin proxy)
```

**Uso:**

```typescript
const reactiveVM = createReactiveViewModel(instance, onChange);

const raw = reactiveVM.$raw;

raw.count = 10;
```

Sin proxy → sin onChange().

#### Caso 2: Operador $set

```typescript
viewModel.$set
```

```
Flujo:
  Proxy.get(obj, "$set")
    │
    └─► return función para agregar propiedades reactivas
```

**Uso:**

```typescript
viewModel.$set(viewModel.user, "email", "john@example.com");
```

```
Ejecución:
  1. makeReactive("john@example.com")
  2. target["email"] = reactive value
  3. onChange("user.email")
```

#### Caso 3: Operador $delete

```typescript
viewModel.$delete
```

```
Flujo:
  Proxy.get(obj, "$delete")
    │
    └─► return función para eliminar propiedades reactivamente
```

**Uso:**

```typescript
viewModel.$delete(viewModel.user, "tempField");
```

```
Ejecución:
  1. delete target["tempField"]
  2. onChange("user.tempField")
```

#### Caso 4: Métodos de Array Mutation

```typescript
viewModel.items.push({ name: "New" })
```

```
Flujo:
  Proxy.get(obj, "push")
    │
    ├─► isArray? YES
    ├─► "push" in ARRAY_MUTATION_METHODS? YES
    │
    └─► return wrapped function
          │
          └─► Ejecución:
                ├─ makeReactive({ name: "New" })
                ├─ Array.prototype.push.apply(this, [reactiveItem])
                └─ onChange("items")
```

**Métodos Interceptados:**

```typescript
const ARRAY_MUTATION_METHODS = [
  "push",    // arr.push(item)
  "pop",     // arr.pop()
  "shift",   // arr.shift()
  "unshift", // arr.unshift(item)
  "splice",  // arr.splice(index, count, ...items)
  "sort",    // arr.sort()
  "reverse", // arr.reverse()
];
```

**Ejemplo Detallado:**

```typescript
const vm = createReactiveViewModel({ items: [] }, (path) => {
  console.log(`Changed: ${path}`);
});

vm.items.push({ id: 1, name: "Item 1" });
```

```
Traza:
1. vm.items
   └─► Proxy.get(vm, "items")
         └─► return makeReactive([], onChange, visited, "items")

2. items.push
   └─► Proxy.get([], "push")
         ├─► isArray = true
         ├─► "push" in ARRAY_MUTATION_METHODS = true
         └─► return wrapped push function

3. wrapped push({ id: 1, name: "Item 1" })
   ├─► makeReactive({ id: 1, name: "Item 1" })
   │     └─► Proxy { id: 1, name: "Item 1" }
   │
   ├─► Array.prototype.push.apply([], [reactiveItem])
   │     └─► [Proxy { id: 1, name: "Item 1" }]
   │
   └─► onChange("items")
         └─► Console: Changed: items
```

#### Caso 5: Propiedades Anidadas (Objetos)

```typescript
viewModel.user.name
```

```
Flujo:
  1. Proxy.get(vm, "user")
     │
     ├─► value = { name: "John", age: 30 }
     ├─► isObject(value) = true
     │
     └─► makeReactive(value, onChange, newVisited, "user")
           │
           └─► return Proxy

  2. Proxy.get(userProxy, "name")
     │
     ├─► value = "John"
     ├─► isObject(value) = false
     │
     └─► return "John"
```

**Reactividad Profunda:**

```typescript
viewModel.user.profile.settings.theme = "dark"
```

Cada acceso crea/retorna un proxy:

```
viewModel
  └─► .user → Proxy (parentPath = "user")
        └─► .profile → Proxy (parentPath = "user.profile")
              └─► .settings → Proxy (parentPath = "user.profile.settings")
                    └─► .theme = "dark" → onChange("user.profile.settings.theme")
```

#### Caso 6: Valores Primitivos

```typescript
viewModel.count
```

```
Flujo:
  Proxy.get(vm, "count")
    │
    ├─► value = 5
    ├─► isObject(value) = false
    │
    └─► return 5 (sin proxy)
```

## Proxy Handler: Set Trap

### Código Completo

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

### Flujo del Set Trap

```
Proxy.set(obj, prop, value)
    │
    ├─► 1. OBTENER OLD VALUE
    │      oldValue = obj[prop]
    │
    ├─► 2. CHECK SI CAMBIÓ
    │      if (oldValue === value) return true (sin onChange)
    │
    ├─► 3. HACER REACTIVO SI ES OBJETO
    │      reactiveValue = isObject(value)
    │        ? makeReactive(value, ...)
    │        : value
    │
    ├─► 4. ASIGNAR
    │      Reflect.set(obj, prop, reactiveValue)
    │
    ├─► 5. NOTIFICAR CAMBIO
    │      if (result) onChange(fullPath)
    │
    └─► 6. RETURN RESULT
```

### Ejemplos de Set

#### Ejemplo 1: Valor Primitivo

```typescript
viewModel.count = 5;
```

```
Traza:
1. Proxy.set(vm, "count", 5)

2. oldValue = vm["count"] = 0

3. oldValue === 5? NO

4. isObject(5)? NO
   └─► reactiveValue = 5

5. Reflect.set(vm, "count", 5)
   └─► vm.count = 5
   └─► result = true

6. fullPath = "count"

7. onChange("count")

8. return true
```

#### Ejemplo 2: Objeto Nuevo

```typescript
viewModel.user = { name: "Jane", age: 25 };
```

```
Traza:
1. Proxy.set(vm, "user", { name: "Jane", age: 25 })

2. oldValue = vm["user"] = { name: "John", age: 30 }

3. oldValue === { name: "Jane", age: 25 }? NO (diferentes referencias)

4. isObject({ name: "Jane", age: 25 })? SÍ
   └─► makeReactive({ name: "Jane", age: 25 }, onChange, ...)
         └─► reactiveValue = Proxy { name: "Jane", age: 25 }

5. Reflect.set(vm, "user", reactiveValue)
   └─► vm.user = Proxy { ... }
   └─► result = true

6. fullPath = "user"

7. onChange("user")

8. return true
```

#### Ejemplo 3: Mismo Valor (No Change)

```typescript
viewModel.count = 5;
viewModel.count = 5;
```

```
Segunda asignación:
1. Proxy.set(vm, "count", 5)

2. oldValue = 5

3. oldValue === 5? SÍ
   └─► return true (SIN onChange)
```

**Optimización:** Evita notificaciones innecesarias.

#### Ejemplo 4: Propiedad Anidada

```typescript
viewModel.user.name = "Alice";
```

```
Traza:
1. Proxy.get(vm, "user")
   └─► return Proxy (parentPath = "user")

2. Proxy.set(userProxy, "name", "Alice")
   ├─► oldValue = "John"
   ├─► oldValue === "Alice"? NO
   ├─► isObject("Alice")? NO
   ├─► Reflect.set(userObj, "name", "Alice")
   ├─► fullPath = "user" + "." + "name" = "user.name"
   └─► onChange("user.name")
```

#### Ejemplo 5: Array por Índice

```typescript
viewModel.items[0] = { id: 1, name: "Updated" };
```

```
Traza:
1. Proxy.get(vm, "items")
   └─► return Proxy (parentPath = "items")

2. Proxy.set(itemsProxy, "0", { id: 1, name: "Updated" })
   ├─► oldValue = { id: 1, name: "Original" }
   ├─► oldValue === nuevo? NO
   ├─► isObject(nuevo)? SÍ
   │     └─► makeReactive({ id: 1, name: "Updated" })
   ├─► Reflect.set(items, "0", reactiveValue)
   ├─► fullPath = "items.0"
   └─► onChange("items.0")
```

## Proxy Handler: DeleteProperty Trap

### Código Completo

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

### Flujo del DeleteProperty Trap

```
Proxy.deleteProperty(obj, prop)
    │
    ├─► 1. CHECK SI EXISTE
    │      hadProperty = prop in obj
    │
    ├─► 2. ELIMINAR
    │      result = Reflect.deleteProperty(obj, prop)
    │
    ├─► 3. NOTIFICAR SI EXISTÍA
    │      if (result && hadProperty) onChange(fullPath)
    │
    └─► 4. RETURN RESULT
```

### Ejemplos de Delete

#### Ejemplo 1: Delete Básico

```typescript
delete viewModel.tempData;
```

```
Traza:
1. Proxy.deleteProperty(vm, "tempData")

2. hadProperty = "tempData" in vm = true

3. Reflect.deleteProperty(vm, "tempData")
   └─► delete vm.tempData
   └─► result = true

4. result && hadProperty? true && true = true
   └─► onChange("tempData")

5. return true
```

#### Ejemplo 2: Delete Propiedad Inexistente

```typescript
delete viewModel.nonExistent;
```

```
Traza:
1. Proxy.deleteProperty(vm, "nonExistent")

2. hadProperty = "nonExistent" in vm = false

3. Reflect.deleteProperty(vm, "nonExistent")
   └─► result = true (no error)

4. result && hadProperty? true && false = false
   └─► NO se llama onChange

5. return true
```

#### Ejemplo 3: Delete Anidado

```typescript
delete viewModel.user.email;
```

```
Traza:
1. Proxy.get(vm, "user")
   └─► return Proxy (parentPath = "user")

2. Proxy.deleteProperty(userProxy, "email")
   ├─► hadProperty = true
   ├─► Reflect.deleteProperty(userObj, "email")
   ├─► fullPath = "user.email"
   └─► onChange("user.email")
```

## Cache de Proxies

### Propósito

Evitar crear múltiples proxies para el mismo objeto:

```typescript
const proxyCache = new WeakMap<object, any>();
const rawObjectCache = new WeakMap<object, any>();
```

### WeakMap vs Map

| Característica | WeakMap | Map |
|----------------|---------|-----|
| Keys | Solo objetos | Cualquier tipo |
| Garbage Collection | Automático | Manual |
| Enumerable | No | Sí |
| Size | No disponible | Disponible |

**Por qué WeakMap:**

```typescript
let obj = { name: "Test" };
let proxy = createReactiveViewModel(obj, onChange);

obj = null;
```

Con `WeakMap`: El proxy puede ser garbage collected automáticamente.
Con `Map`: El proxy permanece en memoria indefinidamente (memory leak).

### Flujo del Cache

```
makeReactive(target, onChange)
    │
    ├─► proxyCache.has(target)?
    │     ├─ SÍ → return proxyCache.get(target)
    │     └─ NO → continuar
    │
    ├─► crear nuevo Proxy
    │
    ├─► proxyCache.set(target, proxy)
    ├─► rawObjectCache.set(proxy, target)
    │
    └─► return proxy
```

### Ejemplo de Cache

```typescript
const vm = createReactiveViewModel(
  { user: { name: "John" } },
  onChange
);

const user1 = vm.user;
const user2 = vm.user;

console.log(user1 === user2);
```

```
Traza:
1. vm.user (primer acceso)
   ├─► Proxy.get(vm, "user")
   ├─► makeReactive(userObj, onChange)
   │     ├─ proxyCache.has(userObj)? NO
   │     ├─ crear Proxy
   │     ├─ proxyCache.set(userObj, userProxy)
   │     └─ return userProxy
   └─► user1 = userProxy

2. vm.user (segundo acceso)
   ├─► Proxy.get(vm, "user")
   ├─► makeReactive(userObj, onChange)
   │     ├─ proxyCache.has(userObj)? SÍ!
   │     └─ return proxyCache.get(userObj)
   └─► user2 = cached userProxy

3. user1 === user2? TRUE ✓
```

### Beneficios del Cache

1. **Consistencia:** Mismo objeto → mismo proxy
2. **Performance:** No se crean proxies redundantes
3. **Identidad:** `===` funciona correctamente
4. **Memory:** Reduce uso de memoria

## Visited Set: Prevención de Ciclos

### Problema: Referencias Circulares

```typescript
const obj: any = { name: "Test" };
obj.self = obj;

makeReactive(obj, onChange);
```

Sin protección:

```
makeReactive(obj)
  └─► makeReactive(obj.self)
        └─► makeReactive(obj.self.self)
              └─► makeReactive(obj.self.self.self)
                    └─► [STACK OVERFLOW]
```

### Solución: Visited Set

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
  
  // ... resto del código
}
```

### Flujo con Visited

```
makeReactive(obj, onChange, visited)
    │
    ├─► visited.has(obj)? NO
    ├─► visited.add(obj)
    │
    └─► Crear Proxy
          │
          └─► get handler:
                makeReactive(obj.self, onChange, visited)
                  │
                  ├─► visited.has(obj.self)? SÍ (obj.self === obj)
                  │
                  └─► return obj (sin crear proxy)
```

### Ejemplo Completo

```typescript
const circular: any = {
  name: "Root",
  child: {
    name: "Child"
  }
};

circular.child.parent = circular;

const reactive = createReactiveViewModel(circular, (path) => {
  console.log(`Changed: ${path}`);
});

reactive.child.parent.name = "Updated";
```

```
Traza:
1. makeReactive(circular, onChange, {})
   ├─► visited.add(circular)
   └─► Proxy(circular)

2. reactive.child
   └─► makeReactive(childObj, onChange, newVisited)
         ├─► newVisited.add(circular)  ← Parent en visited
         ├─► newVisited.add(childObj)
         └─► Proxy(childObj)

3. reactive.child.parent
   └─► makeReactive(circular, onChange, visited)
         ├─► visited.has(circular)? SÍ
         └─► return circular (sin crear nuevo proxy)

4. reactive.child.parent.name = "Updated"
   └─► Usa el proxy original de circular
   └─► onChange("name")
```

## Parent Path: Tracking de Rutas

### Propósito

Construir el path completo de propiedades anidadas:

```typescript
viewModel.user.profile.settings.theme = "dark"
                                        │
                                        └─► onChange("user.profile.settings.theme")
```

### Construcción del Path

```typescript
function makeReactive(
  target: any,
  onChange: (changedPath: string) => void,
  visited = new WeakSet<object>(),
  parentPath = "",
): any {
  // ...
  
  const handler: ProxyHandler<any> = {
    get(obj, prop) {
      // ...
      const childPath = parentPath 
        ? `${parentPath}.${String(prop)}` 
        : String(prop);
      return makeReactive(value, onChange, newVisited, childPath);
    },
    
    set(obj, prop, value) {
      // ...
      const fullPath = parentPath 
        ? `${parentPath}.${String(prop)}` 
        : String(prop);
      onChange(fullPath);
    }
  };
}
```

### Ejemplo de Path Building

```typescript
const vm = createReactiveViewModel(
  {
    user: {
      profile: {
        name: "John"
      }
    }
  },
  (path) => console.log(`Path: ${path}`)
);

vm.user.profile.name = "Jane";
```

```
Traza de Paths:

1. createReactiveViewModel(root, onChange)
   └─► makeReactive(root, onChange, {}, "")
         └─► parentPath = ""

2. vm.user
   └─► Proxy.get(root, "user")
         ├─► childPath = "" + "user" = "user"
         └─► makeReactive(userObj, onChange, {}, "user")
               └─► parentPath = "user"

3. vm.user.profile
   └─► Proxy.get(userObj, "profile")
         ├─► childPath = "user" + "." + "profile" = "user.profile"
         └─► makeReactive(profileObj, onChange, {}, "user.profile")
               └─► parentPath = "user.profile"

4. vm.user.profile.name = "Jane"
   └─► Proxy.set(profileObj, "name", "Jane")
         ├─► fullPath = "user.profile" + "." + "name"
         ├─► fullPath = "user.profile.name"
         └─► onChange("user.profile.name")
               └─► Console: Path: user.profile.name
```

## Manejo de Arrays

### Arrays Reactivos

```typescript
const vm = createReactiveViewModel(
  { items: [1, 2, 3] },
  onChange
);
```

Arrays son objetos especiales:

```typescript
isArray = Array.isArray(target);
```

### Métodos de Mutación Interceptados

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

### Wrapper de Métodos

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

### Ejemplos de Array Mutations

#### push()

```typescript
vm.items.push(4);
```

```
Traza:
1. vm.items
   └─► Proxy (parentPath = "items")

2. items.push
   └─► Interceptado → wrapped function

3. wrapped push(4)
   ├─► reactiveArgs = [4] (no es objeto)
   ├─► Array.prototype.push.apply(items, [4])
   │     └─► items = [1, 2, 3, 4]
   └─► onChange("items")
```

#### push() con Objeto

```typescript
vm.items.push({ id: 4, name: "Item 4" });
```

```
Traza:
1. wrapped push({ id: 4, name: "Item 4" })
   │
   ├─► reactiveArgs = args.map(makeReactive)
   │     └─► [Proxy { id: 4, name: "Item 4" }]
   │
   ├─► Array.prototype.push.apply(items, [reactiveProxy])
   │     └─► items = [1, 2, 3, Proxy { ... }]
   │
   └─► onChange("items")
```

#### splice()

```typescript
vm.items.splice(1, 1, { id: 5 });
```

```
Traza:
1. wrapped splice(1, 1, { id: 5 })
   │
   ├─► args = [1, 1, { id: 5 }]
   │
   ├─► reactiveArgs = [
   │     1,              ← no es objeto
   │     1,              ← no es objeto
   │     Proxy { id: 5 } ← objeto reactivo
   │   ]
   │
   ├─► Array.prototype.splice.apply(items, reactiveArgs)
   │     └─► Elimina items[1], inserta Proxy
   │
   └─► onChange("items")
```

#### sort()

```typescript
vm.items.sort((a, b) => b - a);
```

```
Traza:
1. wrapped sort((a, b) => b - a)
   │
   ├─► args = [(a, b) => b - a]
   │
   ├─► reactiveArgs = [(a, b) => b - a]  ← función, no objeto
   │
   ├─► Array.prototype.sort.apply(items, [compareFn])
   │     └─► items reordenado in-place
   │
   └─► onChange("items")
```

### Métodos No Mutantes

Métodos que **no** mutan el array y **no** son interceptados:

```typescript
vm.items.map(x => x * 2);     // NO dispara onChange
vm.items.filter(x => x > 2);  // NO dispara onChange
vm.items.slice(0, 2);         // NO dispara onChange
vm.items.concat([4, 5]);      // NO dispara onChange
```

Esto es correcto porque estos métodos retornan un **nuevo array** sin modificar el original.

Para aplicar el resultado:

```typescript
vm.items = vm.items.filter(x => x > 2);
```

Esto **sí** dispara onChange en el setter.

## Objetos Anidados Profundos

### Ejemplo de Estructura Profunda

```typescript
const vm = createReactiveViewModel(
  {
    company: {
      departments: [
        {
          name: "Engineering",
          teams: [
            {
              name: "Frontend",
              members: [
                { name: "John", role: "Senior" },
                { name: "Jane", role: "Mid" }
              ]
            }
          ]
        }
      ]
    }
  },
  onChange
);
```

### Cambio Profundo

```typescript
vm.company.departments[0].teams[0].members[1].role = "Senior";
```

```
Traza Completa:

1. vm.company
   └─► makeReactive(companyObj, onChange, {}, "company")

2. company.departments
   └─► makeReactive(departmentsArray, onChange, {}, "company.departments")

3. departments[0]
   └─► makeReactive(dept0, onChange, {}, "company.departments.0")

4. dept0.teams
   └─► makeReactive(teamsArray, onChange, {}, "company.departments.0.teams")

5. teams[0]
   └─► makeReactive(team0, onChange, {}, "company.departments.0.teams.0")

6. team0.members
   └─► makeReactive(membersArray, onChange, {}, "company.departments.0.teams.0.members")

7. members[1]
   └─► makeReactive(member1, onChange, {}, "company.departments.0.teams.0.members.1")

8. member1.role = "Senior"
   └─► Proxy.set(member1, "role", "Senior")
         ├─► fullPath = "company.departments.0.teams.0.members.1.role"
         └─► onChange("company.departments.0.teams.0.members.1.role")
```

**Resultado:** El path completo se construye correctamente!

## Tipos TypeScript

### ReactiveViewModel Type

```typescript
export type ReactiveViewModel<T extends object> = T & {
  $raw: T;
  $set: (target: any, key: PropertyKey, value: any) => void;
  $delete: (target: any, key: PropertyKey) => void;
};
```

**Uso:**

```typescript
const vm: ReactiveViewModel<{ count: number }> = createReactiveViewModel(
  { count: 0 },
  onChange
);

vm.count;
vm.$raw;
vm.$set(vm, "newProp", 10);
vm.$delete(vm, "count");
```

### Type Safety

```typescript
class UserViewModel {
  name = "John";
  age = 30;
}

const vm = createReactiveViewModel(new UserViewModel(), onChange);

vm.name = "Jane";
vm.age = 31;
vm.nonExistent = "error";
```

TypeScript **no detectará** `vm.nonExistent` como error porque el proxy retorna `any`.

Para mejor type safety, usar interfaces:

```typescript
interface IUserViewModel {
  name: string;
  age: number;
}

const vm: ReactiveViewModel<IUserViewModel> = createReactiveViewModel(
  new UserViewModel(),
  onChange
);

vm.nonExistent = "error";
```

## Performance y Optimizaciones

### Benchmarks

```typescript
const iterations = 100000;

const plain = { count: 0 };
const reactive = createReactiveViewModel({ count: 0 }, () => {});

console.time("Plain Object");
for (let i = 0; i < iterations; i++) {
  plain.count = i;
}
console.timeEnd("Plain Object");

console.time("Reactive Proxy");
for (let i = 0; i < iterations; i++) {
  reactive.count = i;
}
console.timeEnd("Reactive Proxy");
```

**Resultados típicos:**

```
Plain Object: ~2ms
Reactive Proxy: ~15ms
```

Proxy es ~7.5x más lento, pero sigue siendo muy rápido en términos absolutos.

### Optimizaciones Implementadas

#### 1. Early Return en Set

```typescript
if (oldValue === value) {
  return true;
}
```

Evita onChange innecesarios.

#### 2. Cache de Proxies

```typescript
if (proxyCache.has(target)) {
  return proxyCache.get(target);
}
```

Reutiliza proxies existentes.

#### 3. WeakMap para Memory

```typescript
const proxyCache = new WeakMap<object, any>();
```

Permite garbage collection automática.

### Bottlenecks

1. **Objetos muy anidados:** Cada nivel requiere un proxy
2. **Arrays grandes con mutación frecuente:** Cada push dispara onChange
3. **onChange costoso:** Si el render es lento, el proxy espera

## Testing del ReactiveProxy

### Test Básico

```typescript
import { describe, it, expect } from "vitest";
import { createReactiveViewModel } from "@pelelajs/core";

describe("ReactiveProxy", () => {
  it("should detect property changes", () => {
    let changedPath = "";
    
    const vm = createReactiveViewModel(
      { count: 0 },
      (path) => { changedPath = path; }
    );
    
    vm.count = 5;
    
    expect(changedPath).toBe("count");
    expect(vm.count).toBe(5);
  });
});
```

### Test de Objetos Anidados

```typescript
it("should track nested property changes", () => {
  let changedPath = "";
  
  const vm = createReactiveViewModel(
    { user: { name: "John" } },
    (path) => { changedPath = path; }
  );
  
  vm.user.name = "Jane";
  
  expect(changedPath).toBe("user.name");
  expect(vm.user.name).toBe("Jane");
});
```

### Test de Arrays

```typescript
it("should detect array mutations", () => {
  const changes: string[] = [];
  
  const vm = createReactiveViewModel(
    { items: [1, 2, 3] },
    (path) => { changes.push(path); }
  );
  
  vm.items.push(4);
  vm.items.pop();
  vm.items[0] = 10;
  
  expect(changes).toEqual(["items", "items", "items.0"]);
});
```

## Conclusión

El ReactiveProxy de PelelaJS es:

1. **Basado en ES6 Proxy:** Utiliza el API nativo del lenguaje
2. **Profundo:** Funciona con objetos anidados a cualquier nivel
3. **Completo:** Intercepta get, set, delete
4. **Optimizado:** Cache, early returns, WeakMap
5. **Robusto:** Maneja ciclos, arrays, tipos primitivos
6. **Extensible:** Operadores especiales ($raw, $set, $delete)

El uso de proxies permite una API simple para el desarrollador mientras mantiene control total sobre la detección de cambios.

## Referencias

- [Arquitectura General](../01-architecture/01-general-architecture.md)
- [Flujo de Datos Reactivo](../01-architecture/03-reactive-data-flow.md)
- [Change Detection](./02-change-detection.md)
- [Sistema de Bindings](../04-bindings/01-binding-system.md)

