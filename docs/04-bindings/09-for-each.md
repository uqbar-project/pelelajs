# 4.3.6 for-each (List Rendering)

## Introducción

El binding `for-each` es el más complejo y poderoso de PelelaJS. Permite renderizar listas de elementos dinámicamente, creando una instancia del template por cada item en una colección. Incluye reconciliación inteligente, scope local para cada item, y soporte para bindings anidados.

## Propósito

```
┌────────────────────────────────────────────────────────────────┐
│                   for-each PURPOSE                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Renderizar listas dinámicas                                   │
│                                                                 │
│  viewModel.items = [                                           │
│    { id: 1, name: "Item 1" },                                  │
│    { id: 2, name: "Item 2" }                                   │
│  ]                                                              │
│       │                                                         │
│       ▼                                                         │
│  <div for-each="item of items">                                │
│    <span bind-value="item.name"></span>                        │
│  </div>                                                         │
│       │                                                         │
│       ▼                                                         │
│  <!-- for-each: item of items -->                              │
│  <div><span>Item 1</span></div>                                │
│  <div><span>Item 2</span></div>                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Syntax HTML

```html
<elemento for-each="itemName of collectionName">
  <!-- Template que se repite por cada item -->
</elemento>
```

### Ejemplos

```html
<div for-each="todo of todos">
  <span bind-value="todo.title"></span>
</div>

<li for-each="user of users">
  <span bind-value="user.name"></span>
</li>

<tr for-each="row of tableData">
  <td bind-value="row.col1"></td>
  <td bind-value="row.col2"></td>
</tr>
```

## Tipo ForEachBinding

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

## Fase 1: Parsing de Expresiones

### parseForEachExpression

```typescript
function parseForEachExpression(expression: string): {
  itemName: string;
  collectionName: string;
} | null {
  const match = expression.trim().match(/^(\w+)\s+of\s+(\w+)$/);
  if (!match) return null;
  return {
    itemName: match[1],
    collectionName: match[2],
  };
}
```

### Regex Breakdown

```
/^(\w+)\s+of\s+(\w+)$/

^           - Inicio de string
(\w+)       - Grupo 1: itemName (uno o más word chars)
\s+         - Uno o más espacios
of          - Literal "of"
\s+         - Uno o más espacios
(\w+)       - Grupo 2: collectionName
$           - Fin de string
```

### Ejemplos de Parsing

#### Ejemplo 1: Válido

```typescript
parseForEachExpression("todo of todos")
```

```
match[1] = "todo"      → itemName
match[2] = "todos"     → collectionName

Result: { itemName: "todo", collectionName: "todos" }
```

#### Ejemplo 2: Con Espacios Extra

```typescript
parseForEachExpression("  item   of   items  ")
```

```
expression.trim() = "item   of   items"
match[1] = "item"
match[2] = "items"

Result: { itemName: "item", collectionName: "items" }
```

#### Ejemplo 3: Inválido - Falta "of"

```typescript
parseForEachExpression("item items")
```

```
match = null

throw Error: Invalid for-each expression: "item items"
```

#### Ejemplo 4: Inválido - Múltiples palabras

```typescript
parseForEachExpression("item name of items")
```

```
match = null (no cumple el regex)

throw Error: Invalid for-each expression: "item name of items"
```

## Fase 2: Setup de for-each

### Proceso Completo

```
setupSingleForEachBinding(element, viewModel)
    │
    ├─► 1. PARSING
    │      parseForEachExpression("item of collection")
    │        └─► { itemName, collectionName }
    │
    ├─► 2. VALIDACIÓN
    │      assertViewModelProperty(vm, collectionName)
    │      Verificar que es array
    │
    ├─► 3. TEMPLATE
    │      Clone del elemento original
    │      Remover atributo for-each
    │
    ├─► 4. PLACEHOLDER
    │      Crear comment node: <!-- for-each: item of collection -->
    │
    ├─► 5. REEMPLAZO
    │      Insertar placeholder antes del elemento
    │      Remover elemento original del DOM
    │
    └─► 6. RETURN BINDING
           {
             collectionName,
             itemName,
             template,
             placeholder,
             renderedElements: [],
             previousLength: 0
           }
