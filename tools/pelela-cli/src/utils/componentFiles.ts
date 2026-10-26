import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { t } from './i18n'

const SRC_DIR = 'src'

export function getComponentTargetDir(): string {
  return existsSync(SRC_DIR) ? SRC_DIR : '.'
}

export function validateBasename(name: string, errorKey: string): void {
  if (isAbsolute(name) || name.includes('..')) {
    throw new Error(t(errorKey))
  }

  const nameBasename = basename(name)
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(nameBasename)) {
    throw new Error(t(errorKey))
  }
}

export function findComponentFile(componentName: string, extension: string): string | null {
  const targetDir = getComponentTargetDir()
  const normalizedInput = componentName.replace(/\\/g, '/')
  const kebabInput = normalizedInput
    .split('/')
    .map((part) => toKebabCase(part))
    .join('/')
  const searchFileName = basename(kebabInput) + extension
  const ignoredDirs = ['node_modules', 'dist']

  const matchesPath = (fullPath: string): boolean => {
    const normalizedFullPath = relative(resolve(targetDir), resolve(fullPath)).replace(/\\/g, '/')
    return normalizedFullPath.endsWith(`${kebabInput}${extension}`)
  }

  function searchDirectory(dir: string): string | null {
    if (!existsSync(dir)) return null

    const findMatchInEntry = (file: string): string | null => {
      const fullPath = join(dir, file)
      const isDirectory = statSync(fullPath).isDirectory()

      if (isDirectory) {
        return searchDirectory(fullPath)
      }

      const isMatch = file === searchFileName && matchesPath(fullPath)
      return isMatch ? fullPath : null
    }

    return (
      readdirSync(dir)
        .filter((file) => !ignoredDirs.includes(file))
        .map(findMatchInEntry)
        .find((result) => result !== null) ?? null
    )
  }

  return searchDirectory(targetDir)
}

/**
 * Resolves the real path for a component file, accounting for case-insensitive
 * file creation (e.g. templates that use lowercase filenames like `base.ts`).
 * Tries the given normalizedName first; if not found, falls back to the
 * lowercase variant of the basename. Returns the resolved path or the original
 * (non-existing) path if neither variant exists.
 */
export function resolveExistingComponentPath(
  normalizedName: string,
  targetDir: string,
  extension: string,
): string {
  const candidatePath = join(targetDir, `${normalizedName}${extension}`)
  if (existsSync(candidatePath)) return candidatePath

  const dir = dirname(normalizedName)
  const lowercasedBasename = basename(normalizedName).toLowerCase()
  const lowercaseCandidate = join(
    targetDir,
    dir === '.' ? `${lowercasedBasename}${extension}` : `${dir}/${lowercasedBasename}${extension}`,
  )
  if (existsSync(lowercaseCandidate)) return lowercaseCandidate

  return candidatePath
}

export function normalizeComponentName(name: string, targetDir: string): string {
  let normalized = name.replace(/\\/g, '/')
  const srcPath = `${SRC_DIR}/`
  if (targetDir === SRC_DIR && normalized.startsWith(srcPath)) {
    normalized = normalized.slice(srcPath.length)
  }
  const folder = dirname(normalized)
  const base = basename(normalized)
  const pascalBase = toPascalCase(base)
  return folder === '.' ? pascalBase : `${folder}/${pascalBase}`
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function toKebabCase(string: string): string {
  return string.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

export function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (_, char) => char.toUpperCase())
}

interface PrepareFileParams {
  name: string
  extension: 'pelela' | 'ts' | 'css'
  targetDir: string
}

export function prepareFile(params: PrepareFileParams): { path: string; normalizedName: string } {
  const { name, extension, targetDir } = params
  const normalizedName = normalizeComponentName(name, targetDir)
  const kebabName = toKebabCase(normalizedName)
  const path = join(targetDir, `${kebabName}.${extension}`)
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return { path, normalizedName }
}

interface PrepareRenameParams {
  oldName: string
  newName: string
  extension: 'pelela' | 'ts' | 'css'
  targetDir: string
}

export function prepareRenamePaths(params: PrepareRenameParams): {
  oldPath: string
  newPath: string
  oldClassName: string
  newClassName: string
} {
  const { oldName, newName, extension, targetDir } = params
  const normalizedOldName = normalizeComponentName(oldName, targetDir)
  const normalizedNewName = normalizeComponentName(newName, targetDir)

  const kebabOldName = toKebabCase(normalizedOldName)
  const kebabNewName = toKebabCase(normalizedNewName)
  const oldPath = resolveExistingComponentPath(kebabOldName, targetDir, `.${extension}`)
  const newPath = join(targetDir, `${kebabNewName}.${extension}`)

  const oldClassName = basename(normalizedOldName)
  const newClassName = basename(normalizedNewName)

  return { oldPath, newPath, oldClassName, newClassName }
}

