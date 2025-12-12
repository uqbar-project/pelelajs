# 10. Integración con Vite - vite-plugin-pelelajs

## Introducción

`vite-plugin-pelelajs` es el plugin oficial de Vite para PelelaJS. Permite usar archivos `.pelela` (templates HTML) que se transforman automáticamente a módulos JavaScript/TypeScript, facilitando la separación entre HTML y lógica de negocio.

## Propósito

```
┌────────────────────────────────────────────────────────────────┐
│              vite-plugin-pelelajs PURPOSE                      │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PROBLEMA                                                      │
│  ────────                                                      │
│  HTML en strings:                                              │
│    const template = `<pelela view-model="App">...</pelela>`;  │
│                                                                 │
│  Problemas:                                                    │
│    • Sin syntax highlighting                                   │
│    • Sin autocompletado                                        │
│    • Difícil de mantener                                       │
│    • No se pueden usar herramientas HTML                       │
│                                                                 │
│  SOLUCIÓN                                                      │
│  ────────                                                      │
│  Archivos .pelela:                                             │
│    app.pelela    ← Archivo HTML puro                          │
│    app.ts        ← Lógica de negocio                          │
│                                                                 │
│  Plugin transforma:                                            │
│    app.pelela  →  JavaScript module                           │
│                                                                 │
│  Beneficios:                                                   │
│    ✓ Syntax highlighting                                       │
│    ✓ IDE features (Emmet, formateo, etc.)                     │
│    ✓ Separación de concerns                                   │
│    ✓ Import CSS automático                                    │
│    ✓ Validación en build time                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Instalación

### NPM

```bash
npm install -D vite-plugin-pelelajs
```

### Yarn

```bash
yarn add -D vite-plugin-pelelajs
```

### PNPM

```bash
pnpm add -D vite-plugin-pelelajs
```

## Configuración

### vite.config.ts

```typescript
import { defineConfig } from "vite";
import { pelelajsPlugin } from "vite-plugin-pelelajs";

export default defineConfig({
  plugins: [pelelajsPlugin()],
});
```

**Es todo!** No requiere configuración adicional.

## Formato de Archivos .pelela

### Estructura Básica

```html
<pelela view-model="ViewModelName">
  <!-- Tu HTML aquí -->
</pelela>
```

**Reglas:**
1. Exactamente un elemento `<pelela>` raíz
2. Debe tener atributo `view-model="..."`
3. Cierre `</pelela>` obligatorio

### Ejemplo: app.pelela

```html
<pelela view-model="App">
  <h1>Hello World PelelaJS</h1>
  
  <div class="counter">
    <button click="decrement">-</button>
    <p bind-value="counter"></p>
    <button click="increment">+</button>
  </div>
</pelela>
```

### Estructura de Proyecto Típica

```
src/
├── app.pelela         ← Template HTML
├── app.css           ← Estilos (opcional, auto-importado)
├── App.ts            ← ViewModel
└── main.ts           ← Entry point
```

## Transformación de .pelela

### Proceso

```
┌────────────────────────────────────────────────────────────────┐
│                 TRANSFORMACIÓN .pelela                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT: app.pelela                                             │
│  ──────────────────                                            │
│  <pelela view-model="App">                                    │
│    <h1>Hello World</h1>                                        │
│  </pelela>                                                     │
│                                                                 │
│         │                                                       │
│         ▼                                                       │
│  PLUGIN PROCESSING                                             │
│  ──────────────────                                            │
│  1. Leer archivo .pelela                                       │
│  2. Validar estructura                                         │
│  3. Extraer view-model name                                    │
│  4. Escapar template strings                                   │
│  5. Buscar app.css (si existe)                                 │
│  6. Generar código JavaScript                                  │
│                                                                 │
│         │                                                       │
│         ▼                                                       │
│  OUTPUT: JavaScript Module                                     │
│  ───────────────────────────                                   │
│  import "./app.css";                                           │
│  export const viewModelName = "App";                           │
│  const template = `<pelela view-model="App">                  │
│    <h1>Hello World</h1>                                        │
│  </pelela>`;                                                   │
│  export default template;                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Código Generado

Para `app.pelela`:

```html
<pelela view-model="App">
  <h1>Counter: <span bind-value="count"></span></h1>
  <button click="increment">+</button>
</pelela>
```

El plugin genera:

