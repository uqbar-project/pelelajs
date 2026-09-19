import * as fs from 'node:fs'
import * as path from 'node:path'
import { isPelelaRootTag, isStandardHtmlTag } from 'pelelajs/dom'
import * as vscode from 'vscode'
import { findViewModelFile } from '../utils/fileUtils'
import { getViewModelName, scanFile } from './scanDocument'

export function isComponentTag(tagName: string): boolean {
  return !isStandardHtmlTag(tagName) && !isPelelaRootTag(tagName)
}

export interface ResolvedChildComponent {
  tsPath: string
  viewModelName: string
}

export function resolveChildComponent(
  tagName: string,
  document: vscode.TextDocument
): ResolvedChildComponent | null {
  const tagDirectory = path.dirname(document.uri.fsPath)
  const childPelelaPath = path.join(tagDirectory, `${tagName}.pelela`)
  if (!fs.existsSync(childPelelaPath)) return null

  const viewModelName = getViewModelName(scanFile(childPelelaPath))
  if (viewModelName === undefined) return null

  const childTsPath = findViewModelFile(vscode.Uri.file(childPelelaPath))
  if (childTsPath === null) return null

  return { tsPath: childTsPath, viewModelName }
}
