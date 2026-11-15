import * as vscode from 'vscode'
import { t } from '../i18n'
import { type CliRunner, runCliWithFeedback } from './cliRunner'
import { selectProjectRoot } from './componentResolver'

export async function addTesting(runCli: CliRunner): Promise<void> {
  const selection = await selectProjectRoot()

  if (selection.kind === 'cancelled') {
    return
  }

  if (selection.kind === 'notFound') {
    await vscode.window.showErrorMessage(t('commands.error.projectNotFound'))
    return
  }

  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: t('commands.addTesting.title'),
    },
    () =>
      runCliWithFeedback({
        runCli,
        command: 'add',
        args: ['add', 'testing'],
        cwd: selection.projectRoot,
      })
  )

  if (result === undefined) {
    return
  }

  await vscode.window.showInformationMessage(result.stdout.trim())
}
