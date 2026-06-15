# Plan: Validar directivas y componentes fuera de `<pelela>`/`<component>` (Issue #124)

## Contexto

La issue describe un caso donde se usa `<pelela>` correctamente, pero luego aparecen componentes y directivas fuera del tag raíz. En PelelaJS esa sintaxis no se procesa y el resultado es una app silenciosamente rota.

Actualmente `packages/vite-plugin-pelelajs/src/index.ts` ya valida algunas restricciones en el root tag, pero no detecta con precisión:

- `prop-`, `link-`, `const-`, `bind-` en tags fuera del root.
- `for-each` e `if` fuera del root.
- invocaciones de componentes (`<ProductoRow ...>`) colocadas fuera de `<pelela>` o `<component>`.

El comportamiento deseado es que la app falle de forma visible cuando la página carga, preferiblemente en compilación o al montar el template.

## Requerimientos

1. Detectar `prop-`, `link-`, `const-`, `bind-`, `for-each`, `if` usados fuera del tag raíz `<pelela>` o `<component>`.
2. Detectar componentes invocados fuera del tag raíz con cualquier atributo de componente.
3. Generar un error claro y localizado que indique la regla violada y el archivo `.pelela` afectado.
4. Que el error detenga la carga de la página / app (fallo de compilación o renderizado inicial).
5. Agregar tests que cubran tanto casos válidos como inválidos.

## Cambios Propuestos

### 1. Plugin: Validación de alcance de root en `packages/vite-plugin-pelelajs/src/index.ts`

- Renombrar o extender `validateNoForbiddenRootAttributes` hacia una validación más amplia de "uso de directivas fuera del root".
- Agregar función nueva, por ejemplo `validateInternalDirectivesAreInsideRoot`:
  - Usar regex para encontrar el primer root `<pelela|component...>` y su cierre correspondiente.
  - Determinar la zona de plantilla que está fuera de ese root.
  - Buscar en esa zona cualquier uso de:
    - `\bprop-[a-zA-Z0-9_-]+\b`
    - `\blink-[a-zA-Z0-9_-]+\b`
    - `\bconst-[a-zA-Z0-9_-]+\b`
    - `\bbind-[a-zA-Z0-9_-]+\b`
    - `\bfor-each\s*=\s*"` o `\bfor-each\s*=\s*'`
    - `\bif\s*=\s*"` o `\bif\s*=\s*'`
  - Opcional: detectar tags fuera del root que usen alguno de esos atributos y reportar el atributo inválido.
- Si no existe root, el mismo mecanismo debe fallar indicando que esa directiva no puede usarse sin un tag raíz.

### 2. Plugin: Detección de componentes fuera del root

- Identificar tags fuera del root que contienen `prop-`, `link-` o `const-`.
- Esto cubre componentes custom declarados como `<ProductoRow ...>` o `<my-component prop-x="value"></my-component>`.
- Reusar la misma lógica de zona fuera del root para no duplicar la búsqueda.

### 3. Mensajes del error y severidad

- Reusar la clave existente `errors.compiler.forbiddenRootAttribute` para mensajes generales de atributos inválidos en root.
- Si hace falta, proponer una nueva clave `errors.compiler.directiveOutsideRoot` para distinguir el caso específico.
- El mensaje debe incluir:
  - `filePath`
  - `tagName` del root donde debería estar el contenido
  - `attr` o `directive` detectada
  - `snippet` opcional para devolver la línea/fragmento inválido

### 4. Tests unitarios y de integración

- Agregar tests a `packages/vite-plugin-pelelajs/src/index.test.ts`.
- Casos a cubrir:
  1. `.pelela` válido con root `<pelela>` y contenido interno: debe pasar.
  2. `.pelela` válido con root `<component>` y contenido interno: debe pasar.
  3. `.pelela` con `bind-content` en un elemento fuera del root: debe fallar.
  4. `.pelela` con `prop-nombre` en un elemento fuera del root: debe fallar.
  5. `.pelela` con `for-each` e `if` fuera del root: debe fallar.
  6. `.pelela` con componente custom fuera del root usando `prop-`/`link-`/`const-`: debe fallar.
  7. `.pelela` sin root válido y con directivas inyectadas: debe fallar con mensaje de root faltante o inválido.

### 5. Integración con compilación / app bootstrapping

- El plugin de Vite ya inyecta errores de compilación cuando `validatePelelaStructure` falla.
- Asegurarse de que la nueva validación lance error dentro del mismo flujo `load` de `.pelela`.
- El fallo debe impedir que el template se transforme a módulo y que la app avance.

### 6. Opcional: validar también en `packages/core`

- Si el plugin es suficiente para bloquear en build time, no es obligatorio, pero sería ideal un chequeo duplicado en runtime en `packages/core` para casos en los que el template se monte sin pasar por el plugin.
- Este runtime podría vivir en el bootstrap de templates y verificar que cualquier directiva `prop-` / `link-` / `const-` / `bind-` / `for-each` / `if` se encuentre siempre dentro de un root definido.

## Verificación Final

1. Revisar que el nuevo test cubra el error exacto y el mensaje esperado.
2. Confirmar que `packages/vite-plugin-pelelajs/src/index.ts` sigue validando la estructura raíz y la expansión de directivas.
3. Añadir un caso de ejemplo en un test donde el componente custom aparece fuera del `<pelela>` raíz.
4. No ejecutar `pnpm` automáticamente, pero sugerir al revisor:

```bash
pnpm --filter vite-plugin-pelelajs test
pnpm run biome:check
```
