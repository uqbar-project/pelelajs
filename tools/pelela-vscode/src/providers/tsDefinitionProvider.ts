import * as vscode from 'vscode'
import { findMethodUsage, findPropertyUsage, findViewModelTag } from '../parsers/pelelaFinder'
import { findPelelaFile } from '../utils/fileUtils'

const CLASS_DECLARATION_REGEX = /^\s*(?:export\s+)?(?:default\s+)?class\s+(\w+)/
const ACCESS_MODIFIER = '(?:public\\s+|private\\s+|protected\\s+)?'
const PROPERTY_DECLARATION_REGEX = new RegExp(`^\\s*${ACCESS_MODIFIER}(?:get\\s+)?(\\w+)\\s*[=:]`)
const METHOD_DECLARATION_REGEX = new RegExp(`^\\s*${ACCESS_MODIFIER}(\\w+)\\s*\\(`)

function isClassDeclaration(line: string): string | null {
  const match = CLASS_DECLARATION_REGEX.exec(line)
  return match ? match[1] : null
}

function isPropertyDeclaration(line: string): string | null {
  const getterMatch = /^\s*(?:public\s+|private\s+|protected\s+)?get\s+(\w+)\s*\(/.exec(line)
  if (getterMatch) return getterMatch[1]

  const match = PROPERTY_DECLARATION_REGEX.exec(line)
  return match ? match[1] : null
}

function isMethodDeclaration(line: string): string | null {
  const match = METHOD_DECLARATION_REGEX.exec(line)
  if (!match) return null
  const name = match[1]
  if (name === 'get' || name === 'set') return null
  return name
}

export function provideTypeScriptDefinition(
  document: vscode.TextDocument,
  position: vscode.Position,
  _token: vscode.CancellationToken
): vscode.ProviderResult<vscode.Definition> {
  const wordRange = document.getWordRangeAtPosition(position)
  if (!wordRange) return null

  const lineText = document.lineAt(position.line).text
  const word = document.getText(wordRange)
  if (!word) return null

  const tsFilePath = document.uri.fsPath
  const pelelaFilePath = findPelelaFile(tsFilePath)
  if (!pelelaFilePath) return null

  const className = isClassDeclaration(lineText)
  if (className === word) {
    return findViewModelTag(pelelaFilePath, className)
  }

  const propertyName = isPropertyDeclaration(lineText)
  if (propertyName === word) {
    return findPropertyUsage(pelelaFilePath, propertyName)
  }

  const methodName = isMethodDeclaration(lineText)
  if (methodName === word) {
    return findMethodUsage(pelelaFilePath, methodName)
  }

  return null
}

export function createTypeScriptDefinitionProvider(): vscode.Disposable {
  return vscode.languages.registerDefinitionProvider(
    { language: 'typescript', scheme: 'file' },
    { provideDefinition: provideTypeScriptDefinition }
  )
}
