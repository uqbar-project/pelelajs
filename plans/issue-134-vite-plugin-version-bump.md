# Plan: Issue #134 — Deploy del vite-plugin-pelelajs no hace bump de versión

## Diagnóstico

En `.release-it.js:25`, el hook `after:bump` solo actualiza la versión del paquete **core** (`pelelajs`):

```js
'pnpm --filter pelelajs version ${version} --no-git-tag-version --no-git-checks',
```

Pero **no hay una línea equivalente para `vite-plugin-pelelajs`**. Por eso, cuando `release:npm` ejecuta:

```
pnpm --filter vite-plugin-pelelajs publish --no-git-checks --access public
```

publica con la **versión vieja** del `package.json` (actualmente `0.7.1`), ya que nunca se bumpió.

## Cambios necesarios

**Archivo:** `.release-it.js` — hook `after:bump`

Agregar una linea que bumpée la versión del `vite-plugin-pelelajs`:

```
'pnpm --filter vite-plugin-pelelajs version ${version} --no-git-tag-version --no-git-checks',
```

Y opcionalmente agregar el `package.json` modificado al stage de git:

```
'git add packages/vite-plugin-pelelajs/package.json',
```

El hook quedaría así:

```js
'after:bump': [
  'tsx scripts/open-changelog-editor.ts npm',
  'pnpm --filter pelelajs version ${version} --no-git-tag-version --no-git-checks',
  'pnpm --filter vite-plugin-pelelajs version ${version} --no-git-tag-version --no-git-checks',
  'cp CHANGELOG.md packages/core/CHANGELOG.md',
  'git add packages/core/CHANGELOG.md',
  'git add packages/vite-plugin-pelelajs/package.json',
  'pnpm run build',
],
```

## No hacer

- ❌ No crear CHANGELOG.md para vite-plugin — no necesita changelog propio.
- ❌ No tocar el workflow de GitHub Actions — el CI solo invoca el script.

## Validación

No hay tests para `.release-it.js`. Validación manual:
1. Ejecutar `pnpm run release:npm -- patch` (o dry-run de release-it)
2. Verificar que `packages/vite-plugin-pelelajs/package.json` versión se bumpée junto con core
3. `git status` debe mostrar ambos cambios stageados
