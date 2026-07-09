import * as vscode from 'vscode'
import type { AttrInfo, TagInfo } from './types'

const TAG_PATTERN = /<(\w[\w-]*)((?:\s+[^>]*?)?)\s*\/?>/g
const ATTR_PATTERN = /([\w-]+)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?/g

function calculateValueRange(
  lineIndex: number,
  nameEndInLine: number,
  value: string,
  _wrapper: '"' | "'"
): vscode.Range {
  const valueStart = nameEndInLine + 2
  return new vscode.Range(
    new vscode.Position(lineIndex, valueStart),
    new vscode.Position(lineIndex, valueStart + value.length)
  )
}

function collectAttributes(
  attributeString: string,
  lineText: string,
  lineIndex: number,
  tagNameEnd: number
): AttrInfo[] {
  return Array.from(attributeString.matchAll(ATTR_PATTERN)).reduce<{
    attrs: AttrInfo[]
    offset: number
  }>(
    (accumulator, match) => {
      const name = match[1]
      const doubleQuotedValue = match[2]
      const singleQuotedValue = match[3]
      const hasValue = doubleQuotedValue !== undefined || singleQuotedValue !== undefined
      const value = doubleQuotedValue ?? singleQuotedValue ?? ''
      const wrapper: '"' | "'" = doubleQuotedValue !== undefined ? '"' : "'"

      const nameStart = lineText.indexOf(name, accumulator.offset)
      if (nameStart === -1) return accumulator
      const nameEnd = nameStart + name.length

      const valueRange: vscode.Range | null = hasValue
        ? calculateValueRange(lineIndex, nameEnd, value, wrapper)
        : null

      return {
        attrs: [
          ...accumulator.attrs,
          {
            name,
            value,
            nameRange: new vscode.Range(
              new vscode.Position(lineIndex, nameStart),
              new vscode.Position(lineIndex, nameEnd)
            ),
            valueRange,
          },
        ],
        offset: nameEnd,
      }
    },
    { attrs: [], offset: tagNameEnd }
  ).attrs
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
        attributes: collectAttributes(attributeString, lineText, lineIndex, tagNameEnd),
      }
    })
  }).flat()
}