```

### Código de Setup

```typescript
function setupSingleForEachBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ForEachBinding | null {
  const expression = element.getAttribute("for-each");
  if (!expression || !expression.trim()) return null;

  const parsed = parseForEachExpression(expression);
  if (!parsed) {
    throw new Error(
      `[pelela] Invalid for-each expression: "${expression}". Expected format: "item of collection"`,
    );
  }

  const { itemName, collectionName } = parsed;

  assertViewModelProperty(viewModel, collectionName, "for-each", element);

  const collection = viewModel[collectionName];
  if (!Array.isArray(collection)) {
    throw new Error(
      `[pelela] Property "${collectionName}" must be an array for for-each binding`,
    );
  }

  const template = element.cloneNode(true) as HTMLElement;
  template.removeAttribute("for-each");

  if (!element.parentNode) {
    throw new Error(
      `[pelela] for-each: Cannot setup binding, element has no parent node`,
    );
  }

  const placeholder = document.createComment(
    `for-each: ${itemName} of ${collectionName}`,
  );
  element.parentNode.insertBefore(placeholder, element);
  element.remove();

  return {
    collectionName,
    itemName,
    template,
    placeholder,
    renderedElements: [],
    previousLength: 0,
  };
}
```

### Transformación del DOM

```
ANTES del setup:
────────────────
<div id="parent">
  <div for-each="item of items">
    <span bind-value="item.name"></span>
  </div>
</div>


DURANTE el setup:
─────────────────
1. Clone template
   template = <div><span bind-value="item.name"></span></div>

2. Crear placeholder
   placeholder = <!-- for-each: item of items -->

3. Insertar placeholder
   <div id="parent">
     <!-- for-each: item of items -->
     <div for-each="item of items">...</div>
   </div>

4. Remover elemento original
   <div id="parent">
     <!-- for-each: item of items -->
   </div>


DESPUÉS del setup:
──────────────────
<div id="parent">
  <!-- for-each: item of items -->
</div>

Estado en binding:
  template: <div><span bind-value="item.name"></span></div>
  placeholder: <!-- for-each: item of items -->
  renderedElements: []
```

## Fase 3: Extended ViewModel (Scope Local)

### createExtendedViewModel

```typescript
function createExtendedViewModel<T extends object>(
  parentViewModel: ViewModel<T>,
  itemName: string,
  itemRef: { current: any },
): ViewModel {
  return new Proxy(
    {},
    {
      has(_target, prop) {
        if (prop === itemName) return true;
        if (typeof prop === "string" && prop.startsWith(itemName + ".")) {
          return true;
        }
        return prop in parentViewModel;
      },
      get(_target, prop) {
        if (prop === itemName) {
          return itemRef.current;
        }
        if (typeof prop === "string" && prop.startsWith(itemName + ".")) {
          const itemProp = prop.substring(itemName.length + 1);
          return getNestedProperty(itemRef.current, itemProp);
        }
        return parentViewModel[prop as string];
      },
      set(_target, prop, value) {
        if (prop === itemName) {
          itemRef.current = value;
          return true;
        }
        if (typeof prop === "string" && prop.startsWith(itemName + ".")) {
          return true;
        }
        (parentViewModel as Record<string, unknown>)[prop as string] = value;
        return true;
      },
    },
  ) as ViewModel;
}
```

### Propósito del Extended ViewModel

**Problema:** Los bindings dentro del template necesitan acceder tanto al item actual como al ViewModel parent.

```html
<div for-each="todo of todos">
  <span bind-value="todo.title"></span>      <!-- item scope -->
  <button click="deleteTodo">Delete</button>  <!-- parent scope -->
