import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

export function getComponentTargetDir(): string {
  return existsSync('src') ? 'src' : '.'
}

export function normalizeComponentName(name: string, targetDir: string): string {
  const normalized = name.replace(/\\/g, '/')
  if (targetDir === 'src' && normalized.startsWith('src/')) {
    return normalized.slice(4)
  }
  return normalized
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createTsFile(name: string, targetDir: string): void {
  const normalizedName = normalizeComponentName(name, targetDir)
  const path = join(targetDir, `${normalizedName}.ts`)
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const className = basename(normalizedName)
  const content = `export class ${className} {
  // Add your properties and methods here
}
`
  writeFileSync(path, content)
}

export function createPelelaFile(name: string, targetDir: string): void {
  const normalizedName = normalizeComponentName(name, targetDir)
  const path = join(targetDir, `${normalizedName}.pelela`)
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const componentName = basename(normalizedName)
  const content = `<div class="container">
  <pelela view-model="${componentName}">
    <h1>${componentName} Component</h1>
    <!-- Add your template here -->
  </pelela>
</div>
`
  writeFileSync(path, content)
}

export function createCssFile(name: string, targetDir: string): void {
  const normalizedName = normalizeComponentName(name, targetDir)
  const path = join(targetDir, `${normalizedName}.css`)
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const componentName = basename(normalizedName)
  const content = `/* Styles for ${componentName} component */
.container {
  padding: 1rem;
}
`
  writeFileSync(path, content)
}

export function renameTsFile(oldName: string, newName: string, targetDir: string): void {
  const normalizedOldName = normalizeComponentName(oldName, targetDir)
  const normalizedNewName = normalizeComponentName(newName, targetDir)

  const oldPath = join(targetDir, `${normalizedOldName}.ts`)
  const newPath = join(targetDir, `${normalizedNewName}.ts`)
  if (!existsSync(oldPath)) return

  const oldClassName = basename(normalizedOldName)
  const newClassName = basename(normalizedNewName)

  const newDir = dirname(newPath)
  if (!existsSync(newDir)) {
    mkdirSync(newDir, { recursive: true })
  }

  let content = readFileSync(oldPath, 'utf-8')
  content = content.replace(
    new RegExp(`class\\s+${escapeRegExp(oldClassName)}`, 'g'),
    () => `class ${newClassName}`,
  )
  writeFileSync(oldPath, content)
  renameSync(oldPath, newPath)
}

export function renamePelelaFile(oldName: string, newName: string, targetDir: string): void {
  const normalizedOldName = normalizeComponentName(oldName, targetDir)
  const normalizedNewName = normalizeComponentName(newName, targetDir)

  const oldPath = join(targetDir, `${normalizedOldName}.pelela`)
  const newPath = join(targetDir, `${normalizedNewName}.pelela`)
  if (!existsSync(oldPath)) return

  const oldComponentName = basename(normalizedOldName)
  const newComponentName = basename(normalizedNewName)

  const newDir = dirname(newPath)
  if (!existsSync(newDir)) {
    mkdirSync(newDir, { recursive: true })
  }

  let content = readFileSync(oldPath, 'utf-8')
  content = content.replace(
    new RegExp(`view-model="${escapeRegExp(oldComponentName)}"`, 'g'),
    () => `view-model="${newComponentName}"`,
  )
  writeFileSync(oldPath, content)
  renameSync(oldPath, newPath)
}

export function renameCssFile(oldName: string, newName: string, targetDir: string): void {
  const normalizedOldName = normalizeComponentName(oldName, targetDir)
  const normalizedNewName = normalizeComponentName(newName, targetDir)

  const oldPath = join(targetDir, `${normalizedOldName}.css`)
  const newPath = join(targetDir, `${normalizedNewName}.css`)
  if (!existsSync(oldPath)) return

  const newDir = dirname(newPath)
  if (!existsSync(newDir)) {
    mkdirSync(newDir, { recursive: true })
  }

  renameSync(oldPath, newPath)
}
