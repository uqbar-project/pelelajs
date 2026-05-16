# Plan de Implementación: Automatización de Releases con `release-it`

Este plan detalla la integración de `release-it` para gestionar los lanzamientos de PelelaJS (NPM y VSCode), incorporando un CHANGELOG manual y automatizado, siguiendo el estilo de `wollok-ts`. El requerimiento original está en https://github.com/uqbar-project/pelelajs/issues/94.

## 1. Objetivos
- Automatizar el bumping de versiones, tags de Git y GitHub Releases.
- Mantener dos archivos `CHANGELOG.md` independientes: uno en la raíz para NPM y otro en `tools/pelela-vscode/` para la extensión. **Importante: los contenidos deben estar en inglés.**
- Generar un **resumen sugerido** basado en los commits (no un log crudo) que sea editable antes de confirmarse.
- Permitir la edición manual de las notas de release tanto localmente como desde el CI.
- **No usar Conventional Commits estricto**: Usar los commits como base para el resumen pero permitir libertad total al editor.

## 2. Preparación del Entorno
- Instalar dependencias:
  ```bash
  pnpm add -D release-it @release-it/conventional-changelog
  ```
- Crear los archivos `CHANGELOG.md` iniciales en sus respectivas carpetas.

## 3. Configuración de `release-it`

### A. Core y Herramientas (NPM)
Se creará un archivo `.release-it.json` en la raíz que gestione:
- El bumping de versión en el monorepo (root y paquetes seleccionados).
- La actualización del `CHANGELOG.md` global (en inglés).
- Uso de un script `scripts/generate-summary.ts` para proponer el contenido del changelog basado en `git log`.
- Hooks de `before:init` para asegurar que el entorno esté limpio.
- Hooks de `after:bump` para disparar `pnpm run build`.
- Hooks de `after:release` para disparar el publish de los paquetes a NPM.

### B. VSCode Extension
Se creará un archivo `.release-it.json` dentro de `tools/pelela-vscode/`:
- Ciclo de vida independiente con tags tipo `vscode-v*`.
- Hooks para `vsce package` y publicación en Marketplace/OpenVSX.

## 4. Estilo del CHANGELOG
Seguiremos el estilo de `wollok-ts`, utilizando emojis para categorizar los cambios (🛸 para features, 🐛 para fixes, 📦 para builds, etc.):

```markdown
## v0.5.14
- 🚀 Nueva funcionalidad de binding reactivo
- 🐛 Fix en el parsing de atributos booleanos
```

## 5. Integración con CI (GitHub Actions)
Modificaremos los workflows `deploy.yml` y `deploy-vscode.yml`:
- Agregar un input `changelog_notes` al `workflow_dispatch`.
- Pasar este input a `release-it` mediante una variable de entorno (`RELEASE_IT_NOTES`).
- Configurar `release-it` para que, en modo no interactivo (CI), use estas notas prioritariamente.

## 6. Pasos de Ejecución (Iterativo)
1. **Fase 1**: Crear el `CHANGELOG.md` base y el archivo de plan (este archivo).
2. **Fase 2**: Configurar `release-it` para NPM y probarlo localmente (sin hacer push/publish real).
3. **Fase 3**: Configurar `release-it` para VSCode.
4. **Fase 4**: Actualizar los workflows de GitHub Actions.
5. **Fase 5**: Documentar el nuevo proceso en `AGENTS.md` o un manual interno.