export function createTsFile(name: string, targetDir: string): void {
  const { path, normalizedName } = prepareFile({ name, extension: 'ts', targetDir })

  const className = basename(normalizedName)
  const content = `export class ${className} {
  // Add your properties and methods here
}
`
  writeFileSync(path, content)
}

export function createPelelaFile(
  name: string,
  targetDir: string,
  rootTag: 'pelela' | 'component' = 'pelela',
): void {
  const { path, normalizedName } = prepareFile({ name, extension: 'pelela', targetDir })

  const componentName = basename(normalizedName)
  const content = `<${rootTag} view-model="${componentName}">
  <h1>${componentName} Component</h1>
  <!-- Add your template here -->
</${rootTag}>
`
  writeFileSync(path, content)
}

export function createCssFile(name: string, targetDir: string): void {
  const { path, normalizedName } = prepareFile({ name, extension: 'css', targetDir })

  const componentName = basename(normalizedName)
  const content = `/* Styles for ${componentName} component */
`
  writeFileSync(path, content)
}

interface ModifyContentParams {
  oldPath: string
  newPath: string
  contentModifier: (content: string) => string
}

function modifyAndRenameFile(params: ModifyContentParams): void {
  const { oldPath, newPath, contentModifier } = params
  let content = readFileSync(oldPath, 'utf-8')
  content = contentModifier(content)
  writeFileSync(newPath, content)
  rmSync(oldPath)
}

function renameClassName(content: string, oldClassName: string, newClassName: string): string {
  return content.replace(
    new RegExp(`class\\s+${escapeRegExp(oldClassName)}\\b`, 'g'),
    () => `class ${newClassName}`,
  )
}

function renameViewModelName(content: string, oldClassName: string, newClassName: string): string {
  return content.replace(
    new RegExp(`view-model="${escapeRegExp(oldClassName)}"`, 'g'),
    () => `view-model="${newClassName}"`,
  )
}

export function renameTsFile(oldName: string, newName: string, targetDir: string): void {
  const { oldPath, newPath, oldClassName, newClassName } = prepareRenamePaths({
    oldName,
    newName,
    extension: 'ts',
    targetDir,
  })

  modifyAndRenameFile({
    oldPath,
    newPath,
    contentModifier: (content) => renameClassName(content, oldClassName, newClassName),
  })
}

export function renamePelelaFile(oldName: string, newName: string, targetDir: string): void {
  const {
    oldPath,
    newPath,
    oldClassName: oldComponentName,
    newClassName: newComponentName,
  } = prepareRenamePaths({
    oldName,
    newName,
    extension: 'pelela',
    targetDir,
  })

  modifyAndRenameFile({
    oldPath,
    newPath,
    contentModifier: (content) => renameViewModelName(content, oldComponentName, newComponentName),
  })
}

export function renameCssFile(oldName: string, newName: string, targetDir: string): void {
  const { oldPath, newPath } = prepareRenamePaths({
    oldName,
    newName,
    extension: 'css',
    targetDir,
  })
  if (!existsSync(oldPath)) return

  renameSync(oldPath, newPath)
}

export function moveComponentFiles(
  sourceTsPath: string,
  destinationBasePath: string,
  oldClassName: string,
  newClassName: string,
): void {
  const sourceBasePath = sourceTsPath.slice(0, -extname(sourceTsPath).length)
  const sourcePelelaPath = `${sourceBasePath}.pelela`
  const sourceCssPath = `${sourceBasePath}.css`
  const destinationTsPath = `${destinationBasePath}.ts`
  const destinationPelelaPath = `${destinationBasePath}.pelela`
  const destinationCssPath = `${destinationBasePath}.css`
  const updatedTs = renameClassName(readFileSync(sourceTsPath, 'utf-8'), oldClassName, newClassName)
  const updatedPelela = renameViewModelName(
    readFileSync(sourcePelelaPath, 'utf-8'),
    oldClassName,
    newClassName,
  )
  const cssContent = existsSync(sourceCssPath) ? readFileSync(sourceCssPath, 'utf-8') : null

  mkdirSync(dirname(destinationTsPath), { recursive: true })
  writeFileSync(destinationTsPath, updatedTs)
  writeFileSync(destinationPelelaPath, updatedPelela)
  if (cssContent !== null) {
    writeFileSync(destinationCssPath, cssContent)
  }

  rmSync(sourceTsPath)
  rmSync(sourcePelelaPath)
  if (cssContent !== null) {
    rmSync(sourceCssPath)
  }
}

