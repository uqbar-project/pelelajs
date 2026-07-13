import * as vscode from 'vscode'
import type { AttrInfo, TagInfo } from './types'

const TAG_PATTERN = /<(\w[\w-]*)((?:\s+(?:[^>"']|"[^"]*"|'[^']*')*?)?)\s*\/?>/g
const ATTR_PATTERN = /([\w-]+)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?/g

function offsetToPosition(fullText: string, offset: number): vscode.Position {
  const textUpToOffset = fullText.slice(0, offset)
  const line = textUpToOffset.split('\n').length - 1
  const lastNewline = textUpToOffset.lastIndexOf('\n')
  const column = lastNewline === -1 ? offset : offset - lastNewline - 1
  return new vscode.Position(line, column)
}

function collectAttributes(
  attributeString: string,
  attributeStringStart: number,
  fullText: string
): AttrInfo[] {
  return Array.from(attributeString.matchAll(ATTR_PATTERN)).map((match) => {
    const [fullMatch, name, doubleQuotedValue, singleQuotedValue] = match
    const value = doubleQuotedValue ?? singleQuotedValue ?? ''
    const hasValue = doubleQuotedValue !== undefined || singleQuotedValue !== undefined

    const attrStart = attributeStringStart + (match.index ?? 0)
    const matchEnd = attrStart + fullMatch.length - 1
    const nameEnd = attrStart + name.length

    const valueRange = hasValue
      ? new vscode.Range(
          offsetToPosition(fullText, matchEnd - value.length),
          offsetToPosition(fullText, matchEnd)
        )
      : null

    return {
      name,
      value,
      nameRange: new vscode.Range(
        offsetToPosition(fullText, attrStart),
        offsetToPosition(fullText, nameEnd)
      ),
      valueRange,
    }
  })
}

const COMMENT_PATTERN = /<!--[\s\S]*?-->/g

function isInsideComment(
  offset: number,
  commentRanges: Array<{ start: number; end: number }>
): boolean {
  return commentRanges.some((range) => offset >= range.start && offset < range.end)
}

export function scanDocument(document: vscode.TextDocument): TagInfo[] {
  const fullText = Array.from(
    { length: document.lineCount },
    (_, i) => document.lineAt(i).text
  ).join('\n')

  const commentRanges = Array.from(fullText.matchAll(COMMENT_PATTERN)).map((match) => {
    const matchStart = match.index ?? 0
    return { start: matchStart, end: matchStart + match[0].length }
  })

  return Array.from(fullText.matchAll(TAG_PATTERN)).reduce((tags, match) => {
    const tagStart = match.index ?? 0
    if (isInsideComment(tagStart, commentRanges)) return tags
    const tagName = match[1]
    const attributeString = match[2] ?? ''
    tags.push({
      tagName,
      lineIndex: offsetToPosition(fullText, tagStart).line,
      attributes: collectAttributes(attributeString, tagStart + 1 + tagName.length, fullText),
    })
    return tags
  }, [] as TagInfo[])
}
