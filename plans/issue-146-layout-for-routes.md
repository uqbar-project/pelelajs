Acá paso en limpio una propuesta @Juancete @nicovillamonte @nicovio @mosjim , a ver qué les parece:

# Router Layout

## RouteDefinition

```typescript
type RouteDefinition = {
  path: string
  component?: ViewModelConstructor  // required for leaf routes
  layout?: ViewModelConstructor     // wraps children when present
  children?: RouteDefinition[]      // nested routes that inherit the layout
}
```

- Si una ruta tiene `layout` + `children`, el layout wrappea a los hijos. El layout NO puede tener `component`.
- Si una ruta tiene `layout` + `component` (sin children), error de validación.
- Si una ruta tiene `children`, debe tener `layout` (no existe layout anidado).
- Las rutas hijas son relativas al path del padre.

### Ejemplo de uso

```typescript
export const routes: RouteDefinition[] = [
  {
    path: '',
    layout: MainLayout,
    children: [
      { path: '', component: Home },
      { path: 'detail/:id', component: Detail },
    ],
  },
  { path: 'login', component: Login },
]
```

Resolución de paths:
| Parent | Child | Full path |
|--------|-------|-----------|
| `''` | `''` | `'/'` |
| `''` | `'detail/:id'` | `'/detail/:id'` |
| `'admin'` | `'settings'` | `'/admin/settings'` |

### Ruta sin layout

`{ path: 'login', component: Login }` — se renderiza standalone, sin wrapper.

---

## Aplanamiento de rutas (interno)

Se agrega `flattenRoutes()` en `routeMatcher.ts`. Convierte el árbol en lista plana para que el matching existente (first-match-wins) no se modifique.

```typescript
type FlattenedRoute = {
  path: string
  component: ViewModelConstructor
  layout?: ViewModelConstructor
}
```

### Algoritmo de flattening

```typescript
function joinPaths(parent: string, child: string): string {
  const combined = parent.endsWith('/') || parent === ''
    ? parent + child
    : parent + '/' + child
  return combined.replace(/\/+/g, '/') || '/'
}

function flattenRoutes(
  routes: RouteDefinition[],
  parentPath: string = '',
  parentLayout?: ViewModelConstructor,
): FlattenedRoute[] {
  return routes.flatMap(route => {
    const fullPath = joinPaths(parentPath, route.path)
    const layout = route.layout ?? parentLayout

    if (route.children) {
      if (route.component) {
        throw new Error('Route with children cannot have component')
      }
      if (route.layout && parentLayout) {
        throw new Error('Nested layouts are not supported')
      }
      return flattenRoutes(route.children, fullPath, layout)
    }

    return [{ path: fullPath, component: route.component!, layout }]
  })
}
```

### Matching

El `matchRoute()` existente se mantiene igual, pero ahora opera sobre `FlattenedRoute[]`. El `MatchedRoute` extiende:

```typescript
type MatchedRoute = {
  route: FlattenedRoute
  urlParameters: Record<string, string>
  searchParameters: Record<string, string>
}
```

---

## Renderizado con layout (`router.ts`)

### Algoritmo de `renderPath()`

```typescript
function renderPath(pathname: string, search: string, nextPath?: string): void {
  try {
    const match = matchRoute(pathname, search, flatRoutes)
    const pageEntry = getComponentEntry(match.route.component)
    if (!pageEntry) throw new RoutingError(...)

    const oldRouteCss = new Set(currentRouteCss)
    currentRouteCss.clear()
    currentMatch = match

    if (match.route.layout) {
      const layoutEntry = getComponentEntry(match.route.layout)
      if (!layoutEntry) throw new RoutingError(...)

      const combinedHtml = combineLayoutAndPage(
        layoutEntry.template,
        pageEntry.template,
      )
      mountTemplate(container!, combinedHtml)
    } else {
      mountTemplate(container!, pageEntry.template)
    }

    // CSS cleanup
    for (const cssUrl of oldRouteCss) removeStylesheetLinks(cssUrl)

    // CSS loading: layout CSS + page CSS + child components (both)
    if (match.route.layout) {
      const layoutEntry = getComponentEntry(match.route.layout)!
      loadRouteCss(layoutEntry)
    }
    loadRouteCss(pageEntry)

    if (nextPath) history.pushState(null, '', nextPath)
  } catch (error) {
    resetRouterActive()
    handleError(error)
  }
}
```

### `combineLayoutAndPage()`

```typescript
function combineLayoutAndPage(layoutTemplate: string, pageTemplate: string): string {
  // Soporta: <outlet></outlet> y <outlet/>
  // También soporta <outlet con atributos: <outlet prop-user="x" const-title="'hola'">
  // Los atributos se extraen y se transfieren al <pelela view-model="..."> de la page
  
  const outletRegex = /<outlet\b([^>]*)\/?>/i
  const match = layoutTemplate.match(outletRegex)
  if (!match) throw new Error('Layout template must contain <outlet>')

  const outletAttributes = match[1].trim()
  let pageWithProps = pageTemplate
  
  if (outletAttributes) {
    // Transfiere los atributos al <pelela view-model="..."> de la page
    pageWithProps = pageTemplate.replace(
      /^(<\s*pelela\b)/i,
      `$1 ${outletAttributes}`,
    )
  }

  return layoutTemplate.replace(outletRegex, pageWithProps)
}
```

