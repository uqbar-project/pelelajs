import * as vscode from 'vscode'
import type { AttrInfo, TagInfo } from './types'

const TAG_PATTERN = /<(\w[\w-]*)((?:\s+(?:[^>"']|"[^"]*"|'[^']*')*?)?)\s*\/?>/g
const ATTR_PATTERN = /([\w-]+)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?/g

function collectAttributes(
  attributeString: string,
  lineIndex: number,
  tagNameEnd: number
): AttrInfo[] {
  return Array.from(attributeString.matchAll(ATTR_PATTERN)).map((match) => {
    const [fullMatch, name, doubleQuotedValue, singleQuotedValue] = match
    const value = doubleQuotedValue ?? singleQuotedValue ?? ''
    const hasValue = doubleQuotedValue !== undefined || singleQuotedValue !== undefined

    const matchStart = tagNameEnd + (match.index ?? 0)
    const nameEnd = matchStart + name.length
    const toPosition = (offset: number) => new vscode.Position(lineIndex, offset)

    const valueRange = hasValue
      ? new vscode.Range(
          toPosition(matchStart + fullMatch.length - 1 - value.length),
          toPosition(matchStart + fullMatch.length - 1)
        )
      : null

    return {
      name,
      value,
      nameRange: new vscode.Range(toPosition(matchStart), toPosition(nameEnd)),
      valueRange,
    }
  })
}

export function scanDocument(document: vscode.TextDocument): TagInfo[] {
  return Array.from({ length: document.lineCount }, (_, lineIndex) => {
    const lineText = document.lineAt(lineIndex).text
    return Array.from(lineText.matchAll(TAG_PATTERN)).map((match) => {
      const tagName = match[1]
      const attributeString = match[2] ?? ''
      const tagNameEnd = (match.index ?? 0) + 1 + tagName.length
      return {
        tagName,
        lineIndex,
        attributes: collectAttributes(attributeString, lineIndex, tagNameEnd),
      }
    })
  }).flat()
}
