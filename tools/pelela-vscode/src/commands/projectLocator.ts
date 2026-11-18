import {
  type Dirent,
  existsSync as nodeExistsSync,
  readdirSync as nodeReaddirSync,
  readFileSync as nodeReadFileSync,
  statSync as nodeStatSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import * as vscode from 'vscode'

const PELELA_DEPENDENCIES = ['pelelajs', '@pelelajs/cli'] as const
const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies'] as const
const SRC_DIRECTORY = 'src'
const PACKAGE_JSON = 'package.json'
const IGNORED_DIRECTORIES = new Set(['.git', 'dist', 'node_modules'])

export interface ProjectLocatorFileSystem {
  existsSync(path: string): boolean
  statSync(path: string): { isDirectory(): boolean }
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[]
  readFileSync(path: string, encoding: 'utf-8'): string
}

const nodeFileSystem: ProjectLocatorFileSystem = {
  existsSync: nodeExistsSync,
  statSync: nodeStatSync,
  readdirSync: nodeReaddirSync,
  readFileSync: (path, encoding) => nodeReadFileSync(path, encoding),
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function declaresPelelaDependency(
  packageJsonPath: string,
  fileSystem: ProjectLocatorFileSystem
): boolean {
  try {
    const packageJson: unknown = JSON.parse(fileSystem.readFileSync(packageJsonPath, 'utf-8'))
    if (!isRecord(packageJson)) {
      return false
    }

    return DEPENDENCY_SECTIONS.some((section) => {
      const dependencies = packageJson[section]
      return (
        isRecord(dependencies) &&
        PELELA_DEPENDENCIES.some((dependency) => Object.hasOwn(dependencies, dependency))
      )
    })
  } catch {
    return false
  }
}

function hasSrcDirectory(directory: string, fileSystem: ProjectLocatorFileSystem): boolean {
  return fileSystem.existsSync(join(directory, SRC_DIRECTORY))
}

function isProjectRoot(directory: string, fileSystem: ProjectLocatorFileSystem): boolean {
  return (
    declaresPelelaDependency(join(directory, PACKAGE_JSON), fileSystem) &&
    hasSrcDirectory(directory, fileSystem)
  )
}

function reportDirectoryAccessError(
  operation: 'stat' | 'read',
  directory: string,
  error: unknown
): void {
  console.warn(`Unable to ${operation} project directory "${directory}":`, error)
}

function findNestedProjectRoots(directory: string, fileSystem: ProjectLocatorFileSystem): string[] {
  if (!fileSystem.existsSync(directory)) {
    return []
  }

  let isDirectory: boolean
  try {
    isDirectory = fileSystem.statSync(directory).isDirectory()
  } catch (error) {
    reportDirectoryAccessError('stat', directory, error)
    return []
  }

  if (!isDirectory) {
    return []
  }

  const projectRoots = isProjectRoot(directory, fileSystem) ? [directory] : []
  let entries: Dirent[]
  try {
    entries = fileSystem.readdirSync(directory, { withFileTypes: true })
  } catch (error) {
    reportDirectoryAccessError('read', directory, error)
    return projectRoots
  }

  const nestedDirectories = entries
    .filter((entry) => entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name))
    .map((entry) => join(directory, entry.name))

  return [
    ...projectRoots,
    ...nestedDirectories.flatMap((nestedDirectory) =>
      findNestedProjectRoots(nestedDirectory, fileSystem)
    ),
  ]
}

function collectAncestors(startDirectory: string, boundary: string): string[] {
  const parentDirectory = dirname(startDirectory)
  if (startDirectory === boundary || parentDirectory === startDirectory) {
    return [startDirectory]
  }

  return [startDirectory, ...collectAncestors(parentDirectory, boundary)]
}

/**
 * Directory the resource lives in: the resource itself when it is a folder
 * (explorer context menu), its parent when it is a file.
 */
export function resourceDirectory(
  uri: vscode.Uri,
  fileSystem: ProjectLocatorFileSystem = nodeFileSystem
): string {
  const filePath = uri.fsPath
  const isDirectory = fileSystem.existsSync(filePath) && fileSystem.statSync(filePath).isDirectory()
  return isDirectory ? filePath : dirname(filePath)
}

/**
 * Walks up from the resource to the containing workspace folder looking for a
 * project that declares `pelelajs` (or the standalone CLI) and has a `src`
 * directory. If no package identifies a project, the workspace folder is used
 * as a fallback when any ancestor contains `src`.
 */
export function findProjectRoot(
  uri: vscode.Uri,
  fileSystem: ProjectLocatorFileSystem = nodeFileSystem
): string | undefined {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
  const start = resourceDirectory(uri, fileSystem)
  const boundary = workspaceFolder?.uri.fsPath ?? start
  const ancestors = collectAncestors(start, boundary)
  const projectRoot = ancestors.find((directory) => isProjectRoot(directory, fileSystem))

  if (projectRoot !== undefined) {
    return projectRoot
  }

  if (workspaceFolder === undefined) {
    return undefined
  }

  return ancestors.some((directory) => hasSrcDirectory(directory, fileSystem))
    ? boundary
    : undefined
}

export function listWorkspaceProjectRoots(
  fileSystem: ProjectLocatorFileSystem = nodeFileSystem
): string[] {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? []
  const projectRoots = workspaceFolders.flatMap((workspaceFolder) => {
    const workspaceRoot = workspaceFolder.uri.fsPath
    const nestedProjectRoots = findNestedProjectRoots(workspaceRoot, fileSystem)

    return hasSrcDirectory(workspaceRoot, fileSystem)
      ? [workspaceRoot, ...nestedProjectRoots]
      : nestedProjectRoots
  })

  return [...new Set(projectRoots)]
}
