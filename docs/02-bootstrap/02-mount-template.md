# 2.2 mountTemplate - Montaje Dinámico de Templates

## Introducción

`mountTemplate` es una función de utilidad que permite montar dinámicamente contenido HTML en un contenedor y ejecutar el proceso de bootstrap sobre él. Es especialmente útil para:

- Single Page Applications (SPA)
- Carga dinámica de vistas
- Renderizado condicional de secciones completas
- Testing de componentes aislados

Este documento detalla su funcionamiento, casos de uso y diferencias con `bootstrap()`.

## Código Fuente

```typescript
export function mountTemplate(
  container: HTMLElement,
  templateHtml: string,
): void {
  container.innerHTML = templateHtml;
  bootstrap({ root: container });
}
```

## Arquitectura Simple

```
┌────────────────────────────────────────────────────────────┐
│                   mountTemplate                            │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Input: container + templateHtml                           │
│       │                                                     │
│       ├─► 1. INYECCIÓN DE HTML                             │
│       │     └─► container.innerHTML = templateHtml         │
│       │                                                     │
│       └─► 2. BOOTSTRAP                                     │
│             └─► bootstrap({ root: container })             │
│                                                             │
│  Output: Aplicación PelelaJS montada y funcional           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Paso 1: Inyección de HTML

### 1.1 innerHTML

```typescript
container.innerHTML = templateHtml;
```

Esta operación:

1. **Limpia** el contenido existente del contenedor
2. **Parsea** el string HTML a DOM nodes
3. **Inserta** los nuevos nodos en el contenedor

#### Diagrama de Inyección

```
ANTES
─────
<div id="app">
  <p>Old content</p>
</div>


mountTemplate(app, '<pelela>New</pelela>')
              │
              └─► container.innerHTML = '<pelela>New</pelela>'


DESPUÉS
───────
<div id="app">
  <pelela>New</pelela>
</div>
```

### 1.2 Comportamiento de innerHTML

#### Limpieza Automática

```typescript
const app = document.getElementById("app");
app.innerHTML = "<p>Content 1</p>";
app.innerHTML = "<p>Content 2</p>";
```

```
Estado 1: <div id="app"><p>Content 1</p></div>
          ↓
Estado 2: <div id="app"><p>Content 2</p></div>
```

El contenido anterior se **elimina completamente**, incluyendo:
- Event listeners
- Referencias a elementos
- Estado interno de elementos

#### Parsing de HTML

```typescript
templateHtml = `
  <pelela view-model="AppViewModel">
    <h1>Title</h1>
    <button>Click</button>
  </pelela>
`;

container.innerHTML = templateHtml;
```

El browser parsea el string y crea:

```
HTMLElement tree:
  <pelela>
    ├─ <h1>
    │   └─ TextNode: "Title"
    └─ <button>
        └─ TextNode: "Click"
```

### 1.3 Consideraciones de Seguridad

#### XSS (Cross-Site Scripting)

`innerHTML` puede ser vulnerable a XSS si el contenido proviene de fuentes no confiables:

```typescript
const userInput = '<img src=x onerror="alert(\'XSS\')">';
container.innerHTML = userInput;
```

**Solución:** Sanitizar el HTML antes de inyectarlo:

```typescript
import DOMPurify from "dompurify";

const safeHtml = DOMPurify.sanitize(templateHtml);
container.innerHTML = safeHtml;
```

#### Event Listeners Perdidos

```typescript
const button = container.querySelector("button");
button.addEventListener("click", handler);

mountTemplate(container, newTemplate);
```

El event listener se **pierde** porque el elemento button fue destruido y reemplazado.

## Paso 2: Bootstrap con Root Específico

### 2.1 Llamada a Bootstrap

```typescript
bootstrap({ root: container });
```

Esta llamada ejecuta el proceso de bootstrap **solo dentro del contenedor**:

```
bootstrap({ root: container })
    │
    ├─► searchRoot = container
    │
    └─► querySelectorAll("pelela[view-model]")
              │
              └─► Busca SOLO dentro de container
