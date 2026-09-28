import { isPelelaRootTag, isStandardHtmlTag } from 'pelelajs/dom'
import * as vscode from 'vscode'
import { findChildTemplatePath } from '../utils/componentIndex'
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
  const childPelelaPath = findChildTemplatePath(tagName, document)
  if (childPelelaPath === null) return null

  const viewModelName = getViewModelName(scanFile(childPelelaPath))
  if (viewModelName === undefined) return null

  const childTsPath = findViewModelFile(vscode.Uri.file(childPelelaPath))
  if (childTsPath === null) return null

  return { tsPath: childTsPath, viewModelName }
}
