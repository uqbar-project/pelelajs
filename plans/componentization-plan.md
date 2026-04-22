# Implementación de Componentización en PelelaJS

Este plan aborda la inclusión de componentes y pasaje de propiedades unidireccionales y bidireccionales en PelelaJS, enfocados en mantener el MVC, y la prioridad conceptual y mantenibilidad.

## Cambios Propuestos

### Componente `vite-plugin-pelelajs`

- **Soporte de Etiquetas raíz `<component>`**: Se modificará el validador en `index.ts` para que un archivo `.pelela` pueda usar como raíz tanto `<pelela view-model="...">` como `<component view-model="...">`. Esto es importante porque los componentes que se diseñan para reutilizarse podrán diferenciarse sintácticamente de la aplicación raíz.
- **Detección y Error de Sintaxis de Otros Frameworks**: La única forma admitida de trabajo en PelelaJS es utilizando comillas dobles regulares (`""`) para sus atributos y values. No se pre-procesa código TS en el template. El plugin de Vite se encargará de incluir expresiones regulares que detecten estrictamente sintaxis prestada (como la interpolación `{{ }}` de Angular/Vue o el syntax de corchetes `[...]="..."`). En el momento en que un estudiante intente utilizar cualquiera de estas formas, la compilación de Vite fallará con un error descriptivo indicando que esto no es válido en el framework.

---

### Componente `packages/core`

#### [MODIFICAR] `packages/core/src/registry/viewModelRegistry.ts` (o similar)
Se independizará el registro de componentes (actualmente en `router/componentRegistry.ts`) y se moverá a `src/registry` o `src/bootstrap`. Esto permitirá que los componentes reutilizables se definan y consuman globalmente, en cualquier lugar y en múltiples rutas de la aplicación.

#### [NUEVO] `packages/core/src/bindings/bindComponent.ts`
Implementará la lógica para atar Custom Tags a los Componentes registrados en la aplicación:
1. Buscará etiquetas DOM que coincidan con los nombres de componentes registrados, utilizando consistencia en formato **kebab-case** (ej. `<validation-field>`).
2. Instanciará el ViewModel hijo (`new componentCtor()`).
3. Evaluará los atributos de la etiqueta usada:
   - **Binding Unidireccional (implícito)**: Los atributos regulares como `desde="valorInicial"` o `hasta="totalProductos"` asumirán que apuntan directamente a variables/propiedades del ViewModel padre. Se establecerá una suscripción del padre al hijo; no se admitirán literales hardcodeados.
   - **Binding Bidireccional (`link-*`)**: Para atributos como `link-valor="itemSeleccionado"`, se registrarán observadores en ambos sentidos usando los Proxies nativos para sincronizar los ViewModels padre e hijo.
4. Renderizará usando `mountTemplate` o instanciando los inner text recursivamente y lo inyectará en `<validation-field>`.
5. Acoplará el lifecycle a la jerarquía, si fuese necesario.

#### [MODIFICAR] `packages/core/src/bindings/setupBindings.ts`
Se agregará la ejecución del evaluador de Componentes (es decir, la invocación de `bindComponent.ts` dentro de la etapa de evaluación de directivas inicial), asegurando que los subcomponentes se procesen antes de los inner text si correspondiera.

## Resoluciones de Diseño Confirmadas

1. **Tag raíz de archivos:** Se establece una diferenciación conceptual clara: la etiqueta `<pelela>` se usará para páginas/roots, mientras que la etiqueta `<component>` se reserva expresamente para componentes reutilizables.
2. **Convención Visual:** Se adoptará el uso del formato `kebab-case` (`<mi-componente />`) por ser más consistente con los estándares web y evitar amigüedades.
3. **Propiedades Claras:** Todo atributo (unidireccional) pasado a un tag de componente asume que su valor es una propiedad del ViewModel emisor, simplificando la evaluación.
4. **Unica Sintaxis Admitida - Cero Expresiones:** Queda terminantemente prohibido el uso de lógicas de binding de otros frameworks (como `{{...}}` de Angular o el property binding de atributos `[...]="..."`). La única convención permitida es emplear strings crudos cerrados en comillas para pasar las propiedades a un componente (`<Contador desde="valor" />`); la resolución interna se hace del lado del ViewModel. El compilador de Vite estará preparado para "atajar" a los alumnos confundidos y abortar la compilación indicando el problema si se usan esos símbolos.
5. **Component Registry Global:** El registro vivirá independientemente del Router, permitiendo la libre reutilización en cualquier rincón del DOM de PelelaJS.

## Ejemplo Práctico (Caso de Validación)

Como parte de la entrega, se creará un proyecto de ejemplo específico (por ejemplo, dentro de la carpeta `examples/components`) para demostrar y probar empíricamente las capacidades desarrolladas. El escenario contará con:

1. **Página Principal (Padre):**
   - Un root `<pelela ...>` que mantiene en su estado un arreglo de Personas y un contador con el índice seleccionado actual.
   - Renderizará una iteración `for-each` de las personas y comunicará el índice hacia el componente de contador.

2. **Componente Persona (`<persona-row>` o similar):**
   - Recibe la persona a ilustrar y el requerimiento de si está `seleccionada`.
   - Modifica dinámicamente sus clases; si la persona en cuestión es la seleccionada, se resalta su UI con un color principal.

3. **Componente Contador (`<contador>`):**
   - Su template se compone de un botón de restar (`-`), un label mostrando su valor actual, y un botón de sumar (`+`).
   - Poseerá un valor de arranque pasado desde el padre (por defecto 1).
   - Utilizará el modificador asíncrono/bidireccional `link-valor="indiceSeleccionado"`. Cuando un evento de `click` cambie el estado dentro del contador, este informará automáticamente al padre, causando que la Página Principal se vuelva a renderizar reactivamente y seleccione una persona distinta en el listado superior.
