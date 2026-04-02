import * as fs from 'node:fs'
import type * as vscode from 'vscode'

export function findViewModelFile(pelelaUri: vscode.Uri): string | null {
  const pelelaPath = pelelaUri.fsPath
  const tsPath = pelelaPath.replace(/\.pelela$/, '.ts')
  if (fs.existsSync(tsPath)) {
    return tsPath
  }
  return null
}

export function readFileLines(filePath: string): string[] {
  const text = fs.readFileSync(filePath, 'utf-8')
  return text.split('\n')
}

export function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8')
}
