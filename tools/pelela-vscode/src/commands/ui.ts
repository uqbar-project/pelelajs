import * as vscode from 'vscode'
import { t } from '../i18n'

const COMPONENT_NAME_PATTERN = /^[A-Z][a-zA-Z0-9]*$/

export function activeTextEditorUri(): vscode.Uri | undefined {
  return vscode.window.activeTextEditor?.document.uri
}

export function validateComponentName(value: string): string | undefined {
  const normalizedValue = value.trim().replace(/\\/g, '/')
  if (normalizedValue === '') {
    return t('commands.error.emptyName')
  }

  const componentName = normalizedValue.split('/').at(-1) ?? ''
  return COMPONENT_NAME_PATTERN.test(componentName)
    ? undefined
    : t('commands.error.componentNamePascalCase')
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
