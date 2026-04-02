import type * as vscode from 'vscode'

const FOR_EACH_REGEX = /for-each=["'](\w+)\s+of\s+(\w+)["']/

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

export function getAttributeValueMatch(textBeforeCursor: string): string | null {
  const attributeValueMatch = /=\s*"([^"]*)$/.exec(textBeforeCursor)
  return attributeValueMatch ? attributeValueMatch[1] : null
}

export interface ForEachResult {
  itemName: string
  line: number
  itemPos: number
}

export function findForEachInElement(
  document: vscode.TextDocument,
  currentLineIndex: number
): ForEachResult | null {
  const lineIndices = Array.from(
    { length: currentLineIndex + 1 },
    (_, index) => currentLineIndex - index
  )

  for (const lineIndex of lineIndices) {
    const lineText = document.lineAt(lineIndex).text
    const forEachMatch = FOR_EACH_REGEX.exec(lineText)

    if (forEachMatch) {
      const itemName = forEachMatch[1]
      const forEachAttributeStart = lineText.indexOf('for-each=')
      const itemPosition = lineText.indexOf(itemName, forEachAttributeStart)
      return { itemName, line: lineIndex, itemPos: itemPosition }
    }
  }

  return null
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
