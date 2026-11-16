import { existsSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { toCamelCase, toKebabCase } from 'pelelajs'
import * as vscode from 'vscode'
import { getViewModelName, scanFile } from '../diagnostics/scanDocument'
import { t } from '../i18n'
import {
  type ComponentExtension,
  isComponentExtension,
  toPelelaPath,
} from '../utils/componentPaths'
import { toCliComponentPath, toCliFolderPath } from './paths'
import { findProjectRoot, listWorkspaceProjectRoots } from './projectLocator'

const SRC_DIRECTORY = 'src'

export interface ResolvedComponent {
  projectRoot: string
  componentPath: string
  folderPath: string
  pelelaPath: string
  displayName: string
}

export type ComponentResolution =
  | { kind: 'component'; component: ResolvedComponent }
  | { kind: 'notAComponent'; filePath: string; pelelaPath: string }
  | { kind: 'outsideSrc'; filePath: string }
  | { kind: 'projectNotFound' }

export type ProjectSelection =
  | { kind: 'selected'; projectRoot: string }
  | { kind: 'notFound' }
  | { kind: 'cancelled' }

function toPascalCase(value: string): string {
  const camelCaseValue = toCamelCase(value)
  return camelCaseValue.charAt(0).toUpperCase() + camelCaseValue.slice(1)
}

function readClassName(pelelaPath: string): string | undefined {
  try {
    return getViewModelName(scanFile(pelelaPath))
  } catch {
    return undefined
  }
}

function toCliValidatedComponentPath(componentPath: string): string {
  const folderSegments = componentPath.split('/').slice(0, -1)
  const componentFileName = toPascalCase(basename(componentPath))
  return [...folderSegments, componentFileName].join('/')
}

/**
 * Resolves the `.pelela` template behind a `.pelela` or `.ts` resource. A `.ts`
 * is only a component when its sibling `.pelela` exists: the CLI needs the
 * template to rename or move it.
 */
export function resolveComponent(uri: vscode.Uri): ComponentResolution {
  const filePath = uri.fsPath
  const extension = extname(filePath)
  const isComponentFile = isComponentExtension(extension)

  if (!isComponentFile) {
    return { kind: 'notAComponent', filePath, pelelaPath: toPelelaPath(filePath) }
  }

  const pelelaPath = toPelelaPath(filePath)
  if (!existsSync(pelelaPath)) {
    return { kind: 'notAComponent', filePath, pelelaPath }
  }

  const projectRoot = findProjectRoot(uri)
  if (projectRoot === undefined) {
    return { kind: 'projectNotFound' }
  }

  const componentPath = toCliComponentPath(pelelaPath, projectRoot)
  const folderPath = toCliFolderPath(dirname(pelelaPath), projectRoot)
  if (componentPath === undefined || folderPath === undefined) {
    return { kind: 'outsideSrc', filePath }
  }

  const className = readClassName(pelelaPath) ?? toPascalCase(basename(componentPath))

  return {
    kind: 'component',
    component: {
      projectRoot,
      componentPath: toCliValidatedComponentPath(componentPath),
      folderPath,
      pelelaPath,
      displayName: className,
    },
  }
}

/**
 * Recomputes the final file path the CLI writes for a component path, so the
 * extension can open or reveal it after the command succeeds.
 */
export function computeComponentFilePath(
  projectRoot: string,
  componentPath: string,
  extension: ComponentExtension
): string {
  const componentPathWithinSrc = componentPath.startsWith(`${SRC_DIRECTORY}/`)
    ? componentPath.slice(SRC_DIRECTORY.length + 1)
    : componentPath

  return join(projectRoot, SRC_DIRECTORY, `${toKebabCase(componentPathWithinSrc)}${extension}`)
}

export async function resolveComponentOrReport(
  uri: vscode.Uri
): Promise<ResolvedComponent | undefined> {
  const resolution = resolveComponent(uri)

  if (resolution.kind === 'component') {
    return resolution.component
  }

  if (resolution.kind === 'projectNotFound') {
    await vscode.window.showErrorMessage(t('commands.error.projectNotFound'))
    return undefined
  }

  const message =
    resolution.kind === 'notAComponent'
      ? t('commands.error.notAComponent', {
          file: basename(resolution.filePath),
          pelelaFile: basename(resolution.pelelaPath),
        })
      : t('commands.error.outsideSrc', { file: resolution.filePath })

  await vscode.window.showErrorMessage(message)
  return undefined
}

/**
 * Uses the Explorer resource when invoked from its context menu; commands from
 * the palette select from the workspace folders.
 */
export async function selectProjectRoot(uri?: vscode.Uri): Promise<ProjectSelection> {
  if (uri !== undefined) {
    const projectRoot = findProjectRoot(uri)
    return projectRoot === undefined ? { kind: 'notFound' } : { kind: 'selected', projectRoot }
  }

  const projectRoots = listWorkspaceProjectRoots()
  if (projectRoots.length === 0) {
    return { kind: 'notFound' }
  }

  if (projectRoots.length === 1) {
    return { kind: 'selected', projectRoot: projectRoots[0] }
  }

  const picked = await vscode.window.showQuickPick(
    projectRoots.map((projectRoot) => ({
      label: basename(projectRoot),
      description: projectRoot,
    })),
    { placeHolder: t('commands.quickPick.project') }
  )

  return picked?.description === undefined
    ? { kind: 'cancelled' }
    : { kind: 'selected', projectRoot: picked.description }
}