</div>
```

**Solución:** Un Proxy que combina ambos scopes.

### Diagrama de Scopes

```
┌─────────────────────────────────────────────────────────────┐
│                  EXTENDED VIEW MODEL                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  parentViewModel = {                                        │
│    todos: [...],                                            │
│    deleteTodo: function() { ... }                           │
│  }                                                           │
│                                                              │
│  itemRef = {                                                │
│    current: { id: 1, title: "Task 1", done: false }        │
│  }                                                           │
│                                                              │
│  extendedViewModel = Proxy {                                │
│    get(target, prop):                                       │
│      ├─ prop === "todo"           → itemRef.current         │
│      ├─ prop.startsWith("todo.")  → itemRef.current[...]    │
│      └─ else                      → parentViewModel[prop]   │
│  }                                                           │
│                                                              │
│  Accesos:                                                   │
│    extendedVM.todo           → { id: 1, title: "Task 1" }  │
│    extendedVM.todo.title     → "Task 1"                     │
│    extendedVM.deleteTodo     → function() { ... }           │
│    extendedVM.todos          → [...]                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Ejemplo de Resolución

```typescript
extendedViewModel["todo"]
    │
    └─► Proxy.get(target, "todo")
          │
          ├─► prop === itemName ("todo")? SÍ
          │
          └─► return itemRef.current
                └─► { id: 1, title: "Task 1", done: false }
```

```typescript
extendedViewModel["todo.title"]
    │
    └─► Proxy.get(target, "todo.title")
          │
          ├─► prop.startsWith("todo" + ".")? SÍ
          │
          ├─► itemProp = "title"
          │
          └─► getNestedProperty(itemRef.current, "title")
                └─► "Task 1"
```

```typescript
extendedViewModel["deleteTodo"]
    │
    └─► Proxy.get(target, "deleteTodo")
          │
          ├─► prop === "todo"? NO
          ├─► prop.startsWith("todo.")? NO
          │
          └─► return parentViewModel["deleteTodo"]
                └─► function() { ... }
```

### itemRef: Referencia Mutable

```typescript
const itemRef = { current: item };
```

**Por qué objeto con `current`:** Para permitir actualización sin perder la referencia.

```typescript
itemRef.current = newItem;
```

El extendedViewModel sigue apuntando al mismo `itemRef`, pero ahora retorna el nuevo item.

## Fase 4: Creación Dinámica de Elementos

### createNewElement

```typescript
function createNewElement<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
  item: any,
  index: number,
): void {
  const element = binding.template.cloneNode(true) as HTMLElement;

  const itemRef = { current: item };
  const extendedViewModel = createExtendedViewModel(
    viewModel,
    binding.itemName,
    itemRef,
  );

  const render = setupBindingsForElement(element, extendedViewModel);

  binding.renderedElements.push({
    element,
    viewModel: extendedViewModel,
    itemRef,
    render,
  });

  const lastElement =
    binding.renderedElements[binding.renderedElements.length - 2]
      ?.element || binding.placeholder;

  if (lastElement.parentNode) {
    lastElement.parentNode.insertBefore(element, lastElement.nextSibling);
    render();
  }
}
```

### Proceso Paso a Paso

```
createNewElement(binding, viewModel, item, index)
    │
    ├─► 1. CLONE TEMPLATE
    │      element = binding.template.cloneNode(true)
    │
    ├─► 2. CREATE ITEM REF
    │      itemRef = { current: item }
    │
    ├─► 3. CREATE EXTENDED VIEW MODEL
    │      extendedViewModel = Proxy(parent + item)
    │
    ├─► 4. SETUP BINDINGS FOR ELEMENT
    │      render = setupBindingsForElement(element, extendedVM)
    │        │
    │        ├─► Scan element for bindings
    │        ├─► Register bindings with extendedVM
    │        └─► Return render function
    │
    ├─► 5. STORE IN renderedElements
    │      binding.renderedElements.push({
    │        element,
    │        viewModel: extendedVM,
    │        itemRef,
    │        render
    │      })
    │
    ├─► 6. FIND INSERTION POINT
    │      lastElement = previous element or placeholder
    │
    ├─► 7. INSERT IN DOM
    │      lastElement.parentNode.insertBefore(element, lastElement.nextSibling)
    │
    └─► 8. INITIAL RENDER
           render()
```

