import { cpSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDirectory } from './shell'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const TEMPLATE_SOURCE = join(__dirname, '..', 'templates', 'base-template-for-cli')

export function copyTemplate(projectPath: string): void {
  createDirectory(projectPath)

  cpSync(TEMPLATE_SOURCE, projectPath, {
    recursive: true,
    filter: (src) => !src.includes('node_modules'),
  })

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
  } catch (_error) {
    throw new Error(`Failed to update package.json in ${projectPath}`)
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
