import type * as vscode from 'vscode'

export function getCurrentAttributeName(lineText: string, positionCharacter: number): string | null {
  const textUpToCursor = lineText.slice(0, positionCharacter)
  const match = /(\b[\w-]+)\s*=\s*"[^"]*$/.exec(textUpToCursor)
  return match ? match[1] : null
}

export function isInsideTag(textBeforeCursor: string): boolean {
  return /<[^>]*$/.test(textBeforeCursor)
}

export function isStartingTag(textBeforeCursor: string): boolean {
  return /<\w*$/.test(textBeforeCursor)
}

export function getAttributeValueMatch(textBeforeCursor: string): string | null {
  const attrValueMatch = /=\s*"([^"]*)$/.exec(textBeforeCursor)
  return attrValueMatch ? attrValueMatch[1] : null
}

export interface ForEachResult {
  itemName: string
  line: number
  itemPos: number
}

export function findForEachInElement(
  document: vscode.TextDocument,
  currentLine: number
): ForEachResult | null {
  for (let i = currentLine; i >= 0; i--) {
    const lineText = document.lineAt(i).text

    const forEachMatch = /for-each=["'](\w+)\s+of\s+\w+["']/.exec(lineText)
    if (forEachMatch) {
      const itemName = forEachMatch[1]
      const itemPos = lineText.indexOf(itemName, lineText.indexOf('for-each='))
      return { itemName, line: i, itemPos }
    }
  }

  return null
}

export interface ForEachExpression {
  itemName: string
  collectionName: string
}

export function parseForEachExpression(forEachLine: string): ForEachExpression | null {
  const forEachExprMatch = /for-each=["'](\w+)\s+of\s+(\w+)["']/.exec(forEachLine)
  if (forEachExprMatch) {
    return {
      itemName: forEachExprMatch[1],
      collectionName: forEachExprMatch[2],
    }
  }
  return null
}

export function parsePropertyPath(valueBeforeCursor: string): string[] | null {
  const dotMatch = /(\w+(?:\.\w+)*)\.$/.exec(valueBeforeCursor)
  return dotMatch ? dotMatch[1].split('.') : null
}