### Ejemplo Visual

```
Estado inicial:
───────────────
<!-- for-each: todo of todos -->

todos = [
  { id: 1, title: "Task 1" },
  { id: 2, title: "Task 2" }
]


Crear elemento para todos[0]:
──────────────────────────────
1. Clone template
   <div><span bind-value="todo.title"></span></div>

2. itemRef = { current: { id: 1, title: "Task 1" } }

3. extendedViewModel = Proxy { todo → itemRef.current, ... }

4. setupBindingsForElement()
   └─► ValueBinding(<span>, "todo.title")

5. Insertar después de placeholder
   <!-- for-each: todo of todos -->
   <div><span>Task 1</span></div>

6. renderedElements[0] = { element, viewModel, itemRef, render }


Crear elemento para todos[1]:
──────────────────────────────
1-4. [Mismo proceso]

5. Insertar después de elemento anterior
   <!-- for-each: todo of todos -->
   <div><span>Task 1</span></div>
   <div><span>Task 2</span></div>

6. renderedElements[1] = { element, viewModel, itemRef, render }


Estado final:
─────────────
<!-- for-each: todo of todos -->
<div><span>Task 1</span></div>
<div><span>Task 2</span></div>

renderedElements = [
  { element: div1, viewModel: extVM1, itemRef: ref1, render: fn1 },
  { element: div2, viewModel: extVM2, itemRef: ref2, render: fn2 }
]
```

## Fase 5: Reconciliación de Elementos

### Algoritmo de Reconciliación

```
renderSingleForEachBinding(binding, viewModel)
    │
    ├─► 1. GET COLLECTION
    │      collection = viewModel[collectionName]
    │
    ├─► 2. GET LENGTHS
    │      currentLength = collection.length
    │      previousLength = binding.previousLength
    │
    ├─► 3. RECONCILE
    │      │
    │      ├─ currentLength > previousLength
    │      │    └─► addNewElements(previousLength → currentLength)
    │      │
    │      ├─ currentLength < previousLength
    │      │    └─► removeExtraElements(currentLength → previousLength)
    │      │
    │      └─ currentLength === previousLength
    │           └─► (no changes in length)
    │
    ├─► 4. UPDATE EXISTING
    │      updateExistingElements(all elements)
    │
    └─► 5. UPDATE previousLength
           binding.previousLength = currentLength
```

### Caso 1: Agregar Nuevos Elementos

```typescript
function addNewElements<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
  collection: any[],
  previousLength: number,
): void {
  for (let i = previousLength; i < collection.length; i++) {
    createNewElement(binding, viewModel, collection[i], i);
  }
}
```

**Ejemplo:**

```
Estado: previousLength = 2, currentLength = 4

Loop:
  i = 2: createNewElement(binding, vm, collection[2], 2)
  i = 3: createNewElement(binding, vm, collection[3], 3)

Resultado: 2 nuevos elementos creados e insertados
```

### Caso 2: Remover Elementos Extras

```typescript
function removeExtraElements(
  binding: ForEachBinding,
  currentLength: number,
): void {
  const toRemove = binding.renderedElements.splice(currentLength);
  for (const { element } of toRemove) {
    element.remove();
  }
}
```

**Ejemplo:**

```
Estado: previousLength = 4, currentLength = 2

splice(2):
  toRemove = [renderedElements[2], renderedElements[3]]
  binding.renderedElements = [renderedElements[0], renderedElements[1]]

Loop:
  element[2].remove()
  element[3].remove()

Resultado: 2 elementos removidos del DOM y del array
```

### Caso 3: Actualizar Elementos Existentes

```typescript
function updateExistingElements(
  binding: ForEachBinding,
  collection: any[],
): void {
  for (let i = 0; i < binding.renderedElements.length; i++) {
    const item = collection[i];
    const rendered = binding.renderedElements[i];

    rendered.itemRef.current = item;
    rendered.render();
  }
}
```

**Ejemplo:**

