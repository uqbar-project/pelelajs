import * as vscode from 'vscode'
import {
  getHtmlAttributes,
  getPelelaAttributes,
  getPelelaAttributesForTag,
} from '../utils/htmlUtils'
import { makeDiagnostic } from './createDiagnostic'
import type { TagInfo } from './types'

const HTML_KNOWN = getHtmlAttributes()
const PELELA_KNOWN = getPelelaAttributes()

function isKnownAttribute(name: string): boolean {
  return (
    HTML_KNOWN.includes(name) ||
    PELELA_KNOWN.includes(name) ||
    name.startsWith('data-') ||
    name.startsWith('aria-')
  )
}

export function validateUnknownAttributes(tags: TagInfo[]): vscode.Diagnostic[] {
  return tags.flatMap((tag) =>
    tag.attributes
      .filter((attribute) => !isKnownAttribute(attribute.name))
      .map((attribute) =>
        makeDiagnostic(
          attribute.nameRange,
          'diagnostics.unknownAttribute',
          { name: attribute.name },
          vscode.DiagnosticSeverity.Warning
        )
      )
  )
}

export function validateTagRestrictions(tags: TagInfo[]): vscode.Diagnostic[] {
  return tags.flatMap((tag) => {
    const allowed = getPelelaAttributesForTag(tag.tagName)
    return tag.attributes
      .filter(
        (attribute) => PELELA_KNOWN.includes(attribute.name) && !allowed.includes(attribute.name)
      )
      .map((attribute) =>
        makeDiagnostic(
          attribute.nameRange,
          'diagnostics.attributeNotAllowed',
          { name: attribute.name, tag: tag.tagName },
          vscode.DiagnosticSeverity.Error
        )
      )
  })
}
