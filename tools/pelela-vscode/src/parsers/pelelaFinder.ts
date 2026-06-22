import * as vscode from 'vscode'
import { readFileLines } from '../utils/fileUtils'

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function findViewModelTag(
  pelelaFilePath: string,
  className: string
): vscode.Location | null {
  const escapedName = escapeRegex(className)
  const viewModelRegex = new RegExp(`<pelela[^>]*view-model=["']${escapedName}["']`)
  return findLocationInFile(pelelaFilePath, viewModelRegex, className)
}

export function findPropertyUsage(
  pelelaFilePath: string,
  propertyName: string
): vscode.Location | null {
  const escapedName = escapeRegex(propertyName)
  const bindingRegex = new RegExp(
    `(?:bind-[a-zA-Z0-9_-]+|if)\\s*=\\s*["'][^"']*\\b${escapedName}\\b[^"']*["']`
  )
  const forEachCollectionRegex = new RegExp(
    `for-each\\s*=\\s*["'][^"']*\\bof\\s+[^"']*\\b${escapedName}\\b[^"']*["']`
  )
  const location =
    findLocationInFile(pelelaFilePath, bindingRegex, propertyName) ??
    findLocationInFile(pelelaFilePath, forEachCollectionRegex, propertyName)
  if (location) return location

  const constAttrRegex = new RegExp(`const-${escapedName}\\s*=\\s*["'][^"']*["']`)
  return findLocationInFile(pelelaFilePath, constAttrRegex, propertyName)
}

export function findMethodUsage(
  pelelaFilePath: string,
  methodName: string
): vscode.Location | null {
  const escapedName = escapeRegex(methodName)
  const eventRegex = new RegExp(`(?:click|enter)\\s*=\\s*["']${escapedName}["']`)
  return findLocationInFile(pelelaFilePath, eventRegex, methodName)
}

function findLocationInFile(
  filePath: string,
  regex: RegExp,
  targetName: string
): vscode.Location | null {
  const lines = readFileLines(filePath)
  const lineIndex = lines.findIndex((line) => regex.test(line))

  if (lineIndex === -1) return null

  let characterIndex = lines[lineIndex].indexOf(targetName)
  if (characterIndex === -1) {
    characterIndex = 0
  }

  return new vscode.Location(
    vscode.Uri.file(filePath),
    new vscode.Position(lineIndex, Math.max(0, characterIndex))
  )
}