```
collection = [
  { id: 1, title: "Updated Task 1" },  // Changed
  { id: 2, title: "Task 2" }           // Same
]

Loop:
  i = 0:
    itemRef.current = { id: 1, title: "Updated Task 1" }
    render()  → <span> actualiza a "Updated Task 1"
  
  i = 1:
    itemRef.current = { id: 2, title: "Task 2" }
    render()  → Sin cambios visibles
```

### Escenario Completo de Reconciliación

```
Estado inicial:
───────────────
todos = [
  { id: 1, title: "Task 1" },
  { id: 2, title: "Task 2" },
  { id: 3, title: "Task 3" }
]

renderedElements.length = 3
previousLength = 3

DOM:
  <!-- for-each: todo of todos -->
  <div>Task 1</div>
  <div>Task 2</div>
  <div>Task 3</div>


Cambio: todos.splice(1, 1, { id: 4, title: "Task 4" }, { id: 5, title: "Task 5" })
───────────────────────────────────────────────────────────────────────────────────
Resultado: todos = [
  { id: 1, title: "Task 1" },
  { id: 4, title: "Task 4" },  // Nuevo
  { id: 5, title: "Task 5" },  // Nuevo
  { id: 3, title: "Task 3" }
]

onChange("todos")
render("todos")
renderForEachBindings()
  │
  ├─► currentLength = 4
  ├─► previousLength = 3
  │
  ├─► currentLength > previousLength → addNewElements()
  │     └─► createNewElement(collection[3], 3)
  │           └─► Inserta <div>Task 3</div> (nuevo)
  │
  └─► updateExistingElements()
        ├─ i=0: itemRef.current = { id: 1, title: "Task 1" }
        │       render() → <div>Task 1</div> (sin cambios)
        │
        ├─ i=1: itemRef.current = { id: 4, title: "Task 4" }
        │       render() → <div>Task 1</div> ACTUALIZA a <div>Task 4</div>
        │
        ├─ i=2: itemRef.current = { id: 5, title: "Task 5" }
        │       render() → <div>Task 3</div> ACTUALIZA a <div>Task 5</div>
        │
        └─ i=3: itemRef.current = { id: 3, title: "Task 3" }
                render() → <div>Task 3</div> (elemento nuevo ya renderizado)

DOM final:
  <!-- for-each: todo of todos -->
  <div>Task 1</div>
  <div>Task 4</div>
  <div>Task 5</div>
  <div>Task 3</div>
```

**Nota:** PelelaJS **no** usa keyed rendering como React. Reutiliza elementos por posición, no por identidad.

## Fase 6: Bindings Anidados dentro de for-each

### setupBindingsForElement

```typescript
function setupBindingsForElement<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): () => void {
  const wrapper = document.createElement("div");
  const clonedForSearch = element.cloneNode(true) as HTMLElement;
  wrapper.appendChild(clonedForSearch);

  const tempBindings = {
    valueBindings: setupValueBindings(wrapper, viewModel),
    ifBindings: setupIfBindings(wrapper, viewModel),
    classBindings: setupClassBindings(wrapper, viewModel),
    styleBindings: setupStyleBindings(wrapper, viewModel),
  };

  setupClickBindings(wrapper, viewModel);

  const bindings = {
    valueBindings: tempBindings.valueBindings.map((b) =>
      mapBindingToRealElement(b, clonedForSearch, element),
    ),
    ifBindings: tempBindings.ifBindings.map((b) =>
      mapBindingToRealElement(b, clonedForSearch, element),
    ),
    classBindings: tempBindings.classBindings.map((b) =>
      mapBindingToRealElement(b, clonedForSearch, element),
    ),
    styleBindings: tempBindings.styleBindings.map((b) =>
      mapBindingToRealElement(b, clonedForSearch, element),
    ),
  };

  const render = () => {
    renderValueBindings(bindings.valueBindings, viewModel);
    renderIfBindings(bindings.ifBindings, viewModel);
    renderClassBindings(bindings.classBindings, viewModel);
    renderStyleBindings(bindings.styleBindings, viewModel);
  };

  return render;
}
```

