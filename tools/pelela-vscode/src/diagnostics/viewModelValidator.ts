import * as vscode from 'vscode'
import { findClassDefinition } from '../parsers/definitionFinder'
import { findForEachInElement, parseForEachExpression } from '../parsers/documentParser'
import { extractNestedProperties, type ViewModelMembers } from '../parsers/viewModelParser'
import { makeDiagnostic } from './createDiagnostic'
import type { AttrInfo, TagInfo } from './types'

const BINDING_PREFIXES = ['bind-', 'prop-', 'link-']
const EVENT_NAMES = ['click', 'enter']

function isBindingAttribute(name: string): boolean {
  return name === 'if' || BINDING_PREFIXES.some((prefix) => name.startsWith(prefix))
}

function isEventAttribute(name: string): boolean {
  return EVENT_NAMES.includes(name)
}

export function validateViewModelExistence(tags: TagInfo[], tsPath: string): vscode.Diagnostic[] {
  return tags.flatMap((tag) =>
    tag.attributes
      .filter((attribute) => attribute.name === 'view-model')
      .filter((attribute) => !findClassDefinition(tsPath, attribute.value))
      .map((attribute) =>
        makeDiagnostic(
          attribute.valueRange ?? attribute.nameRange,
          'diagnostics.viewModelNotFound',
          { name: attribute.value },
          vscode.DiagnosticSeverity.Error
        )
      )
  )
}

export function validateBindingProperties(
  tags: TagInfo[],
  tsPath: string,
  members: ViewModelMembers,
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  return tags.flatMap((tag) =>
    tag.attributes
      .filter((attribute) => isBindingAttribute(attribute.name))
      .flatMap((attribute) =>
        validatePropertyPath(attribute, tag.lineIndex, tsPath, members, document)
      )
  )
}

function validatePropertyPath(
  attribute: AttrInfo,
  lineIndex: number,
  tsPath: string,
  members: ViewModelMembers,
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  const pathParts = attribute.value.split('.')
  const firstPart = pathParts[0]

  const forEachResult = findForEachInElement(document, lineIndex)
  const isInForEach = forEachResult !== null

  if (isInForEach && forEachResult.itemName === firstPart) {
    return validateForEachPath(attribute, pathParts, tsPath, forEachResult, document)
  }

  if (!members.properties.includes(firstPart)) {
    return [
      makeDiagnostic(
        attribute.valueRange ?? attribute.nameRange,
        'diagnostics.propertyNotFound',
        { name: firstPart },
        vscode.DiagnosticSeverity.Error
      ),
    ]
  }

  if (pathParts.length > 1) {
    return validateNestedPath(attribute, pathParts, tsPath)
  }

  return []
}

function validateForEachPath(
  attribute: AttrInfo,
  pathParts: string[],
  tsPath: string,
  forEachResult: { line: number; itemName: string },
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  const forEachLine = document.lineAt(forEachResult.line).text
  const forEachExpression = parseForEachExpression(forEachLine)
  if (!forEachExpression) return []

  const remainingParts = pathParts.slice(1)
  if (remainingParts.length === 0) return []

  const nestedProperties = extractNestedProperties(tsPath, [forEachExpression.collectionName])
  const lastPart = remainingParts[remainingParts.length - 1]

  if (!nestedProperties.includes(lastPart)) {
    return [
      makeDiagnostic(
        attribute.valueRange ?? attribute.nameRange,
        'diagnostics.propertyNotFound',
        { name: lastPart },
        vscode.DiagnosticSeverity.Error
      ),
    ]
  }

  return []
}

function validateNestedPath(
  attribute: AttrInfo,
  pathParts: string[],
  tsPath: string
): vscode.Diagnostic[] {
  const nestedProperties = extractNestedProperties(tsPath, pathParts)
  if (nestedProperties.length === 0) return []

  const lastPart = pathParts[pathParts.length - 1]
  if (!nestedProperties.includes(lastPart)) {
    return [
      makeDiagnostic(
        attribute.valueRange ?? attribute.nameRange,
        'diagnostics.propertyNotFound',
        { name: lastPart },
        vscode.DiagnosticSeverity.Error
      ),
    ]
  }

  return []
}

export function validateEventMethods(
  tags: TagInfo[],
  members: ViewModelMembers
): vscode.Diagnostic[] {
  return tags.flatMap((tag) =>
    tag.attributes
      .filter((attribute) => isEventAttribute(attribute.name))
      .filter((attribute) => !members.methods.includes(attribute.value))
      .map((attribute) =>
        makeDiagnostic(
          attribute.valueRange ?? attribute.nameRange,
          'diagnostics.methodNotFound',
          { name: attribute.value },
          vscode.DiagnosticSeverity.Error
        )
      )
  )
}
