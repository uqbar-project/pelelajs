import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { t } from './i18n'
import { createDirectory } from './shell'

/**
 * Recursively copy a directory.
 * Node's cpSync can be flaky across different OS/Node versions for global packages.
 * This implementation is declarative and robust.
 */
function copyRecursive(src: string, dest: string): void {
  const stats = statSync(src)
  if (stats.isDirectory()) {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true })
    }
    readdirSync(src).forEach((child) => {
      if (child !== 'node_modules') {
        copyRecursive(join(src, child), join(dest, child))
      }
    })
  } else {
    cpSync(src, dest, { force: true })
  }
}

export function computeTemplatePath(currentDir: string): string {
  // In development (currentDir is src/utils), template is in ../../templates
  // In production (currentDir is dist), template is at the same level (via tsup's publicDir)
  return currentDir.includes('dist')
    ? join(currentDir, 'base-template-for-cli')
    : join(currentDir, '..', '..', 'templates', 'base-template-for-cli')
}

// In CJS bundled by tsup, __dirname is available globally
const TEMPLATE_SOURCE = computeTemplatePath(__dirname)

export function copyTemplate(projectPath: string): void {
  if (!existsSync(TEMPLATE_SOURCE)) {
    throw new Error(t('commands.init.error.templateNotFound', { source: TEMPLATE_SOURCE }))
  }

  createDirectory(projectPath)

  try {
    // Manual recursive copy to ensure reliability across all environments
    copyRecursive(TEMPLATE_SOURCE, projectPath)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      t('commands.init.error.copyFailed', {
        source: TEMPLATE_SOURCE,
        dest: projectPath,
        error: message,
      }),
    )
  }

  // Verify that at least package.json was copied
  if (!existsSync(join(projectPath, 'package.json'))) {
    throw new Error(
      t('commands.init.error.verificationFailed', {
        path: projectPath,
        files: readdirSync(projectPath).join(', '),
      }),
    )
  }

  // Rename _biome.json to biome.json to avoid conflicts in the monorepo
  const biomePath = join(projectPath, '_biome.json')
  if (existsSync(biomePath)) {
    renameSync(biomePath, join(projectPath, 'biome.json'))
  }
}

export function updateProjectPackageJson(projectPath: string, projectName: string): void {
  const packageJsonPath = join(projectPath, 'package.json')

  try {
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(packageJsonContent) as { name?: string }

    packageJson.name = projectName

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      t('commands.init.error.packageJsonUpdateFailed', { path: projectPath, error: message }),
    )
  }
}

export function getTemplatePath(): string {
  return TEMPLATE_SOURCE
}

export function validateTemplatePath(): boolean {
  try {
    const packageJsonPath = join(TEMPLATE_SOURCE, 'package.json')
    readFileSync(packageJsonPath, 'utf-8')
    return true
  } catch {
    return false
  }
}