### Propósito del Wrapper

**Problema:** Necesitamos escanear el elemento clonado para encontrar bindings, pero luego aplicarlos al elemento real.

**Solución:** 
1. Clonar elemento
2. Buscar bindings en el clon
3. Mapear bindings al elemento real

### Proceso Detallado

```
setupBindingsForElement(element, extendedViewModel)
    │
    ├─► 1. CREATE WRAPPER
    │      wrapper = <div></div>
    │
    ├─► 2. CLONE ELEMENT
    │      clonedForSearch = element.cloneNode(true)
    │
    ├─► 3. APPEND TO WRAPPER
    │      wrapper.appendChild(clonedForSearch)
    │      → wrapper: <div><cloned element></div>
    │
    ├─► 4. SETUP BINDINGS ON CLONE
    │      tempBindings = {
    │        valueBindings: [
    │          { element: <span in clone>, propertyName: "todo.title" }
    │        ],
    │        ...
    │      }
    │
    ├─► 5. MAP TO REAL ELEMENT
    │      bindings = {
    │        valueBindings: [
    │          { element: <span in real>, propertyName: "todo.title" }
    │        ],
    │        ...
    │      }
    │
    ├─► 6. CREATE RENDER FUNCTION
    │      render = () => { renderValueBindings(...), ... }
    │
    └─► 7. RETURN RENDER
```

## Fase 7: Mapeo de Elementos (mapElementPath)

### mapBindingToRealElement

```typescript
function mapBindingToRealElement<T extends { element: HTMLElement }>(
  binding: T,
  clonedRoot: HTMLElement,
  realRoot: HTMLElement,
): T {
  return {
    ...binding,
    element: mapElementPath(binding.element, clonedRoot, realRoot),
  };
}
```

### mapElementPath

```typescript
function mapElementPath(
  sourceElement: HTMLElement,
  sourceRoot: HTMLElement,
  targetRoot: HTMLElement,
): HTMLElement {
  if (sourceElement === sourceRoot) {
    return targetRoot;
  }

  const path: number[] = [];
  let current: HTMLElement | null = sourceElement;

  while (current && current !== sourceRoot) {
    const parent = current.parentElement;
    if (!parent) break;
    path.unshift(Array.from(parent.children).indexOf(current));
    current = parent as HTMLElement;
  }

  let target: HTMLElement = targetRoot;
  for (const index of path) {
    const children = target.children;
    if (index >= children.length) break;
    target = children[index] as HTMLElement;
    if (!target) break;
  }

  return target;
}
```

### Algoritmo de Mapeo

```
mapElementPath(sourceElement, sourceRoot, targetRoot)
    │
    ├─► 1. CHECK IF ROOT
    │      if (sourceElement === sourceRoot)
    │        return targetRoot
    │
    ├─► 2. BUILD PATH
    │      Desde sourceElement hasta sourceRoot,
    │      guardar índice de cada nivel
    │      path = [2, 0, 1]  // Por ejemplo
    │
    └─► 3. FOLLOW PATH IN TARGET
           Desde targetRoot, seguir el mismo path
           target = targetRoot.children[2].children[0].children[1]
```

### Ejemplo Visual

```
sourceRoot (clonedElement):
  <div>                           ← sourceRoot (índice en parent: irrelevante)
    <header>...</header>          ← índice 0
    <main>                        ← índice 1
      <ul>                        ← índice 0
        <li>                      ← índice 0
          <span></span>           ← sourceElement, índice 0
        </li>
      </ul>
    </main>
  </div>

Path construction:
  sourceElement = <span>
  parent = <li>, index of <span> in <li> = 0
  parent = <ul>, index of <li> in <ul> = 0
  parent = <main>, index of <ul> in <main> = 0
  parent = <div>, index of <main> in <div> = 1
  parent = null (llegamos a sourceRoot)

path = [1, 0, 0, 0]


targetRoot (realElement):
  <div>                           ← targetRoot
    <header>...</header>          ← children[0]
    <main>                        ← children[1]
      <ul>                        ← children[0]
        <li>                      ← children[0]
          <span></span>           ← children[0] = targetElement
        </li>
      </ul>
    </main>
  </div>

Follow path:
  target = targetRoot
  target = target.children[1]     → <main>
  target = target.children[0]     → <ul>
  target = target.children[0]     → <li>
  target = target.children[0]     → <span>

return <span> (elemento correcto en el real DOM)
```

