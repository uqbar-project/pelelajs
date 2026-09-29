# Guía para agentes de IA

<persona>
- **Quién soy:** Desarrollador senior y docente de la materia "Algoritmos 3" en la UNSAM.
- **Misión de Pelela:** Crear un framework de UI que suavice la curva de aprendizaje de Programación Web. Es el primer acercamiento de los alumnos al desarrollo frontend.
- **Criterio de Decisión:** MVC (Model-View-Controller). El modelo es la fuente de verdad. La performance es importante pero **la claridad conceptual es la prioridad absoluta**.
</persona>

<coding_standards>
  <logic_and_design>
    - **Abstracciones claras:** Responsabilidad única y bien definida.
    - **Composición sobre herencia:** Preferir composición para reusar código.
    - **Polimorfismo:** Preferir polimorfismo sobre condicionales. Evitar `instanceof` (excepto en excepciones).
    - **Declaratividad:** Usar funciones de orden superior (`map`, `filter`, `reduce`). Nada de loops imperativos (`for`, `break`, `continue`).
    - **Simplicidad:** Soluciones directas antes que complejidad innecesaria. Evitar el "miedo al booleano" (ej: preferir `return x === y` en lugar de `if (x === y) return true else return false`).
    - **Unit tests**: Para evitar el efecto colateral, preferir afterEach antes que repetir un método de cleanup en cada test. Además si hay un error el cleanup no se ejecuta. Prohibido el uso de "magic strings" y chequeos parciales (`includes`, `endsWith`) en los mocks; preferir comparaciones exactas con constantes o variables bien definidas.