```javascript
import "./app.css";
export const viewModelName = "App";
const template = `<pelela view-model="App">
  <h1>Counter: <span bind-value="count"></span></h1>
  <button click="increment">+</button>
</pelela>`;
export default template;
```

### Exports

```typescript
export const viewModelName: string;  // Nombre del ViewModel
export default template: string;     // Template HTML completo
```

## Auto-Import de CSS

### Convención

Si existe un archivo `.css` con el mismo nombre, se importa automáticamente:

```
src/
├── app.pelela    ← Template
└── app.css       ← Auto-importado si existe
```

### Ejemplo

**app.pelela:**

```html
<pelela view-model="App">
  <div class="container">
    <h1>Hello World</h1>
  </div>
</pelela>
```

**app.css:**

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #333;
  font-size: 2rem;
}
```

**Código generado:**

```javascript
import "./app.css";  // ← Auto-importado
export const viewModelName = "App";
const template = `...`;
export default template;
```

### Sin CSS

Si `app.css` **no existe**, simplemente no se genera el import:

```javascript
// Sin import CSS
export const viewModelName = "App";
const template = `...`;
export default template;
```

## Validaciones del Plugin

### Validación 1: Debe Tener Exactamente Un `<pelela>`

**Error:**

```html
<!-- Sin <pelela> -->
<div>Content</div>
```

```
Error: Pelela template "app.pelela" debe contener exactamente un <pelela ...> como raíz.
```

**Error:**

```html
<!-- Múltiples <pelela> -->
<pelela view-model="App1">...</pelela>
<pelela view-model="App2">...</pelela>
```

```
Error: Pelela template "app.pelela" tiene 2 etiquetas <pelela>. Solo se permite una raíz.
```

### Validación 2: Debe Tener Cierre `</pelela>`

**Error:**

```html
<pelela view-model="App">
  <h1>Hello</h1>
<!-- Falta </pelela> -->
```

```
Error: Pelela template "app.pelela" no tiene etiqueta de cierre </pelela>.
```

### Validación 3: Tags Balanceados

**Error:**

```html
<pelela view-model="App">
  <h1>Hello</h1>
</pelela>
</pelela>  <!-- Extra -->
```

```
Error: Pelela template "app.pelela" tiene un número desbalanceado de <pelela> y </pelela>.
```

### Validación 4: Debe Tener `view-model` Attribute

**Error:**

```html
<pelela>  <!-- Sin view-model -->
  <h1>Hello</h1>
</pelela>
```

```
Error: Pelela template "app.pelela" debe contener <pelela view-model="...">
```

## Escape de Template Strings

### Problema

Template strings en JavaScript usan backticks y `${}`:

```javascript
const template = `<div>${value}</div>`;  // ✗ Conflicto
```

Si el HTML contiene estos caracteres, rompe el JavaScript.

### Solución: escapeTemplate

```typescript
function escapeTemplate(html: string): string {
  return html.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}
```

### Ejemplos de Escape

#### Ejemplo 1: Backticks

**Input:**

```html
<pelela view-model="App">
  <code>Use `backticks` for template strings</code>
</pelela>
```

**Output:**

```javascript
const template = `<pelela view-model="App">
  <code>Use \`backticks\` for template strings</code>
</pelela>`;
```

Los backticks se escapan a `\``.

#### Ejemplo 2: Template Expressions

**Input:**

```html
<pelela view-model="App">
  <p>Expression: ${value}</p>
</pelela>
```

**Output:**

```javascript
const template = `<pelela view-model="App">
  <p>Expression: \${value}</p>
</pelela>`;
```

`${` se escapa a `\${`.

## Código Fuente del Plugin

### Estructura

```typescript
export interface PelelaVitePlugin {
  name: string;
  enforce?: "pre" | "post";
  load?(this: any, id: string): string | null | Promise<string | null>;
}

export function pelelajsPlugin(): PelelaVitePlugin {
  return {
    name: "vite-plugin-pelelajs",
    enforce: "pre",
    load(id) {
      // Implementación
    }
  };
}
```

### Función load

