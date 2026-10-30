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
import { rewriteComponentCode } from './componentCodeRewrite'
import { t } from './i18n'

const SRC_DIR = 'src'

export function getComponentTargetDir(): string {
  return existsSync(SRC_DIR) ? SRC_DIR : '.'
}

export function getComponentBasePath(componentPath: string): string {
  const extension = extname(componentPath)
  return extension ? componentPath.slice(0, -extension.length) : componentPath
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
    const suffix = `${kebabInput}${extension}`
    if (!normalizedFullPath.endsWith(suffix)) {
      return false
    }
    const prefix = normalizedFullPath.slice(0, -suffix.length)
    return prefix === '' || prefix.endsWith('/')
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
  oldBasePath: string
  newBasePath: string
  oldClassName: string
  newClassName: string
} {
  const { oldName, newName, extension, targetDir } = params
  const normalizedOldName = normalizeComponentName(oldName, targetDir)
  const normalizedNewName = normalizeComponentName(newName, targetDir)

  const kebabOldName = toKebabCase(normalizedOldName)
  const kebabNewName = toKebabCase(normalizedNewName)
  const oldBasePath = join(targetDir, kebabOldName)
  const newBasePath = join(targetDir, kebabNewName)
  const oldPath = resolveExistingComponentPath(kebabOldName, targetDir, `.${extension}`)
  const newPath = join(targetDir, `${kebabNewName}.${extension}`)

  const oldClassName = basename(normalizedOldName)
  const newClassName = basename(normalizedNewName)

  return { oldPath, newPath, oldBasePath, newBasePath, oldClassName, newClassName }
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
  const { oldPath, newPath, oldBasePath, newBasePath, oldClassName, newClassName } =
    prepareRenamePaths({
      oldName,
      newName,
      extension: 'ts',
      targetDir,
    })
  const movedFiles = buildMovedFilesMap(oldBasePath, newBasePath)

  modifyAndRenameFile({
    oldPath,
    newPath,
    contentModifier: (content) =>
      rebaseRelativeImports(
        renameClassName(content, oldClassName, newClassName),
        oldPath,
        newPath,
        movedFiles,
      ),
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

const RELATIVE_SPECIFIER_PATTERN = /((?:\bfrom\b|\bimport\b)\s*\(?\s*)(['"])(\.[^'"]+)\2/g

const COMPONENT_FILE_EXTENSIONS = ['', '.ts', '.pelela', '.css']

/**
 * Map every file of a component from its old base path to its new base path
 * so relative imports can be rebased after a move or a rename.
 */
function buildMovedFilesMap(oldBasePath: string, newBasePath: string): ReadonlyMap<string, string> {
  const movedFiles = new Map<string, string>()
  COMPONENT_FILE_EXTENSIONS.forEach((extension) => {
    movedFiles.set(resolve(`${oldBasePath}${extension}`), resolve(`${newBasePath}${extension}`))
  })
  return movedFiles
}

function toDotRelativeSpecifier(baseDirectory: string, targetPath: string): string {
  const relativePath = relative(baseDirectory, targetPath).replace(/\\/g, '/')
  const isAlreadyRelative =
    relativePath === '..' || relativePath.startsWith('./') || relativePath.startsWith('../')
  return isAlreadyRelative ? relativePath : `./${relativePath}`
}

function getRebaseTarget(
  specifier: string,
  sourceDirectory: string,
  movedFiles: ReadonlyMap<string, string>,
): string {
  const resolvedSpecifier = resolve(sourceDirectory, specifier)
  return movedFiles.get(resolvedSpecifier) ?? resolvedSpecifier
}

/**
 * Rebase relative import specifiers from the source file directory to the
 * destination directory, keeping specifiers of relocated sibling files
 * pointing at their moved path.
 */
function rebaseRelativeImports(
  content: string,
  sourceFilePath: string,
  destinationFilePath: string,
  movedFiles: ReadonlyMap<string, string>,
): string {
  const sourceDirectory = dirname(sourceFilePath)
  const destinationDirectory = dirname(destinationFilePath)

  return content.replace(
    RELATIVE_SPECIFIER_PATTERN,
    (_match: string, prefix: string, quote: string, specifier: string) => {
      const targetPath = getRebaseTarget(specifier, sourceDirectory, movedFiles)
      const rebasedSpecifier = toDotRelativeSpecifier(destinationDirectory, targetPath)
      return `${prefix}${quote}${rebasedSpecifier}${quote}`
    },
  )
}

export function moveComponentFiles(
  sourceTsPath: string,
  destinationBasePath: string,
  oldClassName: string,
  newClassName: string,
): void {
  const sourceBasePath = getComponentBasePath(sourceTsPath)
  const sourcePelelaPath = `${sourceBasePath}.pelela`
  const sourceCssPath = `${sourceBasePath}.css`
  const destinationTsPath = `${destinationBasePath}.ts`
  const destinationPelelaPath = `${destinationBasePath}.pelela`
  const destinationCssPath = `${destinationBasePath}.css`
  const cssContent = existsSync(sourceCssPath) ? readFileSync(sourceCssPath, 'utf-8') : null
  const movedFiles = buildMovedFilesMap(sourceBasePath, destinationBasePath)
  const updatedTs = rebaseRelativeImports(
    renameClassName(readFileSync(sourceTsPath, 'utf-8'), oldClassName, newClassName),
    sourceTsPath,
    destinationTsPath,
    movedFiles,
  )
  const updatedPelela = renameViewModelName(
    readFileSync(sourcePelelaPath, 'utf-8'),
    oldClassName,
    newClassName,
  )

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

interface MovedFilePaths {
  oldFilePath: string
  newFilePath: string
}

interface ImportUpdateContext {
  oldClass: string
  newClass: string
  importerPath: string
  movedFilePaths?: MovedFilePaths
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
  const oldBasePath = getComponentBasePath(oldFilePath)
  const isOldComponentImport = [
    oldBasePath,
    `${oldBasePath}.ts`,
    `${oldBasePath}.js`,
    `${oldBasePath}.css`,
  ].some((path) => resolve(path) === resolvedImportPath)
  if (!isOldComponentImport) return null

  const newBasePath = getComponentBasePath(newFilePath)
  const pathWithDotPrefix = toDotRelativeSpecifier(dirname(importerPath), newBasePath)
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

  const isUnrelatedCssImport = movedFilePaths !== undefined && fileNameFromPath.endsWith('.css')
  if (isUnrelatedCssImport) {
    return importPath
  }

  const extensions = ['.ts', '.js', '.css', '']
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

function isMovedComponentFile(
  importerPath: string,
  movedFilePaths?: MovedFilePaths,
): boolean {
  if (movedFilePaths === undefined) return false
  const resolvedImporterPath = resolve(importerPath)
  return (
    resolve(movedFilePaths.oldFilePath) === resolvedImporterPath ||
    resolve(movedFilePaths.newFilePath) === resolvedImporterPath
  )
}

function replaceComponentUsage(content: string, context: ImportUpdateContext): string {
  return rewriteComponentCode(content, context.importerPath, {
    oldClass: context.oldClass,
    newClass: context.newClass,
    rewritePath: (importPath) => replaceImportPath(importPath, context),
    isMovedComponentFile: isMovedComponentFile(context.importerPath, context.movedFilePaths),
  })
}

export function updateImports(
  oldName: string,
  newName: string,
  movedFilePaths?: MovedFilePaths,
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
