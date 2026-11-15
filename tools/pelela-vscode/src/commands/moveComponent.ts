import * as vscode from 'vscode'
import { t } from '../i18n'
import { invalidateViewModelLanguageService } from '../parsers/viewModelLanguageServiceRegistry'
import { invalidateComponentIndex } from '../utils/componentIndex'
import { PELELA_EXTENSION, toViewModelPath } from '../utils/componentPaths'
import { type CliRunner, runCliWithFeedback } from './cliRunner'
import { computeComponentFilePath, resolveComponentOrReport } from './componentResolver'
import { toPosixPath } from './paths'
import { activeTextEditorUri, joinComponentPath, revealFile, validateComponentName } from './ui'

export async function moveComponent(runCli: CliRunner, uri?: vscode.Uri): Promise<void> {
  const targetUri = uri ?? activeTextEditorUri()
  if (targetUri === undefined) {
    await vscode.window.showErrorMessage(t('commands.error.noComponentSelected'))
    return
  }

  const component = await resolveComponentOrReport(targetUri)
  if (component === undefined) {
    return
  }

  await vscode.workspace.saveAll(false)

  const input = await vscode.window.showInputBox({
    prompt: t('commands.move.prompt'),
    placeHolder: t('commands.move.hint'),
    value: joinComponentPath(component.folderPath, component.displayName),
    validateInput: validateComponentName,
  })
  if (input === undefined) {
    return
  }

  const destination = toPosixPath(input.trim())
  const result = await runCliWithFeedback({
    runCli,
    command: 'move',
    args: ['move', component.componentPath, destination],
    cwd: component.projectRoot,
  })
  if (result === undefined) {
    return
  }

  invalidateComponentIndex()
  invalidateViewModelLanguageService(toViewModelPath(component.pelelaPath))

  await revealFile(computeComponentFilePath(component.projectRoot, destination, PELELA_EXTENSION))
  await vscode.window.showInformationMessage(t('commands.move.success', { path: destination }))
}
