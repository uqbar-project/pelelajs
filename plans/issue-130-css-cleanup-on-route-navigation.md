# Plan para resolver Issue #130: CSS cleanup al navegar entre rutas

## Problema
Los CSS se van agregando dinámicamente cada vez que se carga una página Pelela, lo cual tiene efectos inesperados. Cuando se navega entre páginas, los CSS se van acumulando en el DOM y pisan definiciones anteriores si tienen definiciones similares muy genéricas.

## Diagnóstico
El vite-plugin-pelelajs genera automáticamente imports de CSS para cada componente `.pelela` si existe un archivo `.css` correspondiente (función `getCssImport` en `index.ts`). Estos imports se ejecutan cada vez que se monta un componente, pero no se eliminan cuando se desmonta, causando acumulación de estilos.

## Solución propuesta

### Paso 1: Agregar archivos CSS específicos por página en examples/routing
- **Acción**: Crear `home.css` y `detail.css` en `examples/routing/src/`
- **Archivos a crear**:
  - `examples/routing/src/home.css`: Definiciones específicas para la página Home (ej: estilos para botones, lista de usuarios)
  - `examples/routing/src/detail.css`: Definiciones específicas para la página Detail (ej: estilos para avatar, detalle de usuario)
- **Confirmación requerida**: ¿Proceder a crear los archivos CSS?

### Paso 2: Agregar definiciones comunes por tag en home.css y detail.css
- **Acción**: Agregar definiciones CSS que compartan tags comunes para demostrar el problema
- **Ejemplo de definiciones**:
  - `home.css`: Estilos para `h1`, `button` (común con detail.css), y estilos específicos para `ul`, `li`
  - `detail.css`: Estilos para `h1`, `button` (común con home.css), y estilos específicos para `img`, `p`
- **Confirmación requerida**: ¿Proceder a agregar las definiciones CSS?

**IMPORTANTE**: Después de completar el Paso 2, debo esperar a que el usuario testee el ejemplo para verificar que el problema se reproduce (los CSS se acumulan y pisan definiciones). NO avanzar al Paso 3 sin confirmación del usuario.

### Paso 3: Implementar mecanismo de limpieza de CSS en router
- **Acción**: Modificar `packages/core/src/router/router.ts` para limpiar CSS de la ruta anterior al navegar, sin requerir cambios manuales en los ejemplos
- **Archivo**: `/Users/fernando/workspace/algo3/pelelajs/packages/core/src/router/router.ts`
- **Cambios**:
  1. Agregar un `Set` para trackear los CSS asociados a la ruta actual mediante la metadata que provea el plugin
  2. Modificar `renderPath` para:
     - Remover los CSS asociados a la ruta anterior antes de montar la nueva
     - Agregar los CSS asociados a la ruta actual
  3. Modificar `resetRouter` para limpiar el `Set` de CSS asociados
- **Nota**: El router debe funcionar con CSS auto-importados desde los `.ts` de Pelela sin que los ejemplos llamen manualmente a `registerCss`.
- **Confirmación requerida**: ¿Proceder a modificar router.ts?

### Paso 4: Modificar vite-plugin para interceptar imports CSS
- **Acción**: Modificar `packages/vite-plugin-pelelajs/src/index.ts` para detectar e inyectar automáticamente los imports de CSS asociados a los componentes Pelela
- **Archivo**: `/Users/fernando/workspace/algo3/pelelajs/packages/vite-plugin-pelelajs/src/index.ts`
- **Cambios**:
  1. Detectar imports de archivos `.css` en los módulos de Pelela durante la transformación
  2. Exponer metadata que indique qué CSS pertenece a cada componente o página cargada por el router
  3. Asegurar que esta metadata se use para cargar y limpiar estilos sin cambios manuales en los ejemplos
- **Nota**: No se debe basar en atributos `data-*` en `<link>`; la identificación debe ocurrir a partir de la intercepción de imports CSS en Vite.
- **Confirmación requerida**: ¿Proceder a modificar el vite-plugin?

### Paso 5: Crear tests para el cleanup de CSS
- **Acción**: Crear tests en `packages/core/src/router/router.test.ts` para verificar que los CSS se limpian correctamente
- **Archivo**: `/Users/fernando/workspace/algo3/pelelajs/packages/core/src/router/router.test.ts`
- **Tests a crear**:
  1. Test que verifica que los CSS asociados a la ruta anterior se remueven al navegar
  2. Test que verifica que los CSS globales no se eliminan
  3. Test que verifica que los CSS asociados a la ruta actual se aplican correctamente
- **Confirmación requerida**: ¿Proceder a crear los tests?

### Paso 6: Ejecutar tests, linter y build
- **Acción**: Solicitar al usuario que ejecute `pnpm run biome:check`, `pnpm run typecheck`, `pnpm run test --run` y `pnpm build` para verificar que no se rompió nada y que los cambios se vean reflejados en el build
- **Confirmación requerida**: ¿Ejecutar tests, linter y build?

### Paso 7: Verificar que el ejemplo funcione
- **Acción**: Ejecutar el ejemplo de routing y verificar que:
  1. Los CSS de Home se cargan al navegar a `/`
  2. Los CSS de Detail se cargan al navegar a `/users/:id`
  3. Los CSS de Home se remueven al navegar de Detail a Home
  4. El `styles.css` global se mantiene en todo momento
- **Confirmación requerida**: ¿El ejemplo funciona correctamente?