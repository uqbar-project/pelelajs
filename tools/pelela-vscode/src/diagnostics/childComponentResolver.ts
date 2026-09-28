import { isPelelaRootTag, isStandardHtmlTag } from 'pelelajs/dom'
import * as vscode from 'vscode'
import { findChildTemplate } from '../utils/componentIndex'
import { findViewModelFile } from '../utils/fileUtils'

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
  const child = findChildTemplate(tagName, document)
  if (child === null) return null

  const childTsPath = findViewModelFile(vscode.Uri.file(child.templatePath))
  if (childTsPath === null) return null

  return { tsPath: childTsPath, viewModelName: child.viewModelName }
}
