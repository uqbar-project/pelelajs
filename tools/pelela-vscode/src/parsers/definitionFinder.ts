import * as vscode from 'vscode'
import { readFileLines } from '../utils/fileUtils'
import {
  calculateBraceDepth,
  isClassDeclaration,
  isObjectLiteralStart,
} from '../utils/parsingUtils'

export function findClassDefinition(
  typescriptFilePath: string,
  className: string
): vscode.Location | null {
  const classDeclarationRegex = new RegExp(`^\\s*(?:export\\s+)?class\\s+${className}\\b`, 'm')
  return findDefinitionInFile(typescriptFilePath, classDeclarationRegex, className)
}

export function findPropertyDefinition(
  typescriptFilePath: string,
  propertyName: string
): vscode.Location | null {
  const propertyOrGetterRegex = new RegExp(
    `^\\s*(?:public\\s+|private\\s+|protected\\s+)?(?:get\\s+)?${propertyName}\\b`,
    'm'
  )
  return findDefinitionInFile(typescriptFilePath, propertyOrGetterRegex, propertyName)
}

export function findMethodDefinition(
  typescriptFilePath: string,
  methodName: string
): vscode.Location | null {
  const methodDeclarationRegex = new RegExp(
    `^\\s*(?:public\\s+|private\\s+|protected\\s+)?${methodName}\\s*\\(`,
    'm'
  )
  return findDefinitionInFile(typescriptFilePath, methodDeclarationRegex, methodName)
}

export function findNestedPropertyDefinition(
  typescriptFilePath: string,
  propertyPath: string[]
): vscode.Location | null {
  if (propertyPath.length === 1) {
    return findPropertyDefinition(typescriptFilePath, propertyPath[0])
  }

  const lines = readFileLines(typescriptFilePath)
  const rootPropertyName = propertyPath[0]
  const rootPropertyRegex = new RegExp(
    `^\\s*(?:public\\s+|private\\s+|protected\\s+)?${rootPropertyName}\\??\\s*[=:]`,
    'm'
  )

  const rootPropertyLineIndex = lines.findIndex((line) => rootPropertyRegex.test(line))
  if (rootPropertyLineIndex === -1) return null

  return traverseObjectPath(lines, rootPropertyLineIndex, propertyPath.slice(1), typescriptFilePath)
}

function findDefinitionInFile(
  typescriptFilePath: string,
  declarationRegex: RegExp,
  targetName: string
): vscode.Location | null {
  const lines = readFileLines(typescriptFilePath)
  const lineIndex = lines.findIndex((line) => declarationRegex.test(line))

  if (lineIndex === -1) return null

  const characterIndex = lines[lineIndex].indexOf(targetName)
  return new vscode.Location(
    vscode.Uri.file(typescriptFilePath),
    new vscode.Position(lineIndex, characterIndex)
  )
}

function traverseObjectPath(
  lines: string[],
  currentSearchIndex: number,
  remainingPropertyPath: string[],
  typescriptFilePath: string
): vscode.Location | null {
  if (remainingPropertyPath.length === 0) return null

  const targetProperty = remainingPropertyPath[0]
  const objectStartLineIndex = findObjectStartLineIndex(lines, currentSearchIndex)
  if (objectStartLineIndex === -1) return null

  const propertyLineIndex = findLineOfPropertyForRoot(lines, objectStartLineIndex, targetProperty)
  if (propertyLineIndex === -1) return null

  if (remainingPropertyPath.length === 1) {
    const characterIndex = lines[propertyLineIndex].indexOf(targetProperty)
    return new vscode.Location(
      vscode.Uri.file(typescriptFilePath),
      new vscode.Position(propertyLineIndex, characterIndex)
    )
  }

  return traverseObjectPath(
    lines,
    propertyLineIndex,
    remainingPropertyPath.slice(1),
    typescriptFilePath
  )
}

function findObjectStartLineIndex(lines: string[], currentSearchIndex: number): number {
  const searchSlice = lines.slice(currentSearchIndex)
  const relativeIndex = searchSlice.findIndex((line) => isObjectLiteralStart(line))

  return relativeIndex === -1 ? -1 : currentSearchIndex + relativeIndex
}

function findLineOfPropertyForRoot(
  lines: string[],
  objectStartLineIndex: number,
  targetProperty: string
): number {
  const propertyRegex = new RegExp(`^\\s*${targetProperty}\\s*[=:]`)
  let currentBraceDepth = calculateBraceDepth(lines[objectStartLineIndex])

  for (let lineIndex = objectStartLineIndex + 1; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    const previousBraceDepth = currentBraceDepth
    currentBraceDepth += calculateBraceDepth(line)

    if (currentBraceDepth === 0) return -1
    if (previousBraceDepth === 1 && propertyRegex.test(line)) return lineIndex
  }

  return -1
}
