import * as vscode from 'vscode'
import { t } from '../i18n'
import { invalidateComponentIndex } from '../utils/componentIndex'
import { PELELA_EXTENSION } from '../utils/componentPaths'
import { type CliRunner, runCliWithFeedback } from './cliRunner'
import { computeComponentFilePath, selectProjectRoot } from './componentResolver'
import { toCliFolderPath } from './paths'
import { findProjectRoot, resourceDirectory } from './projectLocator'
import { joinComponentPath, openFile, revealFile, validateComponentName } from './ui'

type NewComponentTarget =
  | { kind: 'target'; projectRoot: string; folderPath: string }
  | { kind: 'projectNotFound' }
  | { kind: 'outsideSrc'; filePath: string }
  | { kind: 'cancelled' }

async function resolveNewComponentTarget(uri?: vscode.Uri): Promise<NewComponentTarget> {
  if (uri === undefined) {
    const selection = await selectProjectRoot()
    if (selection.kind === 'cancelled') {
      return { kind: 'cancelled' }
    }
    if (selection.kind === 'notFound') {
      return { kind: 'projectNotFound' }
    }
    return { kind: 'target', projectRoot: selection.projectRoot, folderPath: '' }
  }

  const projectRoot = findProjectRoot(uri)
  if (projectRoot === undefined) {
    return { kind: 'projectNotFound' }
  }

  const folderPath = toCliFolderPath(resourceDirectory(uri), projectRoot)
  if (folderPath === undefined) {
    return { kind: 'outsideSrc', filePath: uri.fsPath }
  }

  return { kind: 'target', projectRoot, folderPath }
}

export async function createComponent(runCli: CliRunner, uri?: vscode.Uri): Promise<void> {
  const target = await resolveNewComponentTarget(uri)

  if (target.kind === 'cancelled') {
    return
  }

  if (target.kind === 'projectNotFound') {
    await vscode.window.showErrorMessage(t('commands.error.projectNotFound'))
    return
  }

  if (target.kind === 'outsideSrc') {
    await vscode.window.showErrorMessage(t('commands.error.outsideSrc', { file: target.filePath }))
    return
  }

  const input = await vscode.window.showInputBox({
    prompt: t('commands.new.prompt'),
    validateInput: validateComponentName,
  })
  if (input === undefined) {
    return
  }

  const name = input.trim()
  const componentPath = joinComponentPath(target.folderPath, name)
  const result = await runCliWithFeedback({
    runCli,
    command: 'new',
    args: ['new', componentPath],
    cwd: target.projectRoot,
  })
  if (result === undefined) {
    return
  }

  invalidateComponentIndex()

  const pelelaPath = computeComponentFilePath(target.projectRoot, componentPath, PELELA_EXTENSION)
  await revealFile(pelelaPath)
  await openFile(pelelaPath)
  await vscode.window.showInformationMessage(t('commands.new.success', { name }))
}