```typescript
load(id) {
  // 1. Filtrar archivos .pelela
  if (!id.endsWith(".pelela")) return null;

  // 2. Leer archivo
  const code = fs.readFileSync(id, "utf-8");

  // 3. Buscar CSS
  const cssFile = id.replace(/\.pelela$/, ".css");
  let cssImport = "";
  
  if (fs.existsSync(cssFile)) {
    const cssBase = path.basename(cssFile);
    cssImport = `import "./${cssBase}";\n`;
  }

  // 4. Validaciones
  const openTags = code.match(/<pelela\b[^>]*>/g) || [];
  const closeTags = code.match(/<\/pelela>/g) || [];
  
  if (openTags.length === 0) {
    this.error("Debe contener exactamente un <pelela>");
  }
  
  if (openTags.length > 1) {
    this.error(`Tiene ${openTags.length} etiquetas. Solo una raíz.`);
  }
  
  if (closeTags.length === 0) {
    this.error("No tiene etiqueta de cierre </pelela>");
  }
  
  if (closeTags.length !== openTags.length) {
    this.error("Número desbalanceado de tags");
  }

  // 5. Extraer view-model name
  const viewModelMatch = code.match(
    /<pelela[^>]*view-model\s*=\s*"([^"]+)"/
  );
  const viewModelName = viewModelMatch ? viewModelMatch[1] : null;
  
  if (!viewModelName) {
    this.error("Debe contener view-model='...'");
  }

  // 6. Escapar template
  const escaped = escapeTemplate(code);

  // 7. Generar JavaScript
  const js = `
