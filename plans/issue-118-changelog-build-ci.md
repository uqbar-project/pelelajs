# Issue #118 — Mejoras al proceso de CHANGELOG + build (deploy desde CI)

Origen: comentarios de @nicovio en el PR #107. Objetivo doble:

1. Que el proceso de release/deploy funcione **directamente desde CI** (quedó incompleto por tiempo).
2. Arreglar el bug donde el `releaseNotes` de la extensión VSCode extrae del `CHANGELOG.md` **raíz** en vez del changelog propio de la extensión.

## Contexto / diagnóstico

- La extensión escribe su changelog en `tools/pelela-vscode/CHANGELOG.md` (vía `open-changelog-editor.ts vscode` y `update-changelog.ts`), pero `releaseNotes` lo extrae de `../../CHANGELOG.md` (raíz). Inconsistencia → notas de release equivocadas.
- Varios scripts del flujo de release son **interactivos** y cuelgan en CI (sin TTY/editor).
- El `version_type` que pasa el workflow no llega a `release-it` en el flujo npm (se pega al último comando de la cadena `&&`).
- Hay config y código duplicado/muerto.

## Decisiones acordadas con el autor

- Borrar `scripts/release-vscode.ts` (código muerto).
- Alinear versiones de las GitHub Actions de deploy con `ci.yml`.
- Validar localmente con `release-it --dry-run` + `act` sobre CI.
- **Requisito explícito: NO eliminar la capacidad de deploy local.** El deploy debe poder hacerse **tanto local como desde CI**.

## Garantía local + CI (requisito clave)

El flujo sigue soportando **ambos** caminos. El mecanismo es el guard `if (process.env.CI)`:
local (`CI` sin setear) conserva el comportamiento interactivo actual; GitHub Actions
setea `CI=true` y solo ahí se toma el camino no-interactivo.

| Cambio | Local (`CI` unset) | CI (`CI=true`) |
|---|---|---|
| `check-npm-auth.ts` | Chequea login y promptea (igual que hoy) | `process.exit(0)`, no cuelga |
| `open-changelog-editor.ts` | Abre el editor `code --wait` (igual que hoy) | Escribe el changelog sin editor (usa `RELEASE_IT_NOTES`) |
| `release-it` | Sin arg → promptea versión | Detecta CI → no-interactivo, recibe `patch/minor/major` |
| publish | Corre igual que hoy | Igual |

Entradas de deploy **local** que se mantienen (documentadas en `docs/publishing/*.md`):

- npm: `pnpm run release:npm`
- vscode: `pnpm run release:vscode`

`scripts/release-vscode.ts` no es parte de estas entradas (ningún script ni doc lo invoca),
por eso borrarlo no afecta el deploy local.

## Bloque 1 — Bug central: releaseNotes de VSCode

1. `tools/pelela-vscode/.release-it.js:15` — apuntar al changelog de la extensión (release-it corre con cwd en `tools/pelela-vscode`):

   ```js
   // antes: 'tsx ../../scripts/extract-changelog.ts ${version} ../../CHANGELOG.md'
   releaseNotes: 'tsx ../../scripts/extract-changelog.ts ${version} CHANGELOG.md'
   ```

2. Borrar `tools/pelela-vscode/.release-it.json` — config duplicada/ambigua con el `.js`. La raíz solo usa `.js`; queda solo el `.js` (consistencia + permite los `biome-ignore`).

## Bloque 2 — Bloqueantes de hang en CI

3. `scripts/check-npm-auth.ts` — guard al inicio (pedido por @nicovio):

   ```js
   if (process.env.CI) process.exit(0)
   ```

   Evita el `readline.question` interactivo que cuelga en CI.

4. `scripts/open-changelog-editor.ts` — refactor:
   - Reusar `updateChangelog()` de `update-changelog.ts` (hoy duplica la lógica de inserción → viola DRY). `updateChangelog` ya respeta `RELEASE_IT_NOTES`.
   - Saltear el editor en CI: abrir `code --wait` solo si `!process.env.CI`. En CI escribe el changelog sin abrir editor.

5. `package.json` (`release:npm`) + `.release-it.js` raíz — el `version_type` cae en el comando equivocado. Hoy `pnpm run release:npm -- patch` pega `patch` al **último** comando de la cadena `&&` (el `pnpm publish`), no a `release-it`, que queda interactivo → cuelga.
   - Mover el publish a un hook `after:release` en `.release-it.js` raíz:

     ```js
     'after:release': ['pnpm --filter pelelajs publish --no-git-checks --access public'],
     ```

   - Dejar `release-it` como **último** comando del script:

     ```json
     "release:npm": "tsx scripts/check-npm-auth.ts && release-it"
     ```

   Así `pnpm run release:npm -- patch` → `release-it patch` (el increment llega bien). release-it detecta `CI=true` y corre no-interactivo. El flujo vscode ya forwardea bien el arg (release-it es el último comando), no se toca.

   Nota: esto **preserva** la decisión histórica de publicar fuera del plugin npm de release-it (`npm.publish: false` se mantiene); solo movemos el publish de la cadena `&&` a un hook `after:release`, que corre en el mismo punto del ciclo. Local sin arg sigue prompteando la versión y abriendo el editor del changelog.

   El comando de publish pasa de `pnpm --filter pelelajs publish` a **`npm publish packages/core --access public`** (ver Bloque 6).

## Bloque 3 — Limpieza

6. Borrar `scripts/release-vscode.ts` — código muerto (ningún npm script lo invoca; `deploy-vscode` usa `release-it` directo).

