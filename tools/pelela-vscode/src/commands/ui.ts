import * as vscode from 'vscode'
import { t } from '../i18n'

export function activeTextEditorUri(): vscode.Uri | undefined {
  return vscode.window.activeTextEditor?.document.uri
}

export function validateComponentName(value: string): string | undefined {
  return value.trim() === '' ? t('commands.error.emptyName') : undefined
}

export async function openFile(filePath: string): Promise<void> {
  await vscode.window.showTextDocument(vscode.Uri.file(filePath))
}

export async function revealFile(filePath: string): Promise<void> {
  await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(filePath))
}

export function joinComponentPath(folderPath: string, componentName: string): string {
  return folderPath === '' ? componentName : `${folderPath}/${componentName}`
}
