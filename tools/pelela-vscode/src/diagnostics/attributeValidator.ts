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

function matchesAttribute(name: string, list: string[]): boolean {
  return list.some((entry) => (entry.endsWith('-') ? name.startsWith(entry) : entry === name))
}

function isPelelaAttribute(name: string): boolean {
  return matchesAttribute(name, PELELA_KNOWN)
}

function isKnownAttribute(name: string): boolean {
  return matchesAttribute(name, HTML_KNOWN) || isPelelaAttribute(name) || name.startsWith('on')
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
        (attribute) =>
          isPelelaAttribute(attribute.name) && !matchesAttribute(attribute.name, allowed)
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
