# Plan para resolver Issue #131: bind-src no funciona en el contexto de un for-each

## Análisis del problema

Confirmado el diagnóstico del issue: `bind-src` funciona en el elemento raíz pero NO dentro de elementos creados por `for-each` porque `setupBindingsForElement` (en `bindForEach.ts`) no configura ni renderiza `srcBindings`, mientras que `setupBindings` (en `setupBindings.ts`) sí lo incluye.

## Plan de resolución con pasos de confirmación

### **Paso 1: Modificar imports en bindForEach.ts**
- **Acción**: Agregar imports de `setupSrcBindings` y `renderSrcBindings` desde `./bindSrc`
- **Archivo**: `/Users/fernando/workspace/algo3/pelelajs/packages/core/src/bindings/bindForEach.ts`
- **Línea**: Agregar al inicio del archivo junto con los otros imports (líneas 18-24)
- **Confirmación requerida**: ¿Proceder con agregar los imports?

### **Paso 2: Agregar srcBindings al objeto bindings en setupBindingsForElement**
- **Acción**: Agregar `srcBindings: setupSrcBindings(element, viewModel)` al objeto `bindings` en la función `setupBindingsForElement` (líneas 92-98)
- **Archivo**: `/Users/fernando/workspace/algo3/pelelajs/packages/core/src/bindings/bindForEach.ts`
- **Confirmación requerida**: ¿Proceder con agregar srcBindings al objeto bindings?

### **Paso 3: Agregar renderSrcBindings a la función de renderizado**
- **Acción**: Agregar `renderSrcBindings(bindings.srcBindings, viewModel)` en la función de retorno de `setupBindingsForElement` (líneas 101-108)
- **Archivo**: `/Users/fernando/workspace/algo3/pelelajs/packages/core/src/bindings/bindForEach.ts`
- **Confirmación requerida**: ¿Proceder con agregar el renderizado de srcBindings?

### **Paso 4: Crear tests para bind-src dentro de for-each**
- **Acción**: Crear tests en `bindForEach.test.ts` para verificar que `bind-src` funciona correctamente dentro de elementos creados por `for-each`
- **Archivo**: `/Users/fernando/workspace/algo3/pelelajs/packages/core/src/bindings/bindForEach.test.ts`
- **Tests a crear**:
  1. **Test básico**: bind-src funciona dentro de for-each con propiedades simples del item (ej: `item.imagen`)
  2. **Test de propiedades anidadas**: bind-src funciona con propiedades anidadas del item (ej: `item.profile.avatar`)
  3. **Test de reactividad**: bind-src se actualiza cuando cambia la propiedad del item en el array
  4. **Test de null/undefined**: bind-src maneja null/undefined dentro de for-each (remueve el atributo src)
  5. **Test con array dinámico**: bind-src funciona correctamente cuando el array crece (agregar items) o se reduce (remover items)
  6. **Test con index**: bind-src funciona cuando se usa el atributo index en for-each
- **Confirmación requerida**: ¿Proceder con crear los tests en bindForEach.test.ts?

### **Paso 5: Crear ejemplo en examples/for-each**
- **Acción**: Crear un nuevo ejemplo en el ejemplo for-each que demuestre `bind-src` funcionando dentro de `for-each`
- **Archivos a modificar/crear**:
  - Modificar `/Users/fernando/workspace/algo3/pelelajs/examples/for-each/src/app.ts` para agregar datos con imágenes
  - Modificar `/Users/fernando/workspace/algo3/pelelajs/examples/for-each/src/app.pelela` para agregar el ejemplo con for-each y bind-src
- **Confirmación requerida**: ¿Proceder con crear el ejemplo en examples/for-each?

### **Paso 6: Build del proyecto**
- **Acción**: Solicitar al usuario que ejecute `pnpm build` para que los cambios se vean reflejados en el build
- **Confirmación requerida**: ¿Ejecutar build?

### **Paso 7: Verificar que el ejemplo funcione**
- **Acción**: Revisar que el ejemplo creado sea correcto y siga las reglas de AGENTS.md (código en inglés, documentación en español para alumnos)
- **Confirmación requerida**: ¿El ejemplo es correcto?

### **Paso 8: Ejecutar tests y linter**
- **Acción**: Solicitar al usuario que ejecute `pnpm run biome:check`, `pnpm run typecheck` y `pnpm run test --run` para verificar que no se rompió nada
- **Confirmación requerida**: ¿Ejecutar tests y linter?
