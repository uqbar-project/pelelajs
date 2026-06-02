# Plan para resolver Issue #112: Mejoras en el comando Rename del CLI

Este plan detalla los pasos para mejorar la validación y el comportamiento del comando `rename` en el CLI de Pelela, asegurando que se sigan las convenciones de nomenclatura y se manejen correctamente las dependencias como `routes.ts`.

## 1. Validación de Nombres de Componente

Actualmente, el comando `rename` valida que el nuevo nombre siga el formato CamelCase, pero no lo hace estrictamente para el nombre antiguo.

- **Acción**: Actualizar `renameCommand` en `tools/pelela-cli/src/commands/rename.ts` para validar que tanto `oldComponentName` como `newComponentName` cumplan con la expresión regular `/^[A-Z][a-zA-Z0-9]*$/` (en su parte final/basename).
- **Justificación**: Los componentes en Pelela siempre deben empezar con mayúscula y seguir CamelCase.

## 2. Claridad en la Interfaz del CLI

Mejorar la definición del comando para que los parámetros sean más descriptivos.

- **Acción**: En `tools/pelela-cli/src/index.ts`, cambiar la definición del comando:
  ```typescript
  program
    .command('rename <oldComponentName> <newComponentName>')
  ```
- **Nota**: Asegurar que los mensajes de ayuda y descripciones reflejen esta nomenclatura.

## 3. Pruebas de Validación de Nomenclatura

Garantizar que el CLI falle si no se respeta el CamelCase.

- **Acción**: Agregar casos de prueba en `tools/pelela-cli/test/commands/rename.test.ts` que:
  - Intenten renombrar un componente usando un nombre antiguo en minúsculas.
  - Intenten asignar un nuevo nombre en minúsculas.
  - Verifiquen que se lance el error esperado (`commands.rename.error.nameInvalid`).

## 4. Manejo de `routes.ts`

Verificar que las referencias en el archivo de rutas se actualicen correctamente.

- **Acción**: El mecanismo actual `updateImports` ya recorre todos los archivos `.ts` y `.js`. Debemos verificar específicamente (o agregar un test) que si existe un archivo `routes.ts`, su contenido se actualice con el nuevo nombre del componente y su nueva ruta de importación.
- **Detalle**: Si el archivo `routes.ts` no se encuentra o no contiene el import, el proceso debe continuar sin fallar (comportamiento actual de `replaceComponentUsage`).

## 5. Resiliencia en la Actualización de Imports

- **Acción**: Asegurar que si la lógica de `updateImports` no puede resolver un renombre de import específico (por ejemplo, en `routes.ts` debido a un formato inesperado), el comando no aborte la operación completa de renombrado de archivos, sino que informe o simplemente continúe de forma segura.

---
**Prioridad**: Alta
**Estado**: Pendiente de implementación
