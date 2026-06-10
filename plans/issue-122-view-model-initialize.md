# Plan: Agregar mecanismo de `initialize()` para el View Model (Issue #122)

## Contexto
Actualmente, los ViewModels solo tienen el `constructor` para inicializar estado. Sin embargo, en el `constructor`, `this` apunta a la instancia cruda, no al Proxy reactivo (que se crea *después* de la instanciación). Esto impide realizar llamadas asincrónicas (ej: `fetch`) que actualicen la UI automáticamente al completarse, ya que las asignaciones a `this` dentro de una promesa no son interceptadas por el Proxy.

Se propone agregar un método opcional `initialize()` que el framework invocará automáticamente **después** de crear el Proxy reactivo, permitiendo inicializaciones asincrónicas reactivas.

## Cambios Propuestos

### 1. Core: Definición de Interfaz
- **Archivo:** `packages/core/src/types.ts`
  - Agregar el método opcional `initialize?: () => void | Promise<void>` a la definición de lo que puede ser un ViewModel.

### 2. Core: Invocación en Bootstrap (Root components)
- **Archivo:** `packages/core/src/bootstrap/bootstrap.ts`
  - Localizar el punto donde se crea `reactiveInstance`.
  - Después de asignar `render = setupBindings(...)`, verificar si `reactiveInstance` tiene el método `initialize`.
  - Si existe, invocarlo: `reactiveInstance.initialize?.()`.

### 3. Core: Invocación en BindComponent (Child components)
- **Archivo:** `packages/core/src/bindings/bindComponent.ts`
  - Localizar el punto en `setupComponentBindings` donde se crea el `reactiveInstance` del componente hijo.
  - Después de completar el setup y asignar `renderChild`, verificar e invocar `reactiveInstance.initialize?.()`.

### 4. Ejemplo de Uso y Verificación Manual (PokeAPI)
- **Archivo:** `examples/routing/src/detail.ts`
  - Agregar propiedad `favoritePokemonName: string`.
  - Implementar `async initialize()`:
    - Realizar un `fetch` a `https://pokeapi.co/api/v2/pokemon/${this.id}/`.
    - Al obtener la respuesta, actualizar `this.favoritePokemonName = data.name`.
- **Archivo:** `examples/routing/src/detail.pelela`
  - Mostrar el nombre del pokemon favorito: `<p>Pokemon favorito: <strong bind-content="favoritePokemonName">Cargando...</strong></p>`.
  - Esto validará que la actualización asincrónica dentro de `initialize()` dispara el re-renderizado correctamente a través del Proxy.

### 5. Verificación Automática (Tests)
- **Archivo:** `packages/core/src/bootstrap/bootstrap.test.ts`
  - Agregar test: Verificar que `initialize()` es llamado al bootstreapear.
- **Archivo:** `packages/core/src/bindings/bindComponent.test.ts`
  - Agregar test: Verificar que `initialize()` es llamado en componentes hijos.
- **Archivo:** `packages/core/src/reactivity/initialize.test.ts` (Nuevo)
  - Test: Verificar que las actualizaciones dentro de un `initialize()` asincrónico disparan re-renders.

---

## Próximos Pasos (Pendiente OK)
1. **Paso 1:** Modificar `packages/core/src/types.ts` y `bootstrap.ts`.
2. **Paso 2:** Modificar `packages/core/src/bindings/bindComponent.ts`.
3. **Paso 3:** Actualizar ejemplo en `examples/routing`.
4. **Paso 4:** Agregar y ejecutar tests.
