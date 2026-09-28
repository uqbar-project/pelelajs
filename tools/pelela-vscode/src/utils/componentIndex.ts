import * as fs from 'node:fs'
import * as path from 'node:path'
import * as vscode from 'vscode'

const TEMPLATE_EXTENSION = '.pelela'
const SOURCE_DIRECTORY_NAME = 'src'
const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', 'build', 'coverage', 'out'])

/**
 * Templates reachable from a directory, keyed by template name. Built once per
 * directory and reused, because a diagnostics run resolves the same children
 * for every tag in the document.
 */
const indexByDirectory = new Map<string, Map<string, string[]>>()

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

function groupByTemplateName(filePaths: string[]): Map<string, string[]> {
  return filePaths.reduce((grouped, filePath) => {
    const name = path.basename(filePath, TEMPLATE_EXTENSION)
    return grouped.set(name, [...(grouped.get(name) ?? []), filePath])
  }, new Map<string, string[]>())
}

function relativeDepth(directory: string, filePath: string): number {
  return path.relative(directory, filePath).split(path.sep).length
}

function byDepthThenName(directory: string) {
  return (first: string, second: string): number => {
    const depthDifference = relativeDepth(directory, first) - relativeDepth(directory, second)
    return depthDifference !== 0 ? depthDifference : first.localeCompare(second)
  }
}

function indexOf(directory: string): Map<string, string[]> {
  const cached = indexByDirectory.get(directory)
  if (cached !== undefined) return cached

  const sorted = new Map(
    Array.from(groupByTemplateName(listTemplatePaths(directory)), ([name, filePaths]) => [
      name,
      [...filePaths].sort(byDepthThenName(directory)),
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
 * Resolves a child template the way the runtime does: every template under the
 * source tree is registered, so a child may live in any subfolder. The closest
 * directory holding a match wins, which keeps a sibling template taking
 * precedence over a distant one with the same name.
 */
export function findChildTemplatePath(
  tagName: string,
  document: vscode.TextDocument
): string | null {
  const documentDirectory = path.dirname(document.uri.fsPath)
  const match = searchDirectories(documentDirectory, workspaceRootOf(document))
    .map((directory) => indexOf(directory).get(tagName))
    .find((candidates) => candidates !== undefined && candidates.length > 0)

  return match?.[0] ?? null
}

export function invalidateComponentIndex(): void {
  indexByDirectory.clear()
}
