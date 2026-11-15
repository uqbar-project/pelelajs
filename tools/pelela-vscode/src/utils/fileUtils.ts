import * as fs from 'node:fs'
import type * as vscode from 'vscode'
import { toPelelaPath, toViewModelPath } from './componentPaths'

export function findViewModelFile(pelelaUri: vscode.Uri): string | null {
  const tsPath = toViewModelPath(pelelaUri.fsPath)
  if (fs.existsSync(tsPath)) {
    return tsPath
  }
  return null
}

export function findPelelaFile(tsPath: string): string | null {
  const pelelaPath = toPelelaPath(tsPath)
  if (fs.existsSync(pelelaPath)) {
    return pelelaPath
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
