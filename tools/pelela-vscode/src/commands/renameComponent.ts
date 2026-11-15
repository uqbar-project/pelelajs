import { dirname, join } from 'node:path'
import { toKebabCase } from 'pelelajs'
import * as vscode from 'vscode'
import { t } from '../i18n'
import { invalidateViewModelLanguageService } from '../parsers/viewModelLanguageServiceRegistry'
import { invalidateComponentIndex } from '../utils/componentIndex'
import { PELELA_EXTENSION, toViewModelPath } from '../utils/componentPaths'
import { type CliRunner, runCliWithFeedback } from './cliRunner'
import { resolveComponentOrReport } from './componentResolver'
import { activeTextEditorUri, openFile, validateComponentName } from './ui'

export async function renameComponent(runCli: CliRunner, uri?: vscode.Uri): Promise<void> {
  const targetUri = uri ?? activeTextEditorUri()
  if (targetUri === undefined) {
    await vscode.window.showErrorMessage(t('commands.error.noComponentSelected'))
    return
  }

  const component = await resolveComponentOrReport(targetUri)
  if (component === undefined) {
    return
  }

  const wasSaved = await vscode.workspace.saveAll(false)
  if (!wasSaved) {
    return
  }

  const input = await vscode.window.showInputBox({
    prompt: t('commands.rename.prompt'),
    value: component.displayName,
    validateInput: validateComponentName,
  })
  if (input === undefined) {
    return
  }

  const newName = input.trim()
  const result = await runCliWithFeedback({
    runCli,
    command: 'rename',
    args: ['rename', component.componentPath, newName],
    cwd: component.projectRoot,
  })
  if (result === undefined) {
    return
  }

  invalidateComponentIndex()
  invalidateViewModelLanguageService(toViewModelPath(component.pelelaPath))

  const newPelelaPath = join(
    dirname(component.pelelaPath),
    `${toKebabCase(newName)}${PELELA_EXTENSION}`
  )
  await openFile(newPelelaPath)
  await vscode.window.showInformationMessage(t('commands.rename.success', { name: newName }))
}
