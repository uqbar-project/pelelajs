# Reglas de Programación para este Proyecto

## Principios Fundamentales

- **Nombres representativos** - Usá nombres descriptivos que expliquen el propósito de variables, funciones y clases. Nada de variables de una sola letra, nombres abreviados o muy genéricos.
- **Abstracciones claras** - Creá abstracciones cohesivas con una única responsabilidad bien definida
- **Evitar código duplicado** - Aplicá el principio DRY (Don't Repeat Yourself). Si existe una definición en otro archivo, usala (DRY a nivel de archivos). No dupliques lógica común.
- **Simplicidad primero** - Preferí soluciones simples y directas sobre complejidad innecesaria
- **Cohesión** - cuando una función se vuelva muy larga partila en funciones más chicas (divide y vencerás). Mantené las funciones cortas y enfocadas en una sola tarea.
- **Preferir composición sobre herencia** - cuando necesites reutilizar código, preferí composición sobre herencia.
- **Declaratividad y orden superior antes que imperatividad** - cuando puedas, usá funciones de orden superior (map, filter, reduce) en lugar de loops, nada de for + if + break + continue.
- **Polimorfismo** - cuando necesites reutilizar código, preferí polimorfismo sobre condicionales (a menos que no tengamos objetos). Evitar preguntar por la clase a menos de que sea necesario (por ejemplo en las excepciones que es un caso donde es válido).
- **Linter** - respetá las reglas del linter Biome, que están en el archivo `biome.json` del raíz de este proyecto. Incluí siempre `biome check` como parte del plan de implementación y verificación.

## Guías de Estilo

- **Comentarios significativos** - Comentá el "porqué" no el "qué", el código debe explicarse por sí mismo. ¡NO COMENTES TODO! No queremos comentarios inútiles que no aportan nada. El código claro es la mejor documentación. No comentes una sola línea de código dentro de una función o método. No uses JSDoc para funciones internas (no exportadas).
- **Consistencia** - Mantené un estilo consistente en todo el código base
- **Manejo de errores** - usá excepciones para casos excepcionales, no para control de flujo. Fail fast: fallar lo antes posible cuando el usuario haga algo que no debería hacer. Nunca dejar un catch vacío.
- **Async/Await** - Usá siempre `async/await` en lugar de `.then()/.catch()`. Mantené consistencia con el estilo moderno y legible.
- **Tipado estricto** - No usar `any`. Siempre usar `unknown` o buscar el tipo que corresponda: un tipo existente, genérico `T`, o `unknown` cuando no se pueda determinar el tipo.

## Arquitectura

- **Separación de responsabilidades** - Mantené lógica de negocio separada de presentación y datos
- **Dependencias claras** - Evitá dependencias circulares y mantiene acoplamiento bajo
- **Testing** - Importante mantener arriba de un 90% de cobertura, pensando primero en el caso feliz, luego en los casos borde. Los tests son parte de la documentación. Cuando encontremos un error, primero escribí un test que lo reproduzca, luego corregí el código.
- **Documentación** - Documentá APIs y componentes complejos. La documentación no debe ser exhaustiva, sino útil. Documentar lo más importante, lo esencial, cosas de alto nivel, arquitectural.

## Notas para Asistentes de IA

- **Estas reglas deben aplicarse consistentemente en todo el código**
- **Priorizá la mantenibilidad y legibilidad sobre optimizaciones prematuras**
- **Ante la duda o conflicto de reglas, preguntá** - "Si no estás seguro de cómo resolver algo o hay varias alternativas posibles, preguntá antes de implementar. No tomes decisiones de diseño o arquitectura por tu cuenta."
- **Scope acotado** - "Hacé solo lo que se te pide, no refactorices código que no está relacionado con la tarea" (evita PRs gigantes con cambios no solicitados)
- **Leé antes de modificar** - "Antes de cambiar código, leé el contexto completo para entender el diseño existente"
- **Dependencias** - "No agregues nuevas dependencias sin consultar primero"
- **Package manager** - "Usa siempre pnpm, nunca npm. Este proyecto usa `pnpm-workspace.yaml` y requiere pnpm para gestionar dependencias."
- **Tests** - "Corré los tests y `biome check` antes de dar por terminado un cambio. Usá `pnpm test --run` para ejecutar una sola vez y evitar que se quede esperando cambios."
- **Idioma** - "Los comentarios y código en inglés y la documentación en español, así como los mensajes de error"
- **Internacionalización (i18n)** - "Todos los mensajes hacia el usuario DEBEN estar internacionalizados. Nada de strings hardcodeados. Usar la función `t()` de i18n para todos los mensajes que vea el usuario."
- **Siempre explicá los cambios importantes siguiendo estas directrices**