### `loadRouteCss()`

```typescript
function loadRouteCss(entry: ComponentEntry): void {
  const cssUrls = entry.cssUrls ?? []
  const childCssUrls = collectChildComponentCssUrls(entry.template)
  const allCssUrls = [...cssUrls, ...childCssUrls]
  for (const cssUrl of allCssUrls) {
    currentRouteCss.add(cssUrl)
    const existingLink = findExistingStylesheetLink(cssUrl)
    if (!existingLink) {
      document.head.appendChild(createStylesheetLink(cssUrl))
    }
  }
}
```

---

## `<outlet>` como tag reconocido

### `dom.ts`

Agregar `'outlet'` a `STANDARD_HTML_TAGS`:

```typescript
export const STANDARD_HTML_TAGS = [
  // ...existing tags...
  'header', 'footer', 'main', 'outlet',  // <-- outlet agregado
]
```

Esto evita que:
- El validador de `mountTemplate` lo trate como componente desconocido
- `setupComponentBindings` intente validarlo como tag registrado

---

## Props en `<outlet>`: pasar datos del layout a la página

### Sintaxis

```html
<pelela view-model="MainLayout">
  <header>
    <span>Usuario: <strong bind-content="session.user?.name"></strong></span>
  </header>
  <main>
    <outlet prop-user="session.user" const-title="'Home Page'"></outlet>
  </main>
  <footer>© 2026</footer>
</pelela>
```

### Funcionamiento

1. `combineLayoutAndPage()` extrae los atributos `prop-*`, `const-*`, `link-*` del `<outlet>`.
2. Los transfiere al `<pelela view-model="Home">` de la page.
3. Después de `bootstrap()`, el router procesa estos atributos:
   - Busca el `<pelela>` de la page dentro del layout
   - Resuelve `prop-*` contra el ViewModel del layout (padre)
   - Resuelve `const-*` como valores literales
   - Configura `link-*` para sincronización bidireccional

### Implementación (post-bootstrap)

```typescript
function setupOutletBindings(container: HTMLElement): void {
  const layoutEl = container.querySelector('pelela[view-model]')
  if (!layoutEl) return

  const pageEl = layoutEl.querySelector('pelela[view-model]')
  if (!pageEl) return

  const layoutVM = (layoutEl as any).__pelelaViewModel
  const pageVM = (pageEl as any).__pelelaViewModel
  if (!layoutVM || !pageVM) return

  for (const attr of pageEl.attributes) {
    const name = attr.name
    const value = attr.value

    if (name.startsWith('prop-')) {
      const childKey = toCamelCase(name.slice('prop-'.length))
      const parentValue = resolvePath(layoutVM, value)
      pageVM[childKey] = parentValue
    } else if (name.startsWith('const-')) {
      const childKey = toCamelCase(name.slice('const-'.length))
      pageVM[childKey] = isNumberConstant(value) ? Number(value) : value
    } else if (name.startsWith('link-')) {
      const childKey = toCamelCase(name.slice('link-'.length))
      const parentValue = resolvePath(layoutVM, value)
      pageVM[childKey] = parentValue
    }
  }
}
```

---

## CSS lifecycle

### Al navegar

1. Se guarda `oldRouteCss` (Set con URLs de la ruta anterior)
2. Se limpia `currentRouteCss`
3. Se renderiza el layout + page via `mountTemplate()`
4. Se remueven todos los `<link>` de CSS de `oldRouteCss`
5. Se cargan CSS de:
   - Layout component (MainLayout)
   - Page component (Home / Detail)
   - Child components recursivos de ambos

Esto asegura que header y footer (que están en el layout) también recarguen su CSS en cada navegación.

---

## Validaciones

### `validateRoutesHaveTemplates()`

- Layout debe estar registrado vía `defineComponent()`
- Page debe estar registrada vía `defineComponent()`
- Ruta con `children` no puede tener `component`
- Ruta con `layout` debe tener `children` (o error)
- No se permite más de un nivel de layout (sin anidamiento)

---

## VS Code Plugin

### Archivos a modificar

1. **`html-custom-data.json`**: Agregar `outlet` como tag HTML personalizado con atributos `prop-*`, `const-*`, `link-*`.
2. **`snippets/pelela.json`**: Agregar snippet para `<outlet>`.
3. **`src/utils/htmlUtils.ts` → `getPelelaAttributes()`**: Agregar `<outlet>` como tag que soporta `prop-*`, `const-*`, `link-*`.

### Detalle

```jsonc
// html-custom-data.json
{
  "version": 1.1,
  "tags": [
    {
      "name": "outlet",
      "description": "Placeholder for child route content in a layout",
      "attributes": [
        { "name": "prop-{name}", "description": "One-way binding from layout to page" },
        { "name": "const-{name}", "description": "Constant value passed to page" },
        { "name": "link-{name}", "description": "Two-way binding between layout and page" }
      ]
    }
  ]
}
```