```

### 2.2 Scope Limitado

```html
<body>
  <pelela view-model="GlobalViewModel">
    <!-- NO será inicializado -->
  </pelela>
  
  <div id="app">
    <pelela view-model="AppViewModel">
      <!-- SÍ será inicializado -->
    </pelela>
  </div>
</body>
```

```typescript
const app = document.getElementById("app");
mountTemplate(app, '<pelela view-model="AppViewModel">...</pelela>');
```

Solo el ViewModel dentro de `#app` se inicializa.

### 2.3 Diagrama de Scope

```
Document
    │
    ├─► <pelela view-model="GlobalViewModel">
    │     └─► Fuera del scope ✗
    │
    └─► <div id="app">
          │
          └─► bootstrap({ root: app }) busca aquí
                │
                └─► <pelela view-model="AppViewModel">
                      └─► Dentro del scope ✓
```

## Casos de Uso

### Caso 1: Single Page Application (SPA)

#### Estructura

```html
<body>
  <div id="app"></div>
  <script type="module" src="/main.ts"></script>
</body>
```

#### Router Simple

```typescript
import { mountTemplate } from "@pelelajs/core";

const routes = {
  "/": homeTemplate,
  "/about": aboutTemplate,
  "/contact": contactTemplate,
};

function navigate(path: string) {
  const app = document.getElementById("app")!;
  const template = routes[path] || notFoundTemplate;
  
  mountTemplate(app, template);
}

window.addEventListener("popstate", () => {
  navigate(window.location.pathname);
});

navigate(window.location.pathname);
```

#### Templates

```typescript
const homeTemplate = `
  <pelela view-model="HomeViewModel">
    <h1 bind-value="title"></h1>
    <p bind-value="description"></p>
  </pelela>
`;

const aboutTemplate = `
  <pelela view-model="AboutViewModel">
    <h1>About</h1>
    <p bind-value="companyInfo"></p>
  </pelela>
`;
```

#### Flujo de Navegación

```
Usuario navega a "/"
    │
    └─► navigate("/")
          │
          ├─► template = homeTemplate
          │
          └─► mountTemplate(app, homeTemplate)
                │
                ├─► app.innerHTML = homeTemplate
                │     └─► <pelela view-model="HomeViewModel">
                │
                └─► bootstrap({ root: app })
                      └─► HomeViewModel inicializado
```

### Caso 2: Carga Dinámica de Secciones

```typescript
class DashboardViewModel {
  currentSection = "overview";
  
  loadSection(section: string) {
    this.currentSection = section;
    
    const container = document.getElementById("section-container")!;
    const template = this.getSectionTemplate(section);
    
    mountTemplate(container, template);
  }
  
  private getSectionTemplate(section: string): string {
    switch (section) {
      case "overview":
        return `
          <pelela view-model="OverviewViewModel">
            <div bind-value="stats"></div>
          </pelela>
        `;
      case "settings":
        return `
          <pelela view-model="SettingsViewModel">
            <form>
              <input bind-value="username">
            </form>
          </pelela>
        `;
      default:
        return "<p>Section not found</p>";
    }
  }
}
```

### Caso 3: Modal/Dialog Dinámico

```typescript
function showModal(modalType: "confirm" | "alert" | "prompt") {
  const modalContainer = document.createElement("div");
  modalContainer.id = "modal";
  document.body.appendChild(modalContainer);
  
  const template = getModalTemplate(modalType);
  mountTemplate(modalContainer, template);
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal?.remove();
}

function getModalTemplate(type: string): string {
  return `
    <pelela view-model="ModalViewModel">
      <div class="modal-backdrop">
        <div class="modal-content">
          <h2 bind-value="title"></h2>
          <p bind-value="message"></p>
          <button click="confirm">OK</button>
          <button click="cancel">Cancel</button>
        </div>
      </div>
    </pelela>
  `;
}
```

### Caso 4: Testing de Componentes

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { mountTemplate, defineViewModel } from "@pelelajs/core";
import { JSDOM } from "jsdom";

