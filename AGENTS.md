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
    - **Simplicidad:** Soluciones directas antes que complejidad innecesaria.
  </logic_and_design>

  <style_and_clean_code>
    - **Nombres representativos:** Descriptivos y claros. No usar variables de una letra o nombres genéricos.
    - **DRY (Don't Repeat Yourself):** No duplicar lógica. Reutilizar definiciones de otros archivos.
    - **Cohesión:** Funciones cortas. Si es larga, dividir (divide y vencerás).
    - **Comentarios:** Explicar el "porqué", no el "qué". No JSDoc en internas. Evitar comentarios inútiles.
    - **Consistencia:** Mantener estilo uniforme en todo el proyecto.
  </style_and_clean_code>

  <type_safety_and_errors>
    - **Tipado estricto:** Prohibido usar `any`. Usar `unknown` o tipos específicos/genéricos.
    - **Manejo de errores:** Usar excepciones solo para casos excepcionales. "Fail fast": fallar lo antes posible. **Nunca dejar catch vacío**.
  </type_safety_and_errors>
</coding_standards>

<project_infrastructure>
  - **Linter:** Respetar estrictamente las reglas de **Biome** definidas en `biome.json`.
  - **Package Manager:** Usar exclusivamente **pnpm**. Existe un `pnpm-workspace.yaml`.
  - **Arquitectura:** Separación estricta entre lógica de negocio, presentación y datos. Mantener acoplamiento bajo y evitar dependencias circulares.
</project_infrastructure>

<workflow_constraints>
  - **Idioma:** Código y comentarios en **Inglés**. Documentación en **Español**.
  - **i18n:** Todos los mensajes de cara al usuario DEBEN usar la función `t()` de internacionalización. Nada de strings hardcodeados en español.
  - **Testing:** Cobertura > 90%. Primero caso feliz, luego casos borde. Los tests son documentación. Ante un bug: primero escribir el test que lo reproduce.
  - **Protocolo de ejecución:** NO corras tests ni linter por tu cuenta. Pedí al humano que lo haga: `biome:check` y `pnpm run test --run`.
</workflow_constraints>

<ai_interaction_protocol>
  - **Scope acotado:** Hacé solo lo que se te pide. No refactorices código no relacionado.
  - **Leé antes de actuar:** Entendé el contexto y el diseño existente antes de modificar.
  - **Ante la duda, preguntá:** No tomes decisiones de diseño o arquitectura por tu cuenta.
  - **Explicación:** Siempre explicá los cambios importantes siguiendo estas directrices.
</ai_interaction_protocol>