---

## Archivos a modificar (resumen)

| Archivo | Cambio |
|---|---|
| `packages/core/src/router/types.ts` | Extender `RouteDefinition` con `layout?`, `children?` |
| `packages/core/src/router/routeMatcher.ts` | Agregar `flattenRoutes()`, `joinPaths()`, adaptar `matchRoute()` |
| `packages/core/src/router/router.ts` | Renderizado con layout, `<outlet>` reemplazo, CSS lifecycle, `setupOutletBindings()` |
| `packages/core/src/commons/dom.ts` | Agregar `'outlet'` a `STANDARD_HTML_TAGS` |
| `packages/core/src/router/index.ts` | Exportar nuevos tipos si cambia la API pública |
| `packages/core/src/router/router.test.ts` | Tests: layout rendering, prop forwarding, CSS, rutas sin layout |
| `tools/pelela-vscode/...` | Snippets, autocomplete, IntelliSense para `<outlet>` |

---

## Próximos pasos / no incluido en V1

- Layouts anidados (layout dentro de layout)
- Layout persistente (solo re-render del `<outlet>` sin recargar header+footer)
- Reactividad automática del service global (sin navigation)
- Múltiples `<outlet>` en un mismo layout (named outlets)

---

## Plan de ejecución TDD

### Paso 1: Tipos (`types.ts`)
Extender `RouteDefinition` con `layout?` y `children?`, crear `FlattenedRoute`, actualizar `MatchedRoute`.
- *No tiene test propio, es infraestructura.*

### Paso 2: `<outlet>` en STANDARD_HTML_TAGS (`dom.ts`)
Agregar `'outlet'` a `STANDARD_HTML_TAGS`.

### Paso 3: TDD — `flattenRoutes()` y `joinPaths()`
1. Escribir test en `routeMatcher.test.ts`: joinPaths, flatten básico, anidado, error si component + children, error si nested layout
2. Implementar en `routeMatcher.ts`

### Paso 4: TDD — Renderizado con layout en router
1. Escribir tests en `router.test.ts`: layout envuelve a page, ruta sin layout se renderiza standalone, `combineLayoutAndPage()` reemplaza `<outlet>`
2. Implementar en `router.ts`

### Paso 5: TDD — Validaciones de rutas
1. Escribir tests: layout sin children da error, layout + component sin children da error, children sin layout da error
2. Implementar `validateRoutesHaveTemplates()` actualizado

### Paso 6: TDD — CSS lifecycle con layout
1. Escribir tests: layout carga su CSS, layout + page cargan ambos CSS, se limpia CSS al navegar
2. Implementar `loadRouteCss()` actualizado

### Paso 7: TDD — Prop forwarding `<outlet>` (post-bootstrap)
1. Escribir tests: `setupOutletBindings()` transfiere `prop-*`, `const-*`, `link-*` al page VM
2. Implementar

### Paso 8: VS Code Plugin
- `html-custom-data.json`: agregar tag `outlet`
- `snippets/pelela.json`: agregar snippet `<outlet>`
- `htmlUtils.ts`: agregar `outlet` a `getHtmlElements()`, agregar attrs en `getPelelaAttributesForTag()`

### Paso 9: Ejemplo `examples/advanced-routing/`
Crear ejemplo didáctico que demuestre layout con rutas anidadas.

**Estructura** (todas las convenciones de los ejemplos existentes: `main.ts`, `routes.ts`, `vite.config.ts`, etc.):
```
examples/advanced-routing/
├── index.html
├── main.ts
├── routes.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── pelela-env.d.ts
├── .npmrc
├── styles.css
└── src/
    ├── MainLayout.ts
    ├── MainLayout.pelela
    ├── MainLayout.css
    ├── BookList.ts
    ├── BookList.pelela
    ├── BookDetail.ts
    ├── BookDetail.pelela
    ├── NotFoundPage.ts
    ├── NotFoundPage.pelela
    └── books.ts
```

**Rutas:**
```ts
export const routes: RouteDefinition[] = [
  {
    path: '',
    layout: MainLayout,
    children: [
      { path: '', component: BookList },
      { path: 'detail/:id', component: BookDetail },
    ],
  },
  { path: '*', component: NotFoundPage },
]
```

**Componentes:**

- `MainLayout` — header con breadcrumb (`"Inicio"` o `"Inicio > Detalle del libro"` según `window.location.pathname`), `<outlet></outlet>` para el contenido, footer con copyright.
- `BookList` — muestra lista de libros con `for-each`, cada uno con botón que llama `router.navigateTo('/detail/' + libro.id)`.
- `BookDetail` — usa `router.urlParameters().id` en el constructor para buscar el libro en datos compartidos (`books.ts`) y mostrar nombre, autor, año.
- `NotFoundPage` — sin layout, muestra mensaje de página no encontrada.

No incluye prop/const/link en `<outlet>` para mantener el ejemplo simple y didáctico (se cubre en tests).
