import * as vscode from 'vscode'
import type { AttrInfo, TagInfo } from './types'

const TAG_PATTERN = /<(\w[\w-]*)((?:\s+(?:[^>"']|"[^"]*"|'[^']*')*?)?)\s*\/?>/g
const ATTR_PATTERN = /([\w-]+)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?/g

function offsetToPosition(offset: number, lineStarts: number[]): vscode.Position {
  const line = lineStarts.findIndex((_start, i) => offset < (lineStarts[i + 1] ?? Infinity))
  return new vscode.Position(line, offset - lineStarts[line])
}

function buildLineStartOffsets(fullText: string): number[] {
  const lines = fullText.split('\n')
  return lines.slice(0, -1).reduce(
    (acc, line) => {
      acc.push(acc[acc.length - 1] + line.length + 1)
      return acc
    },
    [0]
  )
}

function collectAttributes(
  attributeString: string,
  attributeStringStart: number,
  lineStarts: number[]
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
          offsetToPosition(matchEnd - value.length, lineStarts),
          offsetToPosition(matchEnd, lineStarts)
        )
      : null

    return {
      name,
      value,
      nameRange: new vscode.Range(
        offsetToPosition(attrStart, lineStarts),
        offsetToPosition(nameEnd, lineStarts)
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

  const lineStarts = buildLineStartOffsets(fullText)

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
      lineIndex: offsetToPosition(tagStart, lineStarts).line,
      attributes: collectAttributes(attributeString, tagStart + 1 + tagName.length, lineStarts),
    })
    return tags
  }, [] as TagInfo[])
}
