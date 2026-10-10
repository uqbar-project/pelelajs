import * as path from 'node:path'
import {
  analyzeViewModelModule,
  classifyViewModelIssue,
  suggestViewModelClassName,
  type ViewModelIssue,
} from 'pelelajs/analysis'
import * as vscode from 'vscode'
import { findForEachInElement, parseForEachExpression } from '../parsers/documentParser'
import {
  extractNestedMembers,
  extractNestedProperties,
  isArrayCollection,
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
  if (issue.suggestedName.length === 0) {
    return makeDiagnostic(
      range,
      'diagnostics.viewModelNotFoundWithoutSuggestion',
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
  const analysis = analyzeViewModelModule(readFileContent(tsPath))
  const tsFileName = path.basename(tsPath)
  const suggestedName = suggestViewModelClassName(analysis)

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

function findCaseInsensitiveMember(members: string[], name: string): string | undefined {
  const nameLowerCase = name.toLowerCase()
  return members.find((member) => member.toLowerCase() === nameLowerCase)
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

  if (!members.properties.includes(firstPart) && !members.getters.includes(firstPart)) {
    return validateRootProperty(attribute, firstPart, members)
  }

  if (pathParts.length > 1) {
    return validateNestedPath(attribute, pathParts, tsPath, className)
  }

  return []
}

/**
 * Applies the property ladder to a root member: arrow functions and methods
 * get their own message, a case-insensitive match is reported as a typo, and
 * anything else is an unknown property.
 */
function validateRootProperty(
  attribute: AttrInfo,
  firstPart: string,
  members: ViewModelMembers
): vscode.Diagnostic[] {
  if (members.arrows.includes(firstPart)) {
    return [
      makeDiagnostic(
        attribute.valueRange ?? attribute.nameRange,
        'diagnostics.arrowFunctionNotAllowed',
        { name: firstPart },
        vscode.DiagnosticSeverity.Error
      ),
    ]
  }

  if (members.methods.includes(firstPart)) {
    return [
      makeDiagnostic(
        attribute.valueRange ?? attribute.nameRange,
        'diagnostics.methodNeedsGetter',
        { name: firstPart },
        vscode.DiagnosticSeverity.Error
      ),
    ]
  }

  const suggestedName =
    findCaseInsensitiveMember(members.properties, firstPart) ??
    findCaseInsensitiveMember(members.getters, firstPart) ??
    findCaseInsensitiveMember(members.methods, firstPart) ??
    findCaseInsensitiveMember(members.arrows, firstPart)
  if (suggestedName) {
    return [
      makeDiagnostic(
        attribute.valueRange ?? attribute.nameRange,
        'diagnostics.propertyCaseMismatch',
        { name: firstPart, suggestedName },
        vscode.DiagnosticSeverity.Error
      ),
    ]
  }

  return [
    makeDiagnostic(
      attribute.valueRange ?? attribute.nameRange,
      'diagnostics.propertyNotFound',
      { name: firstPart },
      vscode.DiagnosticSeverity.Error
    ),
  ]
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

const FOR_EACH_EXPECTED_FORMAT = 'item of collection'
const FOR_EACH_IDENTIFIER = '[A-Za-z_$][A-Za-z0-9_$]*'
const FOR_EACH_EXPRESSION_PATTERN = new RegExp(
  `^(${FOR_EACH_IDENTIFIER})\\s+of\\s+(${FOR_EACH_IDENTIFIER}(\\.${FOR_EACH_IDENTIFIER})*)$`
)

/**
 * Validates every for-each collection against the view model, mirroring the
 * runtime checks in bindForEach: expression syntax first, then existence of
 * the collection with the same ladder as other bindings, then the array type.
 * Each step stops at the first failure so one attribute yields one diagnostic.
 * The strict pattern lives here instead of reusing the document parser one,
 * which only locates loop scopes and stays permissive on purpose.
 */
export function validateForEachCollections(
  tags: TagInfo[],
  tsPath: string,
  members: ViewModelMembers,
  className: string
): vscode.Diagnostic[] {
  return tags.flatMap((tag) =>
    tag.attributes
      .filter((attribute) => attribute.name === 'for-each')
      .flatMap((attribute) => validateForEachAttribute(attribute, tsPath, members, className))
  )
}

function parseStrictForEachCollection(value: string): string | null {
  const collectionMatch = FOR_EACH_EXPRESSION_PATTERN.exec(value.trim())
  return collectionMatch?.[2] ?? null
}

function validateForEachAttribute(
  attribute: AttrInfo,
  tsPath: string,
  members: ViewModelMembers,
  className: string
): vscode.Diagnostic[] {
  const collectionName = parseStrictForEachCollection(attribute.value)
  if (collectionName === null) {
    if (attribute.value.trim() === '') return []
    return [
      makeDiagnostic(
        attribute.valueRange ?? attribute.nameRange,
        'diagnostics.forEachInvalidSyntax',
        { expression: attribute.value, format: FOR_EACH_EXPECTED_FORMAT },
        vscode.DiagnosticSeverity.Error
      ),
    ]
  }
  const pathParts = collectionName.split('.')
  const rootName = pathParts[0]
  if (!members.properties.includes(rootName) && !members.getters.includes(rootName)) {
    return validateRootProperty(attribute, rootName, members)
  }
  if (pathParts.length > 1 && !pathExists(tsPath, pathParts, className)) {
    const lastPart = pathParts[pathParts.length - 1]
    return [
      makeDiagnostic(
        attribute.valueRange ?? attribute.nameRange,
        'diagnostics.propertyNotFound',
        { name: lastPart },
        vscode.DiagnosticSeverity.Error
      ),
    ]
  }
  if (isArrayCollection(tsPath, pathParts, className) === false) {
    return [
      makeDiagnostic(
        attribute.valueRange ?? attribute.nameRange,
        'diagnostics.forEachNotArray',
        { name: collectionName },
        vscode.DiagnosticSeverity.Error
      ),
    ]
  }
  return []
}

/**
 * Applies the handler ladder to a single member: it must be a method. Arrow
 * functions, getters and plain properties get their own message, and a
 * case-insensitive match is reported as a typo. `isItemMember` reports the
 * member of a `for-each` item, which the messages name as the full attribute
 * value (e.g. `link.navigate`) rather than the bare member name.
 */
function validateEventMember(
  attribute: AttrInfo,
  memberName: string,
  members: ViewModelMembers,
  isItemMember: boolean
): vscode.Diagnostic[] {
  const range = attribute.valueRange ?? attribute.nameRange
  const reportedName = isItemMember ? attribute.value : memberName

  if (members.methods.includes(memberName)) return []

  const rejection = members.arrows.includes(memberName)
    ? 'diagnostics.arrowFunctionAsMethod'
    : members.getters.includes(memberName)
      ? 'diagnostics.getterAsMethod'
      : members.properties.includes(memberName)
        ? 'diagnostics.propertyAsMethod'
        : null
  if (rejection !== null) {
    return [
      makeDiagnostic(range, rejection, { name: reportedName }, vscode.DiagnosticSeverity.Error),
    ]
  }

  const suggestedName =
    findCaseInsensitiveMember(members.methods, memberName) ??
    findCaseInsensitiveMember(members.getters, memberName) ??
    findCaseInsensitiveMember(members.properties, memberName) ??
    findCaseInsensitiveMember(members.arrows, memberName)
  if (suggestedName) {
    return [
      makeDiagnostic(
        range,
        'diagnostics.methodCaseMismatch',
        { name: reportedName, suggestedName },
        vscode.DiagnosticSeverity.Error
      ),
    ]
  }

  return [
    makeDiagnostic(
      range,
      'diagnostics.methodNotFound',
      { name: memberName },
      vscode.DiagnosticSeverity.Error
    ),
  ]
}

/**
 * Validates a handler whose path starts with the iterated item of a `for-each`
 * (e.g. `link.navigate`) against the members of the item's own type, applying
 * the same ladder as a view model handler. Only single-segment paths are
 * validated: deeper paths address nested types whose members are out of scope,
 * so they produce no diagnostics.
 */
function validateForEachEventMethod(
  attribute: AttrInfo,
  lineIndex: number,
  tsPath: string,
  document: vscode.TextDocument,
  className: string
): vscode.Diagnostic[] | null {
  const forEachResult = findForEachInElement(document, lineIndex)
  if (!forEachResult) return null
  if (forEachResult.indexName === attribute.value) return []
  if (!attribute.value.startsWith(`${forEachResult.itemName}.`)) return null

  const forEachLine = document.lineAt(forEachResult.line).text
  const forEachExpression = parseForEachExpression(forEachLine)
  if (!forEachExpression) return []

  const remainingParts = attribute.value.split('.').slice(1)
  if (remainingParts.length !== 1) return []
  const memberName = remainingParts[0]
  if (memberName === undefined) return []

  const itemMembers = extractNestedMembers(tsPath, forEachExpression.collectionName, className)
  if (itemMembers === null) return []

  return validateEventMember(attribute, memberName, itemMembers, true)
}

export function validateEventMethods(
  tags: TagInfo[],
  members: ViewModelMembers,
  tsPath: string,
  document: vscode.TextDocument,
  className: string
): vscode.Diagnostic[] {
  return tags.flatMap((tag) =>
    tag.attributes
      .filter((attribute) => isEventAttribute(attribute.name))
      .flatMap((attribute) => {
        const forEachDiagnostics = validateForEachEventMethod(
          attribute,
          tag.lineIndex,
          tsPath,
          document,
          className
        )
        if (forEachDiagnostics !== null) return forEachDiagnostics

        return validateEventMember(attribute, attribute.value, members, false)
      })
  )
}
