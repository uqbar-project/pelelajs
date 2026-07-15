import type * as vscode from 'vscode'
import { findFirst } from '../helpers'

const FOR_EACH_REGEX = /for-each=["'](\w+)\s+of\s+([\w.]+)["']/
const INDEX_ATTR_REGEX = /(?:^|\s)index\s*=\s*["'](\w+)["']/

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

function* forEachCandidates(
  document: vscode.TextDocument,
  currentLineIndex: number
): Generator<ForEachResult, void, unknown> {
  for (let i = currentLineIndex; i >= 0; i--) {
    const lineText = document.lineAt(i).text
    const forEachMatch = FOR_EACH_REGEX.exec(lineText)
    if (!forEachMatch) continue
    const indexMatch = lineText.match(INDEX_ATTR_REGEX)
    const forEachAttributeStart = lineText.indexOf('for-each=')
    const itemPosition = lineText.indexOf(forEachMatch[1], forEachAttributeStart)
    yield {
      itemName: forEachMatch[1],
      line: i,
      itemPos: itemPosition,
      indexName: indexMatch?.[1] ?? null,
    }
  }
}

export function findForEachInElement(
  document: vscode.TextDocument,
  currentLineIndex: number
): ForEachResult | null {
  return (
    findFirst(
      forEachCandidates(document, currentLineIndex),
      (result) => !isForEachScopeClosed(document, result.line, currentLineIndex)
    ) ?? null
  )
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

  let depth = 0

  for (let i = forEachLine; i < currentLine; i++) {
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
