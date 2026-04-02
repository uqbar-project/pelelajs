import * as vscode from 'vscode'
import {
  findClassDefinition,
  findMethodDefinition,
  findNestedPropertyDefinition,
  findPropertyDefinition,
} from '../parsers/definitionFinder'
import { type ForEachResult, findForEachInElement } from '../parsers/documentParser'
import { findViewModelFile } from '../utils/fileUtils'

const BIND_ATTRIBUTE_PATTERN = /(?:bind-[a-zA-Z0-9_-]+|if|for-each)=["']([^"']+)["']/g
const CLICK_ATTRIBUTE_PATTERN = /click=["']([^"']+)["']/g

function provideDefinition(
  document: vscode.TextDocument,
  position: vscode.Position,
  _token: vscode.CancellationToken
): vscode.ProviderResult<vscode.Definition> {
  const lineText = document.lineAt(position.line).text

  return (
    checkViewModelDefinition(document, position, lineText) ||
    checkBindAttributeDefinitions(document, position, lineText) ||
    checkClickAttributeDefinition(document, position, lineText)
  )
}

function checkViewModelDefinition(
  document: vscode.TextDocument,
  position: vscode.Position,
  lineText: string
): vscode.Location | null {
  const viewModelMatch = /view-model=["']([^"']+)["']/g.exec(lineText)
  if (!viewModelMatch) return null

  const viewModelName = viewModelMatch[1]
  const valueStartPos = lineText.indexOf(viewModelName)
  const valueEndPos = valueStartPos + viewModelName.length

  if (position.character >= valueStartPos && position.character <= valueEndPos) {
    const typescriptFilePath = findViewModelFile(document.uri)
    return typescriptFilePath ? findClassDefinition(typescriptFilePath, viewModelName) : null
  }

  return null
}

function checkBindAttributeDefinitions(
  document: vscode.TextDocument,
  position: vscode.Position,
  lineText: string
): vscode.Location | null {
  const matches = Array.from(lineText.matchAll(BIND_ATTRIBUTE_PATTERN))

  const activeMatch = matches.find((match) => {
    const value = match[1]
    const valueStartPos = match.index + match[0].indexOf(value)
    const valueEndPos = valueStartPos + value.length
    return position.character >= valueStartPos && position.character <= valueEndPos
  })

  if (!activeMatch) return null

  const typescriptFilePath = findViewModelFile(document.uri)
  if (!typescriptFilePath) return null

  const fullValue = activeMatch[1]
  const valueStartPos = activeMatch.index + activeMatch[0].indexOf(fullValue)
  const cursorOffsetInValue = position.character - valueStartPos

  const attrNameMatch = activeMatch[0].match(/^([^=]+)=/)
  const attributeName = attrNameMatch ? attrNameMatch[1] : ''

  if (attributeName === 'for-each') {
    return handleForEachDefinition(fullValue, cursorOffsetInValue, typescriptFilePath)
  }

  const forEachInElement = findForEachInElement(document, position.line)
  return handlePropertyPathDefinition(
    document,
    fullValue,
    cursorOffsetInValue,
    typescriptFilePath,
    forEachInElement
  )
}

function handleForEachDefinition(
  fullValue: string,
  cursorOffsetInValue: number,
  typescriptFilePath: string
): vscode.Location | null {
  const forEachMatch = /^\s*(\w+)\s+of\s+(\w+)\s*$/.exec(fullValue)
  if (!forEachMatch) return null

  const collectionName = forEachMatch[2]
  const collectionStart = fullValue.indexOf(collectionName)
  const collectionEnd = collectionStart + collectionName.length

  if (cursorOffsetInValue >= collectionStart && cursorOffsetInValue <= collectionEnd) {
    return findPropertyDefinition(typescriptFilePath, collectionName)
  }

  return null
}

function handlePropertyPathDefinition(
  document: vscode.TextDocument,
  fullValue: string,
  cursorOffsetInValue: number,
  typescriptFilePath: string,
  forEachInElement: ForEachResult | null
): vscode.Location | null {
  const pathParts = fullValue.split('.')
  let currentSearchPos = 0

  for (let partIndex = 0; partIndex < pathParts.length; partIndex++) {
    const part = pathParts[partIndex].trim()
    const partStart = fullValue.indexOf(part, currentSearchPos)
    const partEnd = partStart + part.length

    if (cursorOffsetInValue >= partStart && cursorOffsetInValue <= partEnd) {
      if (forEachInElement && part === forEachInElement.itemName) {
        return new vscode.Location(
          document.uri,
          new vscode.Position(forEachInElement.line, forEachInElement.itemPos)
        )
      }

      return findNestedPropertyDefinition(typescriptFilePath, pathParts.slice(0, partIndex + 1))
    }

    currentSearchPos = partEnd + 1
  }

  return null
}

function checkClickAttributeDefinition(
  document: vscode.TextDocument,
  position: vscode.Position,
  lineText: string
): vscode.Location | null {
  const matches = Array.from(lineText.matchAll(CLICK_ATTRIBUTE_PATTERN))

  const activeMatch = matches.find((match) => {
    const methodName = match[1]
    const valueStartPos = match.index + match[0].indexOf(methodName)
    const valueEndPos = valueStartPos + methodName.length
    return position.character >= valueStartPos && position.character <= valueEndPos
  })

  if (!activeMatch) return null

  const typescriptFilePath = findViewModelFile(document.uri)
  return typescriptFilePath ? findMethodDefinition(typescriptFilePath, activeMatch[1]) : null
}

export function createDefinitionProvider(): vscode.Disposable {
  return vscode.languages.registerDefinitionProvider(
    { language: 'pelela', scheme: 'file' },
    { provideDefinition }
  )
}
