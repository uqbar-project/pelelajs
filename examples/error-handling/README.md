# Manejo de errores: view models inválidos con routing

Este ejemplo muestra qué pasa cuando el view model de una ruta está mal declarado. Hay 4 casos, uno por archivo en `src/`:

- `bad-viewmodel-object`: el view model es un objeto (`export const BadViewmodelObject = {}`), no una clase.
- `bad-viewmodel-function`: el view model es una función (`export const BadViewmodelFunction = () => {}`), no una clase.
- `bad-viewmodel-no-export`: la clase existe pero le falta `export`.
- `bad-viewmodel-not-found`: el template pide `BadViewmodelMissing`, que no existe en el módulo.

## Cómo probarlos

1. Levantá el ejemplo con `pnpm run dev`.
2. En `routes.ts`, descomentá **un solo caso por vez** (el `import` y su ruta).
3. Guardá y mirá el overlay de Vite (en desarrollo) o la página de error: el mensaje describe el problema exacto en lugar del `RoutingError` genérico o una pantalla en blanco.
4. Compará con el mensaje que muestra la extensión de VS Code sobre el mismo archivo: es el mismo texto.
5. Volvé a comentar el caso antes de probar el siguiente.

## Por qué están comentados

Cada caso rompe el build a propósito (esa es la idea del *fail fast*: fallar rápido con un mensaje claro). Si se habilita más de uno a la vez, el primero que falle tapa a los demás.

## Dónde aparece cada error

- Casos 1 y 2 (objeto o función): los captura el router y se ven en la página de error de Pelela.
- Casos 3 y 4 (falta `export` o la clase no existe): el `import` rompe el grafo de módulos del navegador antes de que la app arranque, así que solo el plugin puede avisar: se ven en el overlay de Vite (en desarrollo) o como error de build (en producción), con el mismo texto.

## Si ves `ReferenceError: X is not defined`

Descomentaste la ruta pero no su `import`. Sin el `import`, el nombre no existe: es JavaScript estándar, no un error de Pelela. Descomentá ambas líneas.
