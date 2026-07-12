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

export function scanDocument(document: vscode.TextDocument): TagInfo[] {
  const fullText = Array.from(
    { length: document.lineCount },
    (_, i) => document.lineAt(i).text
  ).join('\n')

  return Array.from(fullText.matchAll(TAG_PATTERN)).map((match) => {
    const tagName = match[1]
    const attributeString = match[2] ?? ''
    const tagStart = match.index ?? 0
    const attributeStringStart = tagStart + 1 + tagName.length
    const lineIndex = offsetToPosition(fullText, tagStart).line
    return {
      tagName,
      lineIndex,
      attributes: collectAttributes(attributeString, attributeStringStart, fullText),
    }
  })
}
