import { cpSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createDirectory } from './shell'

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
    throw new Error(`Template source not found at: ${TEMPLATE_SOURCE}`)
  }

  createDirectory(projectPath)

  try {
    cpSync(TEMPLATE_SOURCE, projectPath, {
      recursive: true,
      filter: (src) => !src.includes('node_modules'),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to copy template from ${TEMPLATE_SOURCE} to ${projectPath}: ${message}`)
  }

  // Verify that at least package.json was copied
  if (!existsSync(join(projectPath, 'package.json'))) {
    throw new Error(`Template was not copied correctly. package.json is missing in ${projectPath}`)
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
    throw new Error(`Failed to read/write package.json in ${projectPath}: ${message}`)
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
