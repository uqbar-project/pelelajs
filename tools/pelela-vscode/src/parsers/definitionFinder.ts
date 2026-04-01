import * as vscode from 'vscode'
import { readFileLines } from '../utils/fileUtils'
import { calculateBraceDepth, isObjectLiteralStart } from '../utils/parsingUtils'

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function findClassDefinition(
  typescriptFilePath: string,
  className: string
): vscode.Location | null {
  const escapedClassName = escapeRegex(className)
  const classDeclarationRegex = new RegExp(
    `^\\s*(?:export\\s+)?class\\s+${escapedClassName}\\b`,
    'm'
  )
  return findDefinitionInFile(typescriptFilePath, classDeclarationRegex, className)
}

export function findPropertyDefinition(
  typescriptFilePath: string,
  propertyName: string
): vscode.Location | null {
  const escapedPropertyName = escapeRegex(propertyName)
  const propertyOrGetterRegex = new RegExp(
    `^\\s*(?:public\\s+|private\\s+|protected\\s+)?(?:get\\s+)?${escapedPropertyName}\\b`,
    'm'
  )
  return findDefinitionInFile(typescriptFilePath, propertyOrGetterRegex, propertyName)
}

export function findMethodDefinition(
  typescriptFilePath: string,
  methodName: string
): vscode.Location | null {
  const escapedMethodName = escapeRegex(methodName)
  const methodDeclarationRegex = new RegExp(
    `^\\s*(?:public\\s+|private\\s+|protected\\s+)?${escapedMethodName}\\s*\\(`,
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
  const escapedRootPropertyName = escapeRegex(rootPropertyName)
  const rootPropertyRegex = new RegExp(
    `^\\s*(?:public\\s+|private\\s+|protected\\s+)?${escapedRootPropertyName}\\??\\s*[=:]`,
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

  let characterIndex = lines[lineIndex].indexOf(targetName)

  if (characterIndex === -1) {
    const match = declarationRegex.exec(lines[lineIndex])
    if (match) {
      const innerIndex = match[0].indexOf(targetName)
      characterIndex = innerIndex !== -1 ? match.index + innerIndex : 0
    } else {
      characterIndex = 0
    }
  }

  return new vscode.Location(
    vscode.Uri.file(typescriptFilePath),
    new vscode.Position(lineIndex, Math.max(0, characterIndex))
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
  const initialLine = lines[currentSearchIndex]
  const assignIndex = Math.max(initialLine.indexOf('='), initialLine.indexOf(':'))
  const braceIndex = initialLine.indexOf('{')

  const isObjectOpenedOnSameLine = assignIndex !== -1 && braceIndex > assignIndex
  if (isObjectOpenedOnSameLine) {
    return currentSearchIndex
  }

  for (let i = currentSearchIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    const openBraceIdx = line.indexOf('{')

    if (openBraceIdx !== -1) {
      const lineAssignIdx = Math.max(line.indexOf('='), line.indexOf(':'))
      
      const containsAssignmentBeforeBrace = lineAssignIdx !== -1 && openBraceIdx > lineAssignIdx
      const isBraceFirstNonWhitespaceChar = /^\s*\{/.test(line)
      const isValidObjectStart = containsAssignmentBeforeBrace || isBraceFirstNonWhitespaceChar

      return isValidObjectStart ? i : -1
    }
  }

  return -1
}

function findLineOfPropertyForRoot(
  lines: string[],
  objectStartLineIndex: number,
  targetProperty: string
): number {
  const escapedTargetProperty = escapeRegex(targetProperty)
  const propertyRegex = new RegExp(`^\\s*${escapedTargetProperty}\\s*[=:]`)
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