const IGNORED_DIRS = ['node_modules', 'dist']
const SUPPORTED_EXTENSIONS = ['.ts', '.js']

interface ImportUpdateContext {
  oldClass: string
  newClass: string
  importerPath: string
  movedFilePaths?: { oldFilePath: string; newFilePath: string }
}

function getFiles(directoryPath: string): string[] {
  return readdirSync(directoryPath)
    .filter((fileName) => !IGNORED_DIRS.includes(fileName) && !fileName.startsWith('.'))
    .flatMap((fileName) => {
      const fullPath = join(directoryPath, fileName)
      return statSync(fullPath).isDirectory() ? getFiles(fullPath) : [fullPath]
    })
    .filter((filePath) => SUPPORTED_EXTENSIONS.some((extension) => filePath.endsWith(extension)))
}

function getMovedImportPath(
  importPath: string,
  importerPath: string,
  oldFilePath: string,
  newFilePath: string,
): string | null {
  const normalizedImportPath = importPath.replace(/\\/g, '/')
  if (!normalizedImportPath.startsWith('.')) return null

  const resolvedImportPath = resolve(dirname(importerPath), normalizedImportPath)
  const oldBasePath = oldFilePath.slice(0, -extname(oldFilePath).length)
  const isOldComponentImport = [oldBasePath, `${oldBasePath}.ts`, `${oldBasePath}.js`].some(
    (path) => resolve(path) === resolvedImportPath,
  )
  if (!isOldComponentImport) return null

  const newBasePath = newFilePath.slice(0, -extname(newFilePath).length)
  const relativePath = relative(dirname(importerPath), newBasePath).replace(/\\/g, '/')
  const pathWithDotPrefix = relativePath.startsWith('.') ? relativePath : `./${relativePath}`
  const importExtension = extname(normalizedImportPath)
  return importExtension ? `${pathWithDotPrefix}${importExtension}` : pathWithDotPrefix
}

function replaceImportPath(importPath: string, context: ImportUpdateContext): string {
  const { oldClass, newClass, importerPath, movedFilePaths } = context
  if (movedFilePaths) {
    const movedImportPath = getMovedImportPath(
      importPath,
      importerPath,
      movedFilePaths.oldFilePath,
      movedFilePaths.newFilePath,
    )
    if (movedImportPath) return movedImportPath
  }

  const pathSegments = importPath.split('/')
  const fileNameFromPath = pathSegments.pop() || ''

  const extensions = ['.ts', '.js', '']
  const matchedExtension = extensions.find(
    (extension) => fileNameFromPath === `${toKebabCase(oldClass)}${extension}`,
  )

  if (matchedExtension !== undefined) {
    const kebabNewClass = toKebabCase(newClass)
    pathSegments.push(`${kebabNewClass}${matchedExtension}`)
    return pathSegments.join('/')
  }

  pathSegments.push(fileNameFromPath)
  return pathSegments.join('/')
}

function replaceComponentUsage(content: string, context: ImportUpdateContext): string {
  const { oldClass, newClass } = context
  const importRegex = new RegExp(`import\\s+.*?\\b${escapeRegExp(oldClass)}\\b.*?\\s+from`, 'gs')

  if (!importRegex.test(content)) return content

  const updatedContent = content.replace(
    new RegExp(`\\b${escapeRegExp(oldClass)}\\b`, 'g'),
    newClass,
  )

  const pathRegex = new RegExp(
    `(import\\s+.*?\\b${escapeRegExp(newClass)}\\b.*?\\s+from\\s+['"])([^'"]+)(['"])`,
    'gs',
  )

  return updatedContent.replace(pathRegex, (_regexMatch, prefix, importPath, suffix) => {
    const updatedPath = replaceImportPath(importPath, context)
    return `${prefix}${updatedPath}${suffix}`
  })
}

export function updateImports(
  oldName: string,
  newName: string,
  movedFilePaths?: { oldFilePath: string; newFilePath: string },
): void {
  const oldClass = basename(oldName)
  const newClass = basename(newName)

  getFiles('.').forEach((file) => {
    const content = readFileSync(file, 'utf-8')
    const newContent = replaceComponentUsage(content, {
      oldClass,
      newClass,
      importerPath: file,
      movedFilePaths,
    })

    if (content !== newContent) {
      writeFileSync(file, newContent)
    }
  })
}