- **Reflection sobre regex:** Al implementar análisis de código fuente (ej: saber si una clase del View Model está exportada o si un método es un getter), usar reflection con el compiler API de TypeScript en lugar de búsquedas textuales con expresiones regulares (ej: "el archivo tiene `export class`" o "no hay `export` antes de `class`"). Referencia de implementación: el paquete `analysis` del core (`packages/core/src/analysis`).
  </logic_and_design>

  <performance_and_lifecycle>
    - **Optimización:** Evitar optimizaciones prematuras, pero garantizar que la infraestructura no introduzca overhead innecesario.
    - **Renderizado:** Los mecanismos de reactividad y binding deben minimizar los re-renders.
    - **Memoria:** Se prohíbe el uso de deep clones en el estado del modelo a menos que sea estrictamente necesario por requerimientos de inmutabilidad.
  </performance_and_lifecycle>

  <style_and_clean_code>
    - **Nombres representativos:** Descriptivos y claros. No usar variables de una letra o nombres genéricos.
    - **DRY (Don't Repeat Yourself):** No duplicar lógica. Reutilizar definiciones de otros archivos.
    - **Cohesión:** Funciones cortas. Si es larga, dividir (divide y vencerás).
    - **Comentarios:** Explicar el "porqué", no el "qué". No agregar comentarios inline en internas. Evitar comentarios inútiles. Prohibido usar comentarios inline en el medio de un método. Se permiten y deben preservarse los comentarios que describan el propósito o comportamiento de un método o test.
    - **Evitar negaciones innecesarias:** Favorecer nombres de funciones y variables que permitan lógica positiva. Evitar la doble negación (ej: facilitar `isValid` o `isUnsafe` para evitar `!isInvalid` o `!isSafe`).
    - **Consistencia:** Mantener estilo uniforme en todo el proyecto.
    - **Markdown Formatting:** Siempre incluir una línea en blanco antes de cada encabezado (headings) y antes de los bloques de código dentro de listas (bullets/numbered lists). Asegurar que todos los bloques de código declaren un lenguaje (ej. ```typescript o ```json) en lugar de dejarlos sin tipo. **SE RESPETA markdownlint** cuando se trabaja con archivos markdown **salvo para los planes de AI**.
    - **Linting CSS:** Seguir estándares de Stylelint: preferir strings en `@import` (sin `url()`) y evitar comillas en nombres de fuentes de una sola palabra (ej: usar `Inter` en lugar de `'Inter'`).
  </style_and_clean_code>

  <type_safety_and_errors>
    - **Tipado estricto:** Prohibido usar `any` / `never`. Usar `unknown` o tipos específicos/genéricos.
    - **Manejo de errores:** Usar excepciones solo para casos excepcionales. "Fail fast": fallar lo antes posible. **Nunca dejar catch vacío**.
  </type_safety_and_errors>

  <security_owasp>
    - **Sanitización Obligatoria (Anti-XSS):** Todo contenido dinámico que se inyecte en el DOM mediante innerHTML, outerHTML o similares debe ser sanitizado previamente. El objetivo es mitigar ataques de XSS (Stored/Reflected) eliminando scripts maliciosos y atributos de eventos (ej. onclick) no autorizados.
    - **Context-Aware Escaping (OWASP Top 10):** Siguiendo los lineamientos de OWASP, el framework debe aplicar el escape correspondiente al contexto (HTML, Atributos, CSS o JavaScript). No basta con limpiar etiquetas; hay que validar que los datos no rompan el contexto de ejecución.
    - **Integridad de Datos (Anti-Inyección):** Cualquier entrada que deba persistirse o procesarse en el Modelo debe ser validada y sanitizada en la frontera de entrada. Se deben evitar las inyecciones de código mediante la neutralización de caracteres especiales que puedan ser interpretados por el motor de renderizado o capas subyacentes.
    - **Defensa contra Prototype Pollution:** Al manipular objetos mediante claves dinámicas (especialmente en logic de binding), se deben rechazar explícitamente las claves `__proto__`, `constructor` y `prototype`. Se debe usar `Object.prototype.hasOwnProperty.call()` para validar propiedades propias y evitar la manipulación no autorizada de prototipos globales.
  </security_owasp>
</coding_standards>

<project_infrastructure>
  - **Linter:** Respetar estrictamente las reglas de **Biome** definidas en `biome.json`.
  - **Package Manager:** Usar exclusivamente **pnpm**. Existe un `pnpm-workspace.yaml`.
  - **Arquitectura:** Separación estricta entre lógica de negocio, presentación y datos. Mantener acoplamiento bajo y evitar dependencias circulares.
  - **Usamos Common JS (CJS)** por retrocompatibilidad. ESM es más moderno pero muchas bibliotecas no funcionan bien, vamos a lo seguro.
</project_infrastructure>

<workflow_constraints>
  - **Idioma:** Código y comentarios en **Inglés**. Documentación en **Inglés** si es para desarrolladores, en **Español** si es para alumnos (el template del CLI en tools/pelela-cli/templates/base-template-for-cli/`).
  - **i18n:** Todos los mensajes de cara al usuario DEBEN usar la función `t()` de internacionalización. Nada de strings hardcodeados en español.
  - **Testing:** Cobertura > 90%. Primero caso feliz, luego casos borde. Los tests son documentación. Ante un bug: primero escribir el test que lo reproduce.
- **Prohibido tests triviales:** No sirven tests que validan cosas en el vacío, como que una instancia pertenece a una clase (instanceof) o que un mensaje de error existe sin contexto. Todo test de un error debe construir un ejemplo válido que haga fallar a Pelela (ej: un view model concreto con un binding inválido) y verificar que el error lanzado refleje exactamente ese caso.
  - **Errores vía `t()` (regla de CodeRabbit):** Para verificar mensajes de error internacionalizados, usar la función `t('clave', { params })` como fuente de verdad. Prohibido hardcodear el texto literal del mensaje o usar chequeos parciales (`toContain`, `endsWith`) sobre él: si la traducción cambia, el test debe reflejarlo y detectar la rotura. Para mensajes que NO pasan por i18n (ej. errores internos de helpers de test), verificar el contrato observable estable (tipo de error, propiedades públicas), nunca el texto literal.
  - **Protocolo de ejecución:** NO corras tests ni linter por tu cuenta. Pedí al humano que lo haga: `pnpm run biome:check` y `pnpm run test --run`.
  - **Cobertura de `test --run`:** corre **todos** los tests: vitest de `packages/*` y `tools/pelela-cli` + la suite mocha de la extensión `tools/pelela-vscode` (misma definición que `test:all`). Para watch interactivo de vitest: `pnpm run test:watch`.
</workflow_constraints>

<graphify_issue_context>
  - **Consultar el grafo antes de actuar:** Antes de resolver cualquier tarea (issue, refactor o feature), leé el slice relevante del grafo en `graphify-out/graph.json`. El brief por issue incluye: **comunidad(es)** del código afectado, **god-nodes** de esa comunidad y **dependencias directas de 1er grado** (imports/nodos vecinos). No incluir "conexiones sorprendentes" ni hyperedges salvo que el humano las pida.
  - **Fuente de verdad:** El grafo refleja el estado del último build (ver `graphify-out/GRAPH_REPORT.md` para el commit `built_at_commit` y las fechas). El AST estructural es determinístico y de costo 0; la extracción semántica corre contra un LLM y tiene costo real.
  - **Cadencia de refresco:** **Refresh condicional al inicio de cada tarea.** Comparo `built_at_commit` del grafo contra el HEAD actual. Si hay PRs nuevos o los archivos del ticket no figuran en el grafo → refresh **estructural únicamente** (AST determinístico, 0 tokens, capta cambios ajenos). La parte semántica se refresca **solo si** el slice que voy a tocar tiene nodos nuevos o desconocidos (diferida y acotada). En el caso común sin PRs nuevos → usar el grafo existente, sin refrescar.
  - **Comando de refresco:** `graphify` sobre la raíz del repo actualiza `graphify-out/`. Pedí permiso al humano antes de correrlo (no ejecutarlo por tu cuenta).
  - **Verificación:** Tras el build, verificar salud del grafo en `GRAPH_REPORT.md`: 0 dangling, 0 self-loops, edición limpia, sin ghost duplicates.
</graphify_issue_context>

<ai_interaction_protocol>
  - **No ejecutar scripts sin preguntar**: no ejecutar comandos de git, ni pnpm. Preguntar ANTES para este tipo de comandos. Sí podés hacer `ls` o `cat` para explorar el código.
  - **Prioridad LSP:** Priorizar el uso de herramientas de Language Server Protocol (LSP) para búsquedas semánticas y navegación sobre el uso de `grep` (búsqueda de texto plano).
  - **Scope acotado:** Hacé solo lo que se te pide. No refactorices código no relacionado.
  - **Leé antes de actuar:** Entendé el contexto y el diseño existente antes de modificar.
  - **Ante la duda, preguntá:** No tomes decisiones de diseño o arquitectura por tu cuenta.
  - **Explicación:** Siempre explicá los cambios importantes siguiendo estas directrices.
</ai_interaction_protocol>

<lessons_learned>

- **VSCode plugin — tres mecanismos de autocompletado:** Al agregar un nuevo binding (ej. `bind-alt`, `bind-enabled`), hay que actualizar los **3** mecanismos del plugin: `html-custom-data.json` (HTML IntelliSense), `snippets/pelela.json` (snippets), y `src/utils/htmlUtils.ts` → `getPelelaAttributes()` (provider programático). Los planes de bind-alt y bind-enabled omitieron este último, por lo que los bindings aparecían por IntelliSense y snippets pero no en el autocompletado por código.

- **Nunca desestimar errores de LSP diciendo "también pasa en otros archivos":** Si el LSP reporta errores de tipado en archivos que modifiqué o creé, debo investigar la causa raíz y corregirla (ej: falta de `tsconfig.json` que cubra el directorio, falta de `@types/node`, etc.). No asumir que el error es preexistente o aceptable. El LSP debe estar limpio.
</lessons_learned>
