import { toCamelCase } from 'pelelajs'
import * as vscode from 'vscode'
import { t } from '../i18n/index'
import { acquireViewModelLanguageService } from '../parsers/viewModelLanguageServiceRegistry'
import { extractViewModelMembers, type ViewModelMembers } from '../parsers/viewModelParser'
import { isSettableField } from './bindingTargetValidator'
import { isComponentTag, resolveChildComponent } from './childComponentResolver'
import { makeDiagnostic } from './createDiagnostic'
import type { AttrInfo, TagInfo } from './types'

const CONST_PREFIX = 'const-'

/**
 * Plain scalar types keep their dedicated wording, because a bare type name reads
 * worse than a sentence. Anything else is a union of allowed literals and is
 * named as the checker resolved it.
 */
const SCALAR_EXPECTED_MESSAGES: Record<string, string> = {
  number: 'diagnostics.constValueExpectedNumber',
  boolean: 'diagnostics.constValueExpectedBoolean',
}

function isConstAttribute(name: string): boolean {
  return name.startsWith(CONST_PREFIX)
}

function expectedMessageFor(expectedTypeText: string): string {
  const scalarKey = SCALAR_EXPECTED_MESSAGES[expectedTypeText]
  return scalarKey === undefined
    ? t('diagnostics.constValueExpected', { expected: expectedTypeText })
    : t(scalarKey)
}

interface ResolvedChild {
  tsPath: string
  viewModelName: string
  members: ViewModelMembers
}

function resolveChild(tag: TagInfo, document: vscode.TextDocument): ResolvedChild | null {
  const childComponent = resolveChildComponent(tag.tagName, document)
  if (childComponent === null) return null

  return {
    tsPath: childComponent.tsPath,
    viewModelName: childComponent.viewModelName,
    members: extractViewModelMembers(childComponent.tsPath, childComponent.viewModelName),
  }
}

function buildConstValueDiagnostic(
  attribute: AttrInfo,
  tag: TagInfo,
  viewModelName: string,
  expectedMessage: string
): vscode.Diagnostic {
  return makeDiagnostic(
    attribute.valueRange ?? attribute.nameRange,
    'diagnostics.constValueInvalid',
    {
      name: toCamelCase(attribute.name.slice(CONST_PREFIX.length)),
      value: attribute.value,
      expected: expectedMessage,
      tag: tag.tagName,
      viewModel: viewModelName,
    },
    vscode.DiagnosticSeverity.Error
  )
}

function validateConstAttribute(params: {
  attribute: AttrInfo
  tag: TagInfo
  child: ResolvedChild
}): vscode.Diagnostic[] {
  const { attribute, tag, child } = params
  const propertyName = toCamelCase(attribute.name.slice(CONST_PREFIX.length))
  if (!isSettableField(child.members, propertyName)) return []

  const verdict = acquireViewModelLanguageService().constValue({
    tsPath: child.tsPath,
    className: child.viewModelName,
    propertyName,
    rawValue: attribute.value,
  })

  if (verdict.accepted !== false) return []

  if (verdict.reason === 'nonLiteralType') {
    return [
      buildConstValueDiagnostic(
        attribute,
        tag,
        child.viewModelName,
        t('diagnostics.constValueUnsupported')
      ),
    ]
  }

  return [
    buildConstValueDiagnostic(
      attribute,
      tag,
      child.viewModelName,
      expectedMessageFor(verdict.expectedTypeText)
    ),
  ]
}

export function validateConstValues(
  tags: TagInfo[],
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  return tags.flatMap((tag) => {
    if (!isComponentTag(tag.tagName)) return []
    const constAttributes = tag.attributes.filter((attribute) => isConstAttribute(attribute.name))
    if (constAttributes.length === 0) return []

    const child = resolveChild(tag, document)
    if (child === null) return []

    return constAttributes.flatMap((attribute) => validateConstAttribute({ attribute, tag, child }))
  })
}
