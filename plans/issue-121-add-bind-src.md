# Plan: Agregar bind-src para tags img (Issue #121)

## Contexto
Se requiere implementar una nueva directiva de binding `bind-src` específicamente para elementos `<img>`. Esto permitirá actualizar dinámicamente el atributo `src` de las imágenes desde el ViewModel, algo fundamental para ejemplos como el de países (mostrar banderas).

## Requerimientos
1. Validar que `bind-src` solo se use en tags `<img>`.
2. Integrar la directiva en el motor de reactividad de PelelaJS.
3. Agregar soporte de resaltado de sintaxis en la extensión de VSCode.
4. Incluir un ejemplo de uso en el sistema de routing.
5. Garantizar cobertura de tests unitarios.

## Cambios Propuestos

### 1. Core: Estructura y Tipado
- **Archivo:** `packages/core/src/bindings/types.ts`
  - Definir `SrcBinding` (usando `HTMLImageElement`).
  - Agregar `srcBindings: SrcBinding[]` a `BindingsCollection`.
- **Archivo:** `packages/core/src/errors/PropertyValidationError.ts`
  - Agregar `'bind-src'` al tipo `BindingKind`.

### 2. Core: Lógica de Binding
- **Nuevo Archivo:** `packages/core/src/bindings/bindSrc.ts`
  - Implementar `setupSrcBindings`:
    - Buscar elementos con `[bind-src]`.
    - Validar que el elemento sea `HTMLImageElement`. Si no, lanzar error `srcOnlyForImg`.
    - Usar `assertViewModelProperty` para validar la propiedad en el ViewModel.
  - Implementar `renderSrcBindings`:
    - Actualizar `element.src` solo si el valor del ViewModel cambió.

### 3. Core: Integración
- **Archivo:** `packages/core/src/bindings/setupBindings.ts`
  - Importar `setupSrcBindings` y `renderSrcBindings`.
  - Registrar en `setupBindings` para la inicialización.
  - Registrar la dependencia en `registerAllBindingDependencies`.
  - Agregar a `executeRenderPipeline`.

### 4. Internacionalización (i18n)
- **Archivo:** `packages/core/src/commons/locales/translationSchema.ts`
  - Agregar `srcOnlyForImg` al esquema.
- **Archivos:** `packages/core/src/commons/locales/es.ts` y `en.ts`
  - Agregar las traducciones correspondientes para el error de validación de tag.

### 5. Herramientas: Pelela VSCode
- **Archivo:** `tools/pelela-vscode/syntaxes/pelela.tmLanguage.json`
  - Agregar `bind-src` a los patrones de atributos para el resaltado de sintaxis.

### 6. Ejemplo en Routing
- **Archivo:** `packages/core/src/router/router.test.ts` (u otro test de integración de routing)
  - Modificar un componente de ejemplo para incluir una imagen con `bind-src` (ej: una bandera en una lista de países).

### 7. Verificación (Testing)
- **Nuevo Archivo:** `packages/core/src/bindings/bindSrc.test.ts`
  - Test: Actualización reactiva del `src`.
  - Test: Error al usar en tags no permitidos.
  - Test: Manejo de valores nulos o indefinidos.

## Verificación Final
Ejecutar:
```bash
pnpm run test packages/core/src/bindings/bindSrc.test.ts
pnpm run biome:check
```
