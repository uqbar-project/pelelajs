import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import * as vscode from 'vscode'

const PELELA_DEPENDENCIES = ['pelelajs', '@pelelajs/cli'] as const
const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies'] as const
const SRC_DIRECTORY = 'src'
const PACKAGE_JSON = 'package.json'
const IGNORED_DIRECTORIES = new Set(['.git', 'dist', 'node_modules'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function declaresPelelaDependency(packageJsonPath: string): boolean {
  try {
    const packageJson: unknown = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
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

function hasSrcDirectory(directory: string): boolean {
  return existsSync(join(directory, SRC_DIRECTORY))
}

function isProjectRoot(directory: string): boolean {
  return declaresPelelaDependency(join(directory, PACKAGE_JSON)) && hasSrcDirectory(directory)
}

function findNestedProjectRoots(directory: string): string[] {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    return []
  }

  const nestedDirectories = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name))
    .map((entry) => join(directory, entry.name))

  return [
    ...(isProjectRoot(directory) ? [directory] : []),
    ...nestedDirectories.flatMap(findNestedProjectRoots),
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
export function resourceDirectory(uri: vscode.Uri): string {
  const filePath = uri.fsPath
  const isDirectory = existsSync(filePath) && statSync(filePath).isDirectory()
  return isDirectory ? filePath : dirname(filePath)
}

/**
 * Walks up from the resource to the containing workspace folder looking for a
 * project that declares `pelelajs` (or the standalone CLI) and has a `src`
 * directory. If no package identifies a project, the workspace folder is used
 * as a fallback when any ancestor contains `src`.
 */
export function findProjectRoot(uri: vscode.Uri): string | undefined {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
  const start = resourceDirectory(uri)
  const boundary = workspaceFolder?.uri.fsPath ?? start
  const ancestors = collectAncestors(start, boundary)
  const projectRoot = ancestors.find(isProjectRoot)

  if (projectRoot !== undefined) {
    return projectRoot
  }

  if (workspaceFolder === undefined) {
    return undefined
  }

  return ancestors.some(hasSrcDirectory) ? boundary : undefined
}

export function listWorkspaceProjectRoots(): string[] {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? []
  const projectRoots = workspaceFolders.flatMap((workspaceFolder) => {
    const workspaceRoot = workspaceFolder.uri.fsPath
    const nestedProjectRoots = findNestedProjectRoots(workspaceRoot)

    return hasSrcDirectory(workspaceRoot)
      ? [workspaceRoot, ...nestedProjectRoots]
      : nestedProjectRoots
  })

  return [...new Set(projectRoots)]
}
