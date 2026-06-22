import * as fs from 'node:fs'
import * as path from 'node:path'
import { isPelelaRootTag, isStandardHtmlTag } from 'pelelajs/dom'
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
const ENTER_ATTRIBUTE_PATTERN = /enter=["']([^"']+)["']/g

export function provideDefinition(
  document: vscode.TextDocument,
  position: vscode.Position,
  _token: vscode.CancellationToken
): vscode.ProviderResult<vscode.Definition> {
  const lineText = document.lineAt(position.line).text

  const syncResult =
    checkViewModelDefinition(document, position, lineText) ||
    checkBindAttributeDefinitions(document, position, lineText) ||
    checkClickAttributeDefinition(document, position, lineText) ||
    checkEnterAttributeDefinition(document, position, lineText)

  return syncResult ?? checkComponentTagDefinition(document, position, lineText)
}

function findActiveTagMatch(
  lineText: string,
  characterPosition: number
): RegExpMatchArray | undefined {
  const tagRegex = /<\/?([a-zA-Z0-9-]+)/g
  const matches = Array.from(lineText.matchAll(tagRegex))

  return matches.find((match) => {
    const tagName = match[1]
    const startPos = (match.index ?? 0) + match[0].indexOf(tagName)
    const endPos = startPos + tagName.length
    return characterPosition >= startPos && characterPosition <= endPos
  })
}

function resolveComponentDefinition(
  document: vscode.TextDocument,
  tagName: string
): vscode.ProviderResult<vscode.Definition> {
  if (isStandardHtmlTag(tagName) || isPelelaRootTag(tagName)) {
    return null
  }

  const currentDir = path.dirname(document.uri.fsPath)
  const localPelelaPath = path.join(currentDir, `${tagName}.pelela`)
  if (fs.existsSync(localPelelaPath)) {
    return new vscode.Location(vscode.Uri.file(localPelelaPath), new vscode.Position(0, 0))
  }

  return vscode.workspace.findFiles(`**/${tagName}.pelela`).then((uris) => {
    if (uris && uris.length > 0) {
      return new vscode.Location(uris[0], new vscode.Position(0, 0))
    }
    return null
  })
}

function checkComponentTagDefinition(
  document: vscode.TextDocument,
  position: vscode.Position,
  lineText: string
): vscode.ProviderResult<vscode.Definition> {
  const activeMatch = findActiveTagMatch(lineText, position.character)
  return activeMatch ? resolveComponentDefinition(document, activeMatch[1]) : null
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

function buildPropertyPartPositions(
  fullValue: string,
  pathParts: string[]
): Array<{ part: string; partStart: number; partEnd: number; partIndex: number }> {
  return pathParts.reduce<
    Array<{
      part: string
      partStart: number
      partEnd: number
      partIndex: number
      nextSearchPos: number
    }>
  >((acc, rawPart, partIndex) => {
    const part = rawPart.trim()
    const searchFrom = acc.length > 0 ? acc[acc.length - 1].nextSearchPos : 0
    const partStart = fullValue.indexOf(part, searchFrom)
    const partEnd = partStart + part.length
    acc.push({ part, partStart, partEnd, partIndex, nextSearchPos: partEnd + 1 })
    return acc
  }, [])
}

function resolvePropertyPartDefinition(
  document: vscode.TextDocument,
  fullValue: string,
  pathParts: string[],
  cursorOffsetInValue: number,
  typescriptFilePath: string,
  forEachInElement: ForEachResult | null
): vscode.Location | null {
  const partPositions = buildPropertyPartPositions(fullValue, pathParts)

  const activePart = partPositions.find(
    ({ partStart, partEnd }) => cursorOffsetInValue >= partStart && cursorOffsetInValue <= partEnd
  )

  if (!activePart) return null

  if (forEachInElement && activePart.part === forEachInElement.itemName) {
    return new vscode.Location(
      document.uri,
      new vscode.Position(forEachInElement.line, forEachInElement.itemPos)
    )
  }

  return findNestedPropertyDefinition(
    typescriptFilePath,
    pathParts.slice(0, activePart.partIndex + 1)
  )
}

function handlePropertyPathDefinition(
  document: vscode.TextDocument,
  fullValue: string,
  cursorOffsetInValue: number,
  typescriptFilePath: string,
  forEachInElement: ForEachResult | null
): vscode.Location | null {
  const pathParts = fullValue.split('.')
  return resolvePropertyPartDefinition(
    document,
    fullValue,
    pathParts,
    cursorOffsetInValue,
    typescriptFilePath,
    forEachInElement
  )
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

function checkEnterAttributeDefinition(
  document: vscode.TextDocument,
  position: vscode.Position,
  lineText: string
): vscode.Location | null {
  const matches = Array.from(lineText.matchAll(ENTER_ATTRIBUTE_PATTERN))

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