## Ejemplos Completos

### Ejemplo 1: Todo List

```typescript
class TodoListViewModel {
  todos = [
    { id: 1, title: "Learn PelelaJS", done: false },
    { id: 2, title: "Build app", done: false },
    { id: 3, title: "Deploy", done: false }
  ];
  
  newTodo = "";
  
  addTodo() {
    if (this.newTodo.trim()) {
      this.todos.push({
        id: Date.now(),
        title: this.newTodo,
        done: false
      });
      this.newTodo = "";
    }
  }
  
  toggleTodo(id: number) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.done = !todo.done;
    }
  }
  
  deleteTodo(id: number) {
    const index = this.todos.findIndex(t => t.id === id);
    if (index !== -1) {
      this.todos.splice(index, 1);
    }
  }
}
```

```html
<pelela view-model="TodoListViewModel">
  <div>
    <input bind-value="newTodo" placeholder="New todo...">
    <button click="addTodo">Add</button>
  </div>
  
  <ul>
    <li for-each="todo of todos">
      <input type="checkbox" bind-value="todo.done">
      <span bind-value="todo.title" bind-class="{ done: todo.done }"></span>
      <button click="deleteTodo">Delete</button>
    </li>
  </ul>
</pelela>
```

**Problema:** `click="deleteTodo"` no puede pasar `todo.id` como parámetro.

**Solución:** Usar índice o guardar referencia:

```typescript
deleteTodoAtIndex(index: number) {
  this.todos.splice(index, 1);
}
```

### Ejemplo 2: Table Rendering

```typescript
class TableViewModel {
  users = [
    { id: 1, name: "Alice", email: "alice@example.com", role: "Admin" },
    { id: 2, name: "Bob", email: "bob@example.com", role: "User" },
    { id: 3, name: "Charlie", email: "charlie@example.com", role: "User" }
  ];
  
  sortBy = "name";
  
  get sortedUsers() {
    return [...this.users].sort((a, b) => 
      a[this.sortBy].localeCompare(b[this.sortBy])
    );
  }
}
```

```html
<pelela view-model="TableViewModel">
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
      </tr>
    </thead>
    <tbody>
      <tr for-each="user of sortedUsers">
        <td bind-value="user.name"></td>
        <td bind-value="user.email"></td>
        <td bind-value="user.role"></td>
      </tr>
    </tbody>
  </table>
</pelela>
```

### Ejemplo 3: Nested for-each

```typescript
class NestedViewModel {
  categories = [
    {
      name: "Fruits",
      items: ["Apple", "Banana", "Orange"]
    },
    {
      name: "Vegetables",
      items: ["Carrot", "Lettuce", "Tomato"]
    }
  ];
}
```

```html
<pelela view-model="NestedViewModel">
  <div for-each="category of categories">
    <h3 bind-value="category.name"></h3>
    <ul>
      <li for-each="item of category.items">
        <span bind-value="item"></span>
      </li>
    </ul>
  </div>
</pelela>
```

**Problema:** El inner for-each necesita acceder a `category.items`.

**Solución:** El extended ViewModel del outer for-each se pasa al inner:

```
Outer extendedVM: { category → {...}, ...parent }
  └─► Inner extendedVM: { item → "Apple", category → {...}, ...parent }
```

Funciona porque el extendedVM hereda del parent, que ya tiene `category`.

## Testing

