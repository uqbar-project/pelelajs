import * as path from 'node:path'
import {
  analyzeViewModelModule,
  classifyViewModelIssue,
  pascalCaseFromFileName,
  type ViewModelIssue,
} from 'pelelajs/analysis'
import * as vscode from 'vscode'
import { findForEachInElement, parseForEachExpression } from '../parsers/documentParser'
import {
  extractNestedProperties,
  pathExists,
  type ViewModelMembers,
} from '../parsers/viewModelParser'
import { readFileContent } from '../utils/fileUtils'
import { makeDiagnostic } from './createDiagnostic'
import type { AttrInfo, TagInfo } from './types'

const BINDING_PREFIXES = ['bind-', 'prop-', 'link-']
const EVENT_NAMES = ['click', 'enter']

const viewModelNotAClassDiagnosticKeys = {
  Function: 'diagnostics.viewModelNotAClassFunction',
  Object: 'diagnostics.viewModelNotAClassObject',
} as const

function isBindingAttribute(name: string): boolean {
  return name === 'if' || BINDING_PREFIXES.some((prefix) => name.startsWith(prefix))
}

function isEventAttribute(name: string): boolean {
  return EVENT_NAMES.includes(name)
}

function buildViewModelIssueDiagnostic(
  range: vscode.Range,
  issue: Exclude<ViewModelIssue, { kind: 'ok' }>,
  tsFileName: string
): vscode.Diagnostic {
  if (issue.kind === 'missingExport') {
    return makeDiagnostic(
      range,
      'diagnostics.viewModelMissingExport',
      { name: issue.viewModelName, tsFileName },
      vscode.DiagnosticSeverity.Error
    )
  }
  if (issue.kind === 'wrongCase') {
    return makeDiagnostic(
      range,
      'diagnostics.viewModelWrongCase',
      { name: issue.viewModelName, expectedName: issue.expectedName },
      vscode.DiagnosticSeverity.Error
    )
  }
  if (issue.kind === 'notAClass') {
    return makeDiagnostic(
      range,
      viewModelNotAClassDiagnosticKeys[issue.declaredAs],
      { name: issue.viewModelName, tsFileName },
      vscode.DiagnosticSeverity.Error
    )
  }
  return makeDiagnostic(
    range,
    'diagnostics.viewModelNotFound',
    { name: issue.viewModelName, tsFileName, suggestedName: issue.suggestedName },
    vscode.DiagnosticSeverity.Error
  )
}

export function validateViewModelExistence(tags: TagInfo[], tsPath: string): vscode.Diagnostic[] {
  const suggestedName = pascalCaseFromFileName(path.basename(tsPath).replace(/\.ts$/, ''))
  const analysis = analyzeViewModelModule(readFileContent(tsPath))
  const tsFileName = path.basename(tsPath)

  return tags.flatMap((tag) =>
    tag.attributes
      .filter((attribute) => attribute.name === 'view-model')
      .flatMap((attribute) => {
        const issue = classifyViewModelIssue(analysis, attribute.value, suggestedName)
        if (issue.kind === 'ok') return []
        const range = attribute.valueRange ?? attribute.nameRange
        return [buildViewModelIssueDiagnostic(range, issue, tsFileName)]
      })
  )
}

export function validateBindingProperties(
  tags: TagInfo[],
  tsPath: string,
  members: ViewModelMembers,
  document: vscode.TextDocument,
  className: string
): vscode.Diagnostic[] {
  return tags.flatMap((tag) =>
    tag.attributes
      .filter((attribute) => isBindingAttribute(attribute.name))
      .flatMap((attribute) =>
        validatePropertyPath(attribute, tag.lineIndex, tsPath, members, document, className)
      )
  )
}

function validatePropertyPath(
  attribute: AttrInfo,
  lineIndex: number,
  tsPath: string,
  members: ViewModelMembers,
  document: vscode.TextDocument,
  className: string
): vscode.Diagnostic[] {
  const pathParts = attribute.value.split('.')
  const firstPart = pathParts[0]

  const forEachResult = findForEachInElement(document, lineIndex)

  if (forEachResult) {
    if (forEachResult.itemName === firstPart) {
      return validateForEachPath(attribute, pathParts, tsPath, forEachResult, document, className)
    }
    if (forEachResult.indexName === firstPart) {
      return []
    }
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
    return validateNestedPath(attribute, pathParts, tsPath, className)
  }

  return []
}

function validatePropertyExists(
  attribute: AttrInfo,
  fullPathParts: string[],
  tsPath: string,
  className: string
): vscode.Diagnostic[] {
  const parentPathParts = fullPathParts.slice(0, -1)
  const lastPart = fullPathParts[fullPathParts.length - 1]
  const parentProperties = extractNestedProperties(tsPath, parentPathParts, className)

  if (parentProperties.includes(lastPart)) return []

  return [
    makeDiagnostic(
      attribute.valueRange ?? attribute.nameRange,
      'diagnostics.propertyNotFound',
      { name: lastPart },
      vscode.DiagnosticSeverity.Error
    ),
  ]
}

function validateForEachPath(
  attribute: AttrInfo,
  pathParts: string[],
  tsPath: string,
  forEachResult: { line: number; itemName: string },
  document: vscode.TextDocument,
  className: string
): vscode.Diagnostic[] {
  const forEachLine = document.lineAt(forEachResult.line).text
  const forEachExpression = parseForEachExpression(forEachLine)
  if (!forEachExpression) return []

  const remainingParts = pathParts.slice(1)
  if (remainingParts.length === 0) return []

  const fullPath = [...forEachExpression.collectionName.split('.'), ...remainingParts]
  if (pathExists(tsPath, fullPath, className)) return []

  const lastPart = fullPath[fullPath.length - 1]
  return [
    makeDiagnostic(
      attribute.valueRange ?? attribute.nameRange,
      'diagnostics.propertyNotFound',
      { name: lastPart },
      vscode.DiagnosticSeverity.Error
    ),
  ]
}

function validateNestedPath(
  attribute: AttrInfo,
  pathParts: string[],
  tsPath: string,
  className: string
): vscode.Diagnostic[] {
  return validatePropertyExists(attribute, pathParts, tsPath, className)
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
