# Plan: Ejemplo de carga dinámica de CSS de hijos en router

## Objetivo

Crear un ejemplo en `examples/css-child-test/` que permita probar visualmente que:
- Al navegar a una ruta, se cargan los CSS del componente de ruta Y de sus subcomponentes hijos
- Al navegar a otra ruta, los CSS anteriores se descargan y se cargan los nuevos
- Los estilos se aplican correctamente en el DOM

## Estructura

```
examples/css-child-test/
├── index.html
├── main.ts                    # Solo auto-register, sin defineComponent manual
├── routes.ts                  # / → Home, /detail → Detail
├── package.json / vite.config.ts / tsconfig.json / pelela-env.d.ts / .npmrc
└── src/
    ├── styles.css              # Estilos globales
    ├── home.ts / home.pelela   # Ruta "/", renderiza <widget-a>
    ├── detail.ts / detail.pelela  # Ruta "/detail", renderiza <widget-b>
    ├── widget-a.ts / widget-a.pelela / widget-a.css  # Hijo con CSS (borde verde)
    └── widget-b.ts / widget-b.pelela / widget-b.css  # Hijo con CSS (borde azul)
```

## Mecanismo

1. **Auto-register** (`import 'virtual:pelela-auto-register'`) escanea `src/`, encuentra `.ts` + `.pelela` + `.css` y genera `defineComponent` con `cssUrls`.
2. El Vite plugin genera `new URL("./widget-a.css", import.meta.url).href` en el módulo `.pelela`.
3. Vite resuelve `new URL()` — en dev mode sirve el archivo directo, en build lo emite como asset separado.
4. El router llama `collectChildComponentCssUrls()` que escanea el template en busca de tags de componentes hijos y recolecta sus `cssUrls`.
5. `renderPath` inyecta los `<link>` en el `<head>` y los remueve al navegar a otra ruta.

## Problema detectado

En **production build**, Vite inlinea assets <4KB como data URLs (`data:text/css;base64,...`). Los browsers **no aceptan** data URLs en `<link rel="stylesheet">`, por lo que el CSS no se aplica.

**Solución:** Configurar `build.assetsInlineLimit` en `vite.config.ts` para que NO inlinee archivos `.css`:

```typescript
build: {
  assetsInlineLimit: (filePath: string) => {
    if (filePath.endsWith('.css')) return false
  },
}
```

## Tests

### Vite plugin (`packages/vite-plugin-pelelajs/src/index.test.ts`)
- El test existente "includes css import when matching css file exists" (línea 279) ya verifica que `getCssImport` genera el export de `__pelelaCssUrls`. No requiere cambios.
- El test "generates registration code with cssUrls when component has adjacent css file" (línea 170) ya verifica el auto-register. No requiere cambios.

### Router (`packages/core/src/router/router.test.ts`)
- Los tests "should load CSS from child components used in a route template" y "should remove child component CSS when navigating to a different route" ya cubren el lifecycle. No requieren cambios (usan paths literales, no el plugin).

## Pasos de implementación

1. ✅ Crear estructura de directorios y archivos del ejemplo
2. ✅ main.ts con auto-register (sin defineComponent manual)
3. ✅ CSS en src/ junto a cada .pelela
4. ✅ Home con botón a /detail, Detail con botón a /home
5. 🔲 Agregar `build.assetsInlineLimit` al vite.config.ts
6. 🔲 Verificar que `pnpm run dev` funciona y los CSS se cargan/descargan
7. 🔲 Ejecutar tests del plugin y del router