7. Alinear versiones de GitHub Actions con `ci.yml`:
   - `deploy-npm.yml`: `checkout@v4→v6`, `setup-node@v4→v6`, `node-version: 22 → node-version-file: '.nvmrc'` (conservando `registry-url`). pnpm action-setup ya en v6.
   - `deploy-vscode.yml`: `pnpm/action-setup@v4 (version: 10) → @v6` (lee `packageManager: pnpm@11.3.0`), `checkout@v4→v6`, `setup-node@v4→v6`, `node-version → node-version-file: '.nvmrc'`. Elimina el riesgo de mismatch con `--frozen-lockfile`.

   `.nvmrc` = `22.18.0`.

## Bloque 4 — Tests (AGENTS: cobertura >90%, tests como documentación)

8. Verificar que `test/update-changelog.test.ts` y `test/generate-summary.test.ts` sigan pasando (el refactor de open-changelog delega en `updateChangelog`, API intacta). Agregar test del branch CI de `open-changelog-editor` si se puede aislar la lógica de escritura del editor.

## Bloque 5 — Validación local (release-it --dry-run + act CI)

`act` ya está cableado (`.actrc` con imagen `catthehacker/ubuntu`, script `ci:act`).

- CI: `pnpm ci:act` (Docker) o `pnpm ci:local` (sin Docker, más rápido).
- Deploy sin publicar:
  - npm: `pnpm -w release-it --dry-run patch`
  - vscode: `pnpm -C tools/pelela-vscode release-it --dry-run patch`

  Loguea los pasos sin pushear ni publicar.

> AGENTS.md prohíbe correr `pnpm`/`git`/`act` sin autorización: estos comandos los corre el humano (o se pide OK explícito). El linter/test se piden con `pnpm run biome:check` y `pnpm run test --run`.

## Bloque 6 — Publish a npm vía OIDC Trusted Publishing (resuelto)

Decisión: **OIDC only**, publicando con **`npm publish`** (no pnpm). Confirmado:
el Trusted Publisher ya está creado en npmjs.com para `uqbar-project/pelelajs` con
permiso `npm publish`, y el paquete tiene "Require 2FA **and disallow tokens**" → los
tokens no son una opción, OIDC es el único camino válido (y el más seguro: sin secretos,
credencial efímera por run).

Por qué `npm` y no `pnpm`: `npm` es la implementación de referencia de trusted publishing
y es menos estricto. pnpm soporta OIDC recién en versiones recientes, pero el proyecto usa
`pnpm@11.3.0` (anterior). Dejamos pnpm para install/build/test y solo el publish final usa npm.

Requisitos (estado): `id-token: write` ✅, `npm install -g npm@latest` (≥11.5.1) ✅,
Node ≥22.14.0 (`.nvmrc`=22.18.0) ✅. Con trusted publishing la provenance es automática
(no hace falta `--provenance`).

Cambios:

9. **Cambiar el publish** (en el hook `after:release` del `.release-it.js` raíz, ver Bloque 2.5):

   ```js
   // antes: 'pnpm --filter pelelajs publish --no-git-checks --access public'
   'after:release': ['npm publish packages/core --access public'],
   ```

   `npm publish <folder>` empaqueta y publica el paquete de esa carpeta; corre con cwd en
   la raíz (donde release-it ejecuta los hooks). Detecta el entorno OIDC de GitHub Actions
   automáticamente.

10. **Agregar `repository` (+ `homepage`, `bugs`) a `packages/core/package.json`** — la
    provenance/OIDC lo requieren y hoy falta. Espejar lo que ya tiene la extensión vscode:

    ```json
    "repository": { "type": "git", "url": "https://github.com/uqbar-project/pelelajs", "directory": "packages/core" },
    "homepage": "https://github.com/uqbar-project/pelelajs",
    "bugs": { "url": "https://github.com/uqbar-project/pelelajs/issues" }
    ```

11. **Alinear el nombre del workflow con el Trusted Publisher.** En npmjs.com el trusted
    publisher estaba configurado para `deploy.yml`, pero el repo tiene `deploy-npm.yml`. OIDC
    matchea el nombre de archivo exacto → con el mismatch el publish falla (403 / no matching
    trusted publisher).

    **Decisión (B): el workflow conserva el nombre `deploy-npm.yml`** y el autor **edita el
    Trusted Publisher en npmjs.com** para que apunte a `deploy-npm.yml`. No se renombra ningún
    archivo en el repo. Es una acción manual fuera del repo (un clic en npmjs.com).

> vscode (Marketplace/OpenVSX) **no** soporta OIDC: sigue con `VSCE_PAT`/`OVSX_PAT` como
> secrets (ya configurados). OIDC es solo para npm.

### Nota sobre deploy local con "disallow tokens"

Como el paquete deshabilita tokens, el publish manual local exige login interactivo con 2FA
(OTP). El flujo local (`pnpm run release:npm` → `check-npm-auth` → `release-it` → `npm publish`)
sigue funcionando: `npm publish` pide el OTP por consola. No se pierde la capacidad de deploy local.

## Resumen de archivos a tocar

- Editar: `tools/pelela-vscode/.release-it.js`, `scripts/check-npm-auth.ts`, `scripts/open-changelog-editor.ts`, `package.json`, `.release-it.js`, `packages/core/package.json` (campo `repository`), `.github/workflows/deploy-npm.yml`, `.github/workflows/deploy-vscode.yml`
- Borrar: `tools/pelela-vscode/.release-it.json`, `scripts/release-vscode.ts`
- Tests: revisar/ajustar `test/update-changelog.test.ts`, `test/generate-summary.test.ts` (+ posible test del branch CI de open-changelog)
- Acción manual fuera del repo (autor): editar el Trusted Publisher en npmjs.com → workflow `deploy-npm.yml` (no se renombra ningún archivo)
