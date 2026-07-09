import type * as vscode from 'vscode'

export interface AttrInfo {
  name: string
  value: string
  nameRange: vscode.Range
  valueRange: vscode.Range | null
}

export interface TagInfo {
  tagName: string
  lineIndex: number
  attributes: AttrInfo[]
}
