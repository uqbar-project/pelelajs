import * as vscode from 'vscode'
import { findForEachInElement } from '../parsers/documentParser'
import {
  findClassDefinition,
  findMethodDefinition,
  findNestedPropertyDefinition,
  findPropertyDefinition,
} from '../parsers/definitionFinder'
import { findViewModelFile } from '../utils/fileUtils'

// Regex patterns for attribute matching
const BIND_ATTRIBUTE_PATTERN = /(?:bind-[a-zA-Z0-9_-]+|if|for-each)=["']([^"']+)["']/g
const CLICK_ATTRIBUTE_PATTERN = /click=["']([^"']+)["']/g

function provideDefinition(
  document: vscode.TextDocument,
  position: vscode.Position,
  _token: vscode.CancellationToken
): vscode.ProviderResult<vscode.Definition> {
  const line = document.lineAt(position.line)
  const lineText = line.text

  const viewModelLocation = checkViewModelDefinition(document, position, lineText)
  if (viewModelLocation) return viewModelLocation

  const forEachInElement = findForEachInElement(document, position.line)

  const bindLocation = checkBindAttributeDefinitions(document, position, lineText, forEachInElement)
  if (bindLocation) return bindLocation

  const clickLocation = checkClickAttributeDefinition(document, position, lineText)
  if (clickLocation) return clickLocation

  return null
}

function checkViewModelDefinition(
  document: vscode.TextDocument,
  position: vscode.Position,
  lineText: string
): vscode.Location | null {
  const viewModelMatch = /view-model=["']([^"']+)["']/g.exec(lineText)
  if (
    viewModelMatch &&
    position.character >= lineText.indexOf(viewModelMatch[1]) &&
    position.character <= lineText.indexOf(viewModelMatch[1]) + viewModelMatch[1].length
  ) {
    const className = viewModelMatch[1]
    const tsFile = findViewModelFile(document.uri)
    if (tsFile) {
      return findClassDefinition(tsFile, className)
    }
  }
  return null
}

function checkBindAttributeDefinitions(
  document: vscode.TextDocument,
  position: vscode.Position,
  lineText: string,
  forEachInElement: any // Using any for ForEachResult as it's not exported, or I should export it
): vscode.Location | null {
  for (const match of lineText.matchAll(BIND_ATTRIBUTE_PATTERN)) {
    const fullValue = match[1]
    const attrStartPos = match.index
    const valueStartPos = attrStartPos + match[0].indexOf(fullValue)
    const valueEndPos = valueStartPos + fullValue.length

    if (position.character >= valueStartPos && position.character <= valueEndPos) {
      const tsFile = findViewModelFile(document.uri)
      if (!tsFile) continue

      const cursorOffsetInValue = position.character - valueStartPos
      const attrNameMatch = match[0].match(/^([^=]+)=/)
      if (!attrNameMatch) continue
      const attrName = attrNameMatch[1]

      if (attrName === 'for-each') {
        return handleForEachDefinition(fullValue, cursorOffsetInValue, tsFile)
      } else {
        return handlePropertyPathDefinition(
          document,
          fullValue,
          cursorOffsetInValue,
          tsFile,
          forEachInElement
        )
      }
    }
  }

  return null
}

function handleForEachDefinition(
  fullValue: string,
  cursorOffsetInValue: number,
  tsFile: string
): vscode.Location | null {
  const forEachMatch = /^\s*(\w+)\s+of\s+(\w+)\s*$/.exec(fullValue)
  if (forEachMatch) {
    const collectionName = forEachMatch[2]
    const collectionStart = fullValue.indexOf(collectionName)
    const collectionEnd = collectionStart + collectionName.length

    if (cursorOffsetInValue >= collectionStart && cursorOffsetInValue <= collectionEnd) {
      return findPropertyDefinition(tsFile, collectionName)
    }
  }
  return null
}

function handlePropertyPathDefinition(
  document: vscode.TextDocument,
  fullValue: string,
  cursorOffsetInValue: number,
  tsFile: string,
  forEachInElement: any
): vscode.Location | null {
  const parts = fullValue.split('.')
  let currentPos = 0

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim()
    const partStart = fullValue.indexOf(part, currentPos)
    const partEnd = partStart + part.length

    if (cursorOffsetInValue >= partStart && cursorOffsetInValue <= partEnd) {
      if (forEachInElement && part === forEachInElement.itemName) {
        return new vscode.Location(
          document.uri,
          new vscode.Position(forEachInElement.line, forEachInElement.itemPos)
        )
      }

      const propertyPath = parts.slice(0, i + 1)
      return findNestedPropertyDefinition(tsFile, propertyPath)
    }

    currentPos = partEnd + 1
  }

  return null
}

function checkClickAttributeDefinition(
  document: vscode.TextDocument,
  position: vscode.Position,
  lineText: string
): vscode.Location | null {
  for (const match of lineText.matchAll(CLICK_ATTRIBUTE_PATTERN)) {
    const methodName = match[1]
    const startPos = match.index + match[0].indexOf(methodName)
    const endPos = startPos + methodName.length

    if (position.character >= startPos && position.character <= endPos) {
      const tsFile = findViewModelFile(document.uri)
      if (tsFile) {
        return findMethodDefinition(tsFile, methodName)
      }
    }
  }

  return null
}

export function createDefinitionProvider(): vscode.Disposable {
  return vscode.languages.registerDefinitionProvider(
    { language: 'pelela', scheme: 'file' },
    { provideDefinition }
  )
}