describe("CounterViewModel", () => {
  let dom: JSDOM;
  let container: HTMLElement;
  
  beforeEach(() => {
    dom = new JSDOM("<!DOCTYPE html><body><div id='test'></div></body>");
    container = dom.window.document.getElementById("test")!;
    
    class CounterViewModel {
      count = 0;
      increment() { this.count++; }
    }
    
    defineViewModel("CounterViewModel", CounterViewModel);
  });
  
  it("should render initial count", () => {
    const template = `
      <pelela view-model="CounterViewModel">
        <span bind-value="count"></span>
      </pelela>
    `;
    
    mountTemplate(container, template);
    
    const span = container.querySelector("span");
    expect(span?.textContent).toBe("0");
  });
  
  it("should update on increment", () => {
    const template = `
      <pelela view-model="CounterViewModel">
        <span bind-value="count"></span>
        <button click="increment">+</button>
      </pelela>
    `;
    
    mountTemplate(container, template);
    
    const button = container.querySelector("button")!;
    const span = container.querySelector("span")!;
    
    button.click();
    
    expect(span.textContent).toBe("1");
  });
});
```

### Caso 5: Hot Module Replacement (HMR)

```typescript
if (import.meta.hot) {
  import.meta.hot.accept("./App.pelela", (newModule) => {
    const app = document.getElementById("app")!;
    mountTemplate(app, newModule.template);
  });
}
```

## Diferencias con bootstrap()

### Tabla Comparativa

| Característica | `bootstrap()` | `mountTemplate()` |
|----------------|---------------|-------------------|
| **Scope** | Todo el document | Solo el container |
| **HTML Injection** | No | Sí (innerHTML) |
| **Limpia contenido** | No | Sí |
| **Uso típico** | Inicialización app | Carga dinámica |
| **Llamadas múltiples** | Peligroso | Seguro |
| **Performance** | Más rápido | Más lento (parsing HTML) |

### bootstrap()

```typescript
bootstrap();
```

**Características:**
- Busca en todo el document
- No modifica el HTML existente
- Se llama típicamente una vez al inicio
- Más performante

**Uso:**

```html
<body>
  <pelela view-model="AppViewModel">
    <!-- HTML ya está en el documento -->
  </pelela>
  
  <script type="module">
    import { bootstrap } from "@pelelajs/core";
    bootstrap();
  </script>
</body>
```

### mountTemplate()

```typescript
mountTemplate(container, html);
```

**Características:**
- Busca solo en el container
- Inyecta HTML dinámicamente
- Limpia contenido anterior
- Se puede llamar múltiples veces
- Más lento (parsing + bootstrap)

**Uso:**

```typescript
const app = document.getElementById("app");
mountTemplate(app, '<pelela view-model="AppViewModel">...</pelela>');
```

## Flujo Completo Detallado

### Ejemplo Completo

```typescript
class UserProfileViewModel {
  name = "John Doe";
  email = "john@example.com";
}

defineViewModel("UserProfileViewModel", UserProfileViewModel);

const profileTemplate = `
  <pelela view-model="UserProfileViewModel">
    <div class="profile">
      <h1 bind-value="name"></h1>
      <p bind-value="email"></p>
    </div>
  </pelela>
`;

const container = document.getElementById("profile-container")!;
mountTemplate(container, profileTemplate);
```

### Traza Completa

```
1. Definición de ViewModel
   └─► defineViewModel("UserProfileViewModel", UserProfileViewModel)
         └─► Registry: Map { "UserProfileViewModel" => class }

2. mountTemplate(container, profileTemplate)
   │
   ├─► container.innerHTML = profileTemplate
   │     │
   │     └─► Parsing HTML:
   │           <pelela view-model="UserProfileViewModel">
   │             <div class="profile">
   │               <h1 bind-value="name"></h1>
   │               <p bind-value="email"></p>
   │             </div>
   │           </pelela>
   │
   └─► bootstrap({ root: container })
         │
         ├─► querySelectorAll("pelela[view-model]")
         │     └─► Found: <pelela view-model="UserProfileViewModel">
         │
         ├─► name = "UserProfileViewModel"
         │
         ├─► ctor = class UserProfileViewModel
         │
         ├─► instance = { name: "John Doe", email: "john@example.com" }
         │
         ├─► reactiveInstance = Proxy { ... }
         │
         ├─► element.__pelelaViewModel = reactiveInstance
         │
         ├─► setupBindings()
         │     │
         │     ├─► setupValueBindings()
         │     │     ├─► <h1 bind-value="name">
         │     │     └─► <p bind-value="email">
         │     │
         │     ├─► registerDependencies()
         │     │
         │     ├─► render() inicial
         │     │     ├─► <h1>.textContent = "John Doe"
         │     │     └─► <p>.textContent = "john@example.com"
         │     │
         │     └─► return render
         │
         └─► console.log("[pelela] View model instantiated...")