${cssImport}export const viewModelName = ${JSON.stringify(viewModelName)};
const template = \`${escaped}\`;
export default template;
`;

  return js;
}
```

### Regex para Extraer view-model

```typescript
/<pelela[^>]*view-model\s*=\s*"([^"]+)"/
```

**Breakdown:**

```
<pelela          - Literal "<pelela"
[^>]*            - Cualquier carácter excepto > (0 o más)
view-model       - Literal "view-model"
\s*              - Espacios opcionales
=                - Literal "="
\s*              - Espacios opcionales
"                - Comillas de apertura
([^"]+)          - Grupo 1: Contenido (cualquier cosa excepto ")
"                - Comillas de cierre
```

**Matches:**

```html
<pelela view-model="App">           → "App"
<pelela class="x" view-model="VM">  → "VM"
<pelela view-model = "Test">        → "Test"
```

## Uso en Aplicaciones

### Proyecto Completo

**Estructura:**

```
my-app/
├── node_modules/
├── src/
│   ├── app.pelela      ← Template
│   ├── app.css         ← Estilos
│   ├── App.ts          ← ViewModel
│   ├── main.ts         ← Entry
│   └── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**src/app.pelela:**

```html
<pelela view-model="App">
  <h1>Hello World PelelaJS</h1>
  
  <div class="counter">
    <button click="decrement">-</button>
    <p bind-value="counter"></p>
    <button click="increment">+</button>
  </div>
</pelela>
```

**src/app.css:**

```css
.counter {
  display: flex;
  gap: 1rem;
  align-items: center;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1.5rem;
  cursor: pointer;
}
```

**src/App.ts:**

```typescript
export class App {
  counter = 0;

  increment() {
    this.counter++;
  }

  decrement() {
    this.counter--;
  }
}
```

**src/main.ts:**

```typescript
import { defineViewModel, bootstrap, mountTemplate } from "@pelelajs/core";
import { App } from "./App";
import template from "./app.pelela";  // ← Import .pelela

// Montar template en el DOM
mountTemplate(template);

// Registrar ViewModel
defineViewModel("App", App);

// Bootstrap
bootstrap();
```

**src/index.html:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PelelaJS App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**vite.config.ts:**

```typescript
import { defineConfig } from "vite";
import { pelelajsPlugin } from "vite-plugin-pelelajs";

export default defineConfig({
  plugins: [pelelajsPlugin()],
});
```

**package.json:**

```json
{
  "name": "my-pelela-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^7.2.4",
    "vite-plugin-pelelajs": "^0.0.1",
    "typescript": "^5.9.3"
  },
  "dependencies": {
    "@pelelajs/core": "^0.0.1"
  }
}
```

### Desarrollo

```bash
npm run dev
```

Vite inicia el dev server con HMR (Hot Module Replacement).

### Build para Producción

```bash
npm run build
```

Genera bundle optimizado en `dist/`.

## TypeScript Declaration

### index.d.ts

```typescript
export interface PelelaVitePlugin {
  name: string;
  enforce?: "pre" | "post";
  load?(this: any, id: string): string | null | Promise<string | null>;
}

export declare function pelelajsPlugin(): PelelaVitePlugin;
```

### Tipos de Imports

Para que TypeScript reconozca `.pelela` imports:

**src/vite-env.d.ts:**

```typescript
/// <reference types="vite/client" />

declare module "*.pelela" {
  const template: string;
  export const viewModelName: string;
  export default template;
}
```

Ahora TypeScript no da error:

```typescript
import template, { viewModelName } from "./app.pelela";
// ✓ OK: tipos reconocidos
```

## HMR (Hot Module Replacement)

### Cómo Funciona

Cuando editas un archivo `.pelela`:

1. Vite detecta el cambio
2. Plugin re-procesa el archivo
3. Genera nuevo JavaScript
4. Vite actualiza el módulo en el browser
5. La app se re-renderiza automáticamente

**Ventaja:** Cambios instantáneos sin reload completo.

### Ejemplo de Flujo

```
Edit app.pelela
    │
    ├─► Save file
    │
    ├─► Vite detecta cambio
    │
    ├─► Plugin.load("app.pelela")
    │     └─► Genera nuevo JavaScript
    │
    ├─► Vite envía update al browser
    │
    └─► Browser actualiza módulo
          └─► PelelaJS re-renderiza
```

## Debugging del Plugin

### Log de Transformación

```typescript
export function pelelajsPlugin(): PelelaVitePlugin {
  return {
    name: "vite-plugin-pelelajs",
    enforce: "pre",

    load(id) {
      if (!id.endsWith(".pelela")) return null;

      console.log("[pelelajsPlugin] Processing:", id);

      const code = fs.readFileSync(id, "utf-8");
      
      // ... resto del código
      
      const js = `...`;
      
      console.log("[pelelajsPlugin] Generated code:");
      console.log(js);

      return js;
    },
  };
}
```

### Inspeccionar Output

En dev server, los módulos transformados están disponibles en:

```
http://localhost:5173/src/app.pelela
```

Visitar esta URL muestra el JavaScript generado.

## Comparación: Con y Sin Plugin

### Sin Plugin (Inline)

```typescript
// main.ts
import { defineViewModel, bootstrap, mountTemplate } from "@pelelajs/core";
import { App } from "./App";

const template = `
<pelela view-model="App">
  <h1>Hello World PelelaJS</h1>
  
  <div class="counter">
    <button click="decrement">-</button>
    <p bind-value="counter"></p>
    <button click="increment">+</button>
  </div>
</pelela>
`;

mountTemplate(template);
defineViewModel("App", App);
bootstrap();
```

**Problemas:**
- ✗ Sin syntax highlighting para HTML
- ✗ Sin autocompletado de HTML
- ✗ Difícil de mantener
- ✗ No se puede usar Emmet
- ✗ CSS inline o en otro archivo sin conexión

### Con Plugin (Archivos .pelela)

```typescript
// main.ts
import { defineViewModel, bootstrap, mountTemplate } from "@pelelajs/core";
import { App } from "./App";
import template from "./app.pelela";  // ← Limpio

mountTemplate(template);
defineViewModel("App", App);
bootstrap();
```

```html
<!-- app.pelela -->
<pelela view-model="App">
  <h1>Hello World PelelaJS</h1>
  
  <div class="counter">
    <button click="decrement">-</button>
    <p bind-value="counter"></p>
    <button click="increment">+</button>
  </div>
</pelela>
```

**Beneficios:**
- ✓ Syntax highlighting completo
- ✓ Autocompletado de HTML
- ✓ Emmet funciona
- ✓ Formateo automático (Prettier)
- ✓ CSS auto-importado
- ✓ Validación en build time

## Testing

### Test del Plugin

```typescript
import { describe, it, expect } from "vitest";
import { pelelajsPlugin } from "vite-plugin-pelelajs";

describe("pelelajsPlugin", () => {
  it("should transform .pelela files", () => {
    const plugin = pelelajsPlugin();
    
    const mockThis = {
      error: (msg: string) => { throw new Error(msg); }
    };
    
    const id = "/path/to/app.pelela";
    const result = plugin.load!.call(mockThis, id);
    
    expect(result).toContain("export const viewModelName");
    expect(result).toContain("export default template");
  });

  it("should return null for non-.pelela files", () => {
    const plugin = pelelajsPlugin();
    
    const result = plugin.load!.call({}, "/path/to/file.ts");
    
    expect(result).toBeNull();
  });
});
```

### Mocking fs en Tests

```typescript
import { vi } from "vitest";

vi.mock("fs", () => ({
  readFileSync: vi.fn((path: string) => {
    if (path.endsWith(".pelela")) {
      return '<pelela view-model="Test"><h1>Test</h1></pelela>';
    }
    return "";
  }),
  existsSync: vi.fn(() => false)
}));
```

## Limitaciones

### 1. Solo Un `<pelela>` por Archivo

**No soportado:**

```html
<pelela view-model="Component1">...</pelela>
<pelela view-model="Component2">...</pelela>
```

**Solución:** Usar archivos separados.

### 2. No Procesa Nested .pelela

Si un `.pelela` importa otro `.pelela`, no hay resolución especial.

**No funciona:**

```html
<pelela view-model="App">
  <include src="./header.pelela" />
</pelela>
```

**Solución:** Usar JavaScript para componer templates.

### 3. CSS Debe Tener Mismo Nombre

```
app.pelela  → Busca app.css (mismo basename)
```

**No detecta:**

```
app.pelela
styles.css  ← No se auto-importa
```

**Solución:** Nombrar CSS igual o importar manualmente.

## Troubleshooting

### Error: "Cannot find module '*.pelela'"

**Problema:** TypeScript no reconoce `.pelela` imports.

**Solución:** Agregar declaración de módulos:

```typescript
// src/vite-env.d.ts
declare module "*.pelela" {
  const template: string;
  export const viewModelName: string;
  export default template;
}
```

### Error: "Unexpected token"

**Problema:** El HTML contiene backticks o `${}` sin escapar.

**Solución:** El plugin debería escaparlos automáticamente. Si persiste, revisar `escapeTemplate()`.

### CSS No Se Aplica

**Problema:** CSS existe pero no se importa.

**Verificar:**
1. Nombre: `app.pelela` → `app.css` (mismo basename)
2. Ubicación: Mismo directorio
3. Build: Re-build puede ser necesario

### HMR No Funciona

**Problema:** Cambios en `.pelela` no se reflejan.

**Solución:**
1. Verificar que Vite está en modo dev
2. Verificar que no hay errores de sintaxis en `.pelela`
3. Reiniciar dev server

## Configuración Avanzada

### Enforce "pre"

```typescript
enforce: "pre"
```

**Propósito:** Procesar `.pelela` **antes** que otros plugins.

**Razón:** Transformar a JavaScript primero, luego otros plugins pueden procesar el JavaScript resultante.

### Custom Error Handling

```typescript
export function pelelajsPlugin(options?: { silent?: boolean }): PelelaVitePlugin {
  return {
    name: "vite-plugin-pelelajs",
    enforce: "pre",

    load(id) {
      if (!id.endsWith(".pelela")) return null;

      try {
        // ... procesamiento
      } catch (error) {
        if (options?.silent) {
          console.warn(`[pelelajsPlugin] Error in ${id}:`, error);
          return null;
        }
        throw error;
      }
    },
  };
}
```

## Roadmap y Futuras Mejoras

### Posibles Features

1. **Source Maps** - Mapear errores de runtime al `.pelela` original
2. **Syntax Validation** - Validar HTML en build time
3. **Scoped CSS** - CSS automáticamente scoped al componente
4. **Component Composition** - Incluir otros `.pelela` templates
5. **TypeScript en Templates** - Soporte para expresiones TS inline
6. **Preprocessors** - Soporte para SCSS, PostCSS, etc.

## Conclusión

`vite-plugin-pelelajs` es un plugin simple pero poderoso que:

1. **Separa concerns** - HTML en `.pelela`, lógica en `.ts`
2. **Mejora DX** - Syntax highlighting, autocompletado, Emmet
3. **Auto-importa CSS** - Convención sobre configuración
4. **Valida en build time** - Detecta errores temprano
5. **HMR integrado** - Dev experience fluido
6. **Zero config** - Funciona out of the box

Es la forma recomendada de usar PelelaJS con Vite.

## Referencias

- [Bootstrap Process](../02-bootstrap/01-bootstrap-process.md)
- [mountTemplate](../02-bootstrap/02-mount-template.md)
- [Registro de ViewModels](../06-registry/01-viewmodel-registry.md)
- [Arquitectura General](../01-architecture/01-general-architecture.md)
- [Vite Documentation](https://vitejs.dev/)

