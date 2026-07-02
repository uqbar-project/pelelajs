import type * as vscode from 'vscode'

const FOR_EACH_REGEX = /for-each=["'](\w+)\s+of\s+(\w+)["']/
const INDEX_ATTR_REGEX = /index\s*=\s*["'](\w+)["']/

export function getCurrentAttributeName(
  lineText: string,
  positionCharacter: number
): string | null {
  const textUpToCursor = lineText.slice(0, positionCharacter)
  const attributeMatch = /(\b[\w-]+)\s*=\s*"[^"]*$/.exec(textUpToCursor)
  return attributeMatch ? attributeMatch[1] : null
}

export function isInsideTag(textBeforeCursor: string): boolean {
  return /<[^>]*$/.test(textBeforeCursor)
}

export function isStartingTag(textBeforeCursor: string): boolean {
  return /<\w*$/.test(textBeforeCursor)
}

export function getCurrentTagName(textBeforeCursor: string): string | null {
  const tagMatch = /<\s*([a-zA-Z][\w-]*)[^<>]*$/.exec(textBeforeCursor)
  return tagMatch ? tagMatch[1].toLowerCase() : null
}

export function getAttributeValueMatch(textBeforeCursor: string): string | null {
  const attributeValueMatch = /=\s*"([^"]*)$/.exec(textBeforeCursor)
  return attributeValueMatch ? attributeValueMatch[1] : null
}

export interface ForEachResult {
  itemName: string
  line: number
  itemPos: number
  indexName: string | null
}

export function findForEachInElement(
  document: vscode.TextDocument,
  currentLineIndex: number
): ForEachResult | null {
  const lineIndices = Array.from(
    { length: currentLineIndex + 1 },
    (_, index) => currentLineIndex - index
  )
  const result = lineIndices
    .map((lineIndex) => {
      const lineText = document.lineAt(lineIndex).text
      const forEachMatch = FOR_EACH_REGEX.exec(lineText)
      if (!forEachMatch) return null
      const itemName = forEachMatch[1]
      const indexMatch = lineText.match(INDEX_ATTR_REGEX)
      const forEachAttributeStart = lineText.indexOf('for-each=')
      const itemPosition = lineText.indexOf(itemName, forEachAttributeStart)
      return {
        itemName,
        line: lineIndex,
        itemPos: itemPosition,
        indexName: indexMatch?.[1] ?? null,
      }
    })
    .find((result): result is ForEachResult => {
      if (result === null) return false
      return !isForEachScopeClosed(document, result.line, currentLineIndex)
    })
  return result ?? null
}

function isForEachScopeClosed(
  document: vscode.TextDocument,
  forEachLine: number,
  currentLine: number
): boolean {
  const forEachLineText = document.lineAt(forEachLine).text
  const tagNameMatch = forEachLineText.match(/<\s*(\w[\w-]*)/)
  if (!tagNameMatch) return false
  const tagName = tagNameMatch[1].toLowerCase()

  let depth = 1

  for (let i = forEachLine + 1; i < currentLine; i++) {
    const lineText = document.lineAt(i).text
    depth += countTagBalance(lineText, tagName)
    if (depth <= 0) return true
  }

  return false
}

function countTagBalance(lineText: string, tagName: string): number {
  const tagRegex = new RegExp(`</?${tagName}(?:\\s|>)`, 'gi')
  return Array.from(lineText.matchAll(tagRegex)).reduce((balance, match) => {
    return match[0].startsWith('</') ? balance - 1 : balance + 1
  }, 0)
}

export interface ForEachExpression {
  itemName: string
  collectionName: string
}

export function parseForEachExpression(forEachLine: string): ForEachExpression | null {
  const forEachExpressionMatch = FOR_EACH_REGEX.exec(forEachLine)
  if (forEachExpressionMatch) {
    return {
      itemName: forEachExpressionMatch[1],
      collectionName: forEachExpressionMatch[2],
    }
  }
  return null
}

export function parsePropertyPath(valueBeforeCursor: string): string[] | null {
  const propertyPathMatch = /(\w+(?:\.\w+)*)\.$/.exec(valueBeforeCursor)
  return propertyPathMatch ? propertyPathMatch[1].split('.') : null
}
