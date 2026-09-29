import * as fs from 'node:fs'
import * as path from 'node:path'
import { toKebabCase } from 'pelelajs'
import * as vscode from 'vscode'
import { getViewModelName, scanFile } from '../diagnostics/scanDocument'

const TEMPLATE_EXTENSION = '.pelela'
const SOURCE_DIRECTORY_NAME = 'src'
const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', 'build', 'coverage', 'out'])

export interface IndexedComponent {
  templatePath: string
  viewModelName: string
  tagName: string
}

/**
 * Templates reachable from a directory, keyed by registered tag name. Built
 * once per directory and reused, because a diagnostics run resolves the same
 * children for every tag in the document.
 */
const indexByDirectory = new Map<string, Map<string, IndexedComponent[]>>()

function isIgnoredDirectory(entryName: string): boolean {
  return IGNORED_DIRECTORIES.has(entryName) || entryName.startsWith('.')
}

function readEntries(directory: string): fs.Dirent[] {
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
  } catch {
    return []
  }
}

function listDirectoriesRecursively(directory: string): string[] {
  const nested = readEntries(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    const isSearchable = entry.isDirectory() && !isIgnoredDirectory(entry.name)
    return isSearchable ? listDirectoriesRecursively(entryPath) : []
  })

  return [directory, ...nested]
}

function listTemplatePaths(directory: string): string[] {
  return listDirectoriesRecursively(directory).flatMap((currentDirectory) =>
    readEntries(currentDirectory)
      .filter((entry) => entry.isFile() && path.extname(entry.name) === TEMPLATE_EXTENSION)
      .map((entry) => path.join(currentDirectory, entry.name))
  )
}

/**
 * The view model the runtime registers for a template: the view-model
 * attribute, or the file name only when the attribute is missing.
 */
function readViewModelName(templatePath: string): string {
  return getViewModelName(scanFile(templatePath)) ?? path.basename(templatePath, TEMPLATE_EXTENSION)
}

function indexTemplates(filePaths: string[]): Map<string, IndexedComponent[]> {
  return filePaths.reduce((grouped, templatePath) => {
    const viewModelName = readViewModelName(templatePath)
    const tagName = toKebabCase(viewModelName)
    const component: IndexedComponent = { templatePath, viewModelName, tagName }
    return grouped.set(tagName, [...(grouped.get(tagName) ?? []), component])
  }, new Map<string, IndexedComponent[]>())
}

function relativeDepth(directory: string, filePath: string): number {
  return path.relative(directory, filePath).split(path.sep).length
}

function isWithinDirectory(directory: string, filePath: string): boolean {
  const relativePath = path.relative(directory, filePath)
  return (
    relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  )
}

function byDepthThenName(directory: string) {
  return (first: IndexedComponent, second: IndexedComponent): number => {
    const depthDifference =
      relativeDepth(directory, first.templatePath) - relativeDepth(directory, second.templatePath)
    return depthDifference !== 0
      ? depthDifference
      : first.templatePath.localeCompare(second.templatePath)
  }
}

function indexOf(directory: string): Map<string, IndexedComponent[]> {
  const cached = indexByDirectory.get(directory)
  if (cached !== undefined) return cached

  const sorted = new Map(
    Array.from(indexTemplates(listTemplatePaths(directory)), ([tagName, components]) => [
      tagName,
      [...components].sort(byDepthThenName(directory)),
    ])
  )

  indexByDirectory.set(directory, sorted)
  return sorted
}

function workspaceRootOf(document: vscode.TextDocument): string | null {
  const folder = vscode.workspace.getWorkspaceFolder(document.uri)
  return folder?.uri.fsPath ?? null
}

function ancestorsUpTo(directory: string, stopAt: string): string[] {
  const parent = path.dirname(directory)
  if (directory === stopAt || parent === directory) return [directory]
  return [directory, ...ancestorsUpTo(parent, stopAt)]
}

/**
 * Directories to search, from the closest to the document outwards, ending at
 * the source directory because that is the tree the runtime registers. Staying
 * inside the workspace keeps a document outside any workspace resolving exactly
 * as it did before.
 */
function searchDirectories(documentDirectory: string, workspaceRoot: string | null): string[] {
  if (workspaceRoot === null) return [documentDirectory]

  const ancestors = ancestorsUpTo(documentDirectory, workspaceRoot)
  const sourceIndex = ancestors.findIndex(
    (directory) => path.basename(directory) === SOURCE_DIRECTORY_NAME
  )

  return sourceIndex === -1 ? ancestors : ancestors.slice(0, sourceIndex + 1)
}

/**
 * Resolves a child template the way the runtime registers it: every template
 * under the source tree is registered, so a child may live in any subfolder.
 * The closest directory holding a match wins, which keeps a sibling template
 * taking precedence over a distant one with the same tag.
 */
export function findChildTemplate(
  tagName: string,
  document: vscode.TextDocument
): IndexedComponent | null {
  const documentDirectory = path.dirname(document.uri.fsPath)
  const directories = searchDirectories(documentDirectory, workspaceRootOf(document))
  const outermostDirectory = directories[directories.length - 1]
  const candidates = indexOf(outermostDirectory).get(tagName) ?? []
  const match = directories
    .map(
      (directory) =>
        candidates
          .filter((component) => isWithinDirectory(directory, component.templatePath))
          .sort(byDepthThenName(directory))[0]
    )
    .find((component) => component !== undefined)

  return match ?? null
}

export function invalidateComponentIndex(): void {
  indexByDirectory.clear()
}