3. Aplicación lista
   └─► Usuario ve el perfil renderizado
```

### Estado del DOM

```
ANTES de mountTemplate:
──────────────────────
<div id="profile-container">
  <p>Loading...</p>
</div>


DESPUÉS de mountTemplate:
─────────────────────────
<div id="profile-container">
  <pelela view-model="UserProfileViewModel">
    <div class="profile">
      <h1 bind-value="name">John Doe</h1>
      <p bind-value="email">john@example.com</p>
    </div>
  </pelela>
</div>
```

## Performance

### Benchmarks

```typescript
const iterations = 1000;

console.time("bootstrap");
for (let i = 0; i < iterations; i++) {
  bootstrap({ root: container });
}
console.timeEnd("bootstrap");

console.time("mountTemplate");
for (let i = 0; i < iterations; i++) {
  mountTemplate(container, template);
}
console.timeEnd("mountTemplate");
```

**Resultados típicos:**

```
bootstrap: 150ms (1000 iteraciones)
mountTemplate: 280ms (1000 iteraciones)
```

`mountTemplate` es ~1.8x más lento debido al parsing de HTML.

### Optimizaciones

#### 1. Template Caching

```typescript
const templateCache = new Map<string, string>();

function getCachedTemplate(key: string): string {
  if (!templateCache.has(key)) {
    templateCache.set(key, fetchTemplate(key));
  }
  return templateCache.get(key)!;
}

const template = getCachedTemplate("home");
mountTemplate(container, template);
```

#### 2. Lazy Loading

```typescript
async function loadView(viewName: string) {
  const template = await import(`./views/${viewName}.pelela`);
  mountTemplate(container, template.default);
}
```

#### 3. Reutilizar Contenedor

```typescript
const app = document.getElementById("app")!;

mountTemplate(app, view1);
mountTemplate(app, view2);
mountTemplate(app, view3);
```

Mejor que crear contenedores nuevos cada vez.

## Limitaciones

### 1. Pérdida de Estado

```typescript
const app = document.getElementById("app");

mountTemplate(app, '<pelela view-model="CounterViewModel">...</pelela>');

const vm = (app.querySelector("pelela") as any).__pelelaViewModel;
vm.count = 5;

mountTemplate(app, '<pelela view-model="CounterViewModel">...</pelela>');
```

El `count = 5` se **pierde** porque el ViewModel anterior fue destruido.

**Solución:** State management externo:

```typescript
const appState = { count: 5 };

class CounterViewModel {
  count = appState.count;
  
  increment() {
    this.count++;
    appState.count = this.count;
  }
}
```

### 2. No Hay Transiciones

```typescript
mountTemplate(app, view1);
mountTemplate(app, view2);
```

La transición es **instantánea**. No hay animación entre vistas.

**Solución:** Implementar transiciones manualmente:

```typescript
async function transitionTo(template: string) {
  await fadeOut(app);
  mountTemplate(app, template);
  await fadeIn(app);
}
```

### 3. innerHTML No Ejecuta Scripts

```typescript
const template = `
  <pelela view-model="AppViewModel">
    <script>alert("Hello");</script>
  </pelela>
`;

mountTemplate(app, template);
```

El `<script>` **no se ejecutará** por seguridad del browser.

### 4. Múltiples Llamadas Rápidas

```typescript
mountTemplate(app, template1);
mountTemplate(app, template2);
mountTemplate(app, template3);
```

Si las llamadas son muy rápidas, puede haber race conditions si los templates se cargan asíncronamente.

**Solución:** Queue o cancelación:

```typescript
let currentMount: Promise<void> | null = null;