```typescript
describe("for-each binding", () => {
  it("should render items", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <div for-each="item of items">
        <span bind-value="item"></span>
      </div>
    `;
    
    const vm = createReactiveViewModel({
      items: ["A", "B", "C"]
    }, () => {});
    
    const bindings = setupForEachBindings(root, vm);
    expect(bindings.length).toBe(1);
    
    renderForEachBindings(bindings, vm);
    
    const spans = root.querySelectorAll("span");
    expect(spans.length).toBe(3);
    expect(spans[0].textContent).toBe("A");
    expect(spans[1].textContent).toBe("B");
    expect(spans[2].textContent).toBe("C");
  });

  it("should add new items", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div for-each="item of items"><span bind-value="item"></span></div>';
    
    const vm = createReactiveViewModel({ items: ["A"] }, () => {});
    const bindings = setupForEachBindings(root, vm);
    renderForEachBindings(bindings, vm);
    
    vm.items.push("B");
    renderForEachBindings(bindings, vm);
    
    const spans = root.querySelectorAll("span");
    expect(spans.length).toBe(2);
    expect(spans[1].textContent).toBe("B");
  });

  it("should remove items", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div for-each="item of items"><span bind-value="item"></span></div>';
    
    const vm = createReactiveViewModel({ items: ["A", "B", "C"] }, () => {});
    const bindings = setupForEachBindings(root, vm);
    renderForEachBindings(bindings, vm);
    
    vm.items.splice(1, 1);
    renderForEachBindings(bindings, vm);
    
    const spans = root.querySelectorAll("span");
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe("A");
    expect(spans[1].textContent).toBe("C");
  });

  it("should update existing items", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div for-each="item of items"><span bind-value="item.name"></span></div>';
    
    const vm = createReactiveViewModel({
      items: [{ name: "A" }, { name: "B" }]
    }, () => {});
    
    const bindings = setupForEachBindings(root, vm);
    renderForEachBindings(bindings, vm);
    
    vm.items[0].name = "Updated A";
    renderForEachBindings(bindings, vm);
    
    const spans = root.querySelectorAll("span");
    expect(spans[0].textContent).toBe("Updated A");
  });
});
```

## Limitaciones

### 1. No Keyed Rendering

PelelaJS reutiliza elementos por posición, no por key:

```typescript
items = [
  { id: 1, name: "A" },
  { id: 2, name: "B" },
  { id: 3, name: "C" }
]

Cambio: items.splice(0, 1)  // Remover primer elemento

Result:
  Element[0] actualiza de A → B
  Element[1] actualiza de B → C
  Element[2] se remueve
```

React con keys:
```
Element[0] se remueve
Element[1] (B) permanece igual
Element[2] (C) permanece igual
```

**Implicación:** Performance subóptima para listas grandes con cambios frecuentes.

### 2. No Puede Pasar Parámetros a Handlers

```html
<button click="delete(todo.id)">Delete</button>
```

No funciona.

**Workaround:** Guardar id en data attribute o crear métodos específicos.

### 3. No Soporta Expresiones Complejas

```html
<!-- NO funciona -->
<div for-each="user of users.filter(u => u.active)">
```

**Solución:** Usar computed property:

```typescript
get activeUsers() {
  return this.users.filter(u => u.active);
}
```

### 4. Performance en Listas Muy Grandes

Para listas de >1000 items, el initial render puede ser lento.

**Solución:** Virtual scrolling (no implementado en PelelaJS).

## Conclusión

`for-each` es el binding más complejo de PelelaJS pero también el más poderoso, permitiendo:

1. **Renderizado de listas** con sintaxis declarativa
2. **Scope local** para cada item vía extended ViewModel
3. **Reconciliación automática** al agregar/remover items
4. **Bindings anidados** con mapeo correcto de elementos
5. **Updates eficientes** solo re-renderizando items afectados

Es la piedra angular para construir listas dinámicas en PelelaJS.

## Referencias

- [Sistema de Binding General](./01-binding-system.md)
- [Dependency Tracker](./02-dependency-tracker.md)
- [bind-value](./03-bind-value.md)
- [Propiedades Anidadas](../05-nested-properties/01-nested-properties.md)
- [ReactiveProxy](../03-reactivity/01-reactive-proxy.md)