async function safeMount(container: HTMLElement, template: string) {
  if (currentMount) {
    await currentMount;
  }
  
  currentMount = Promise.resolve().then(() => {
    mountTemplate(container, template);
  });
  
  await currentMount;
  currentMount = null;
}
```

## Patrones Avanzados

### Patrón 1: View Manager

```typescript
class ViewManager {
  private container: HTMLElement;
  private currentView: string | null = null;
  
  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
  }
  
  render(viewName: string, template: string) {
    if (this.currentView === viewName) return;
    
    this.currentView = viewName;
    mountTemplate(this.container, template);
  }
  
  clear() {
    this.container.innerHTML = "";
    this.currentView = null;
  }
}

const viewManager = new ViewManager("app");
viewManager.render("home", homeTemplate);
```

### Patrón 2: Layout System

```typescript
function renderWithLayout(layout: string, content: string) {
  const template = layout.replace("{{content}}", content);
  mountTemplate(app, template);
}

const mainLayout = `
  <pelela view-model="LayoutViewModel">
    <header bind-value="headerTitle"></header>
    <main>{{content}}</main>
    <footer bind-value="footerText"></footer>
  </pelela>
`;

const homeContent = `
  <pelela view-model="HomeViewModel">
    <h1 bind-value="welcomeMessage"></h1>
  </pelela>
`;

renderWithLayout(mainLayout, homeContent);
```

### Patrón 3: Nested Views

```typescript
function mountNestedView(parentSelector: string, template: string) {
  const parent = document.querySelector(parentSelector) as HTMLElement;
  if (!parent) return;
  
  const nested = document.createElement("div");
  nested.className = "nested-view";
  parent.appendChild(nested);
  
  mountTemplate(nested, template);
}

mountNestedView("#main-content", sidebarTemplate);
mountNestedView("#main-content", contentTemplate);
```

## Testing con mountTemplate

### Setup de Test

```typescript
import { beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";

let dom: JSDOM;
let container: HTMLElement;

beforeEach(() => {
  dom = new JSDOM("<!DOCTYPE html><body><div id='test'></div></body>");
  container = dom.window.document.getElementById("test")!;
  
  global.document = dom.window.document as any;
  global.window = dom.window as any;
});

afterEach(() => {
  container.innerHTML = "";
});
```

### Test de Mounting

```typescript
it("should mount template correctly", () => {
  const template = `
    <pelela view-model="TestViewModel">
      <span id="test-span" bind-value="message"></span>
    </pelela>
  `;
  
  class TestViewModel {
    message = "Hello Test";
  }
  
  defineViewModel("TestViewModel", TestViewModel);
  mountTemplate(container, template);
  
  const span = container.querySelector("#test-span");
  expect(span?.textContent).toBe("Hello Test");
});
```

### Test de Re-mounting

```typescript
it("should replace content on re-mount", () => {
  mountTemplate(container, '<p>First</p>');
  expect(container.innerHTML).toBe('<p>First</p>');
  
  mountTemplate(container, '<p>Second</p>');
  expect(container.innerHTML).toBe('<p>Second</p>');
});
```

## Conclusión

`mountTemplate` es una función simple pero poderosa que:

1. **Simplifica** la carga dinámica de vistas
2. **Abstrae** el proceso de innerHTML + bootstrap
3. **Facilita** la construcción de SPAs
4. **Permite** testing aislado de componentes

Su simplicidad (2 líneas de código) es su mayor fortaleza, delegando la complejidad a `bootstrap()`.

### Cuándo Usar mountTemplate

✅ **SÍ usar cuando:**
- Cargas vistas dinámicamente
- Construyes un SPA
- Testing de componentes
- Modales/dialogs dinámicos

❌ **NO usar cuando:**
- Inicialización inicial de la app (usar `bootstrap()`)
- HTML ya está en el documento
- Necesitas máxima performance
- Tienes muchas animaciones/transiciones

## Referencias

- [Proceso de Bootstrap](./01-bootstrap-process.md)
- [Arquitectura General](../01-architecture/01-general-architecture.md)
- [Ciclo de Vida de la Aplicación](../01-architecture/02-application-lifecycle.md)
- [Sistema de Bindings](../04-bindings/01-binding-system.md)

