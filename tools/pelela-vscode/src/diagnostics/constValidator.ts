import { isNumberLiteral, parseBooleanLiteral, toCamelCase } from 'pelelajs'
import { extractViewModelPropertyTypes, type ViewModelPropertyTypes } from 'pelelajs/analysis'
import * as vscode from 'vscode'
import { t } from '../i18n/index'
import { extractViewModelMembers, type ViewModelMembers } from '../parsers/viewModelParser'
import { readFileContent } from '../utils/fileUtils'
import { isSettableField } from './bindingTargetValidator'
import { isComponentTag, resolveChildComponent } from './childComponentResolver'
import { makeDiagnostic } from './createDiagnostic'
import type { AttrInfo, TagInfo } from './types'

const CONST_PREFIX = 'const-'

function isConstAttribute(name: string): boolean {
  return name.startsWith(CONST_PREFIX)
}

function resolveChildPropertyTypes(
  tag: TagInfo,
  document: vscode.TextDocument
): { typeMap: ViewModelPropertyTypes; members: ViewModelMembers; viewModelName: string } | null {
  const childComponent = resolveChildComponent(tag.tagName, document)
  if (childComponent === null) return null

  return {
    typeMap: extractViewModelPropertyTypes(
      readFileContent(childComponent.tsPath),
      childComponent.viewModelName
    ),
    members: extractViewModelMembers(childComponent.tsPath, childComponent.viewModelName),
    viewModelName: childComponent.viewModelName,
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
  viewModelName: string
  typeMap: ViewModelPropertyTypes
  members: ViewModelMembers
}): vscode.Diagnostic[] {
  const { attribute, tag, viewModelName, typeMap, members } = params
  const childKey = toCamelCase(attribute.name.slice(CONST_PREFIX.length))
  if (!isSettableField(members, childKey)) return []
  const kind = typeMap[childKey]
  if (kind === undefined || kind === 'unknown') return []

  if (kind === 'number' && !isNumberLiteral(attribute.value)) {
    return [
      buildConstValueDiagnostic(
        attribute,
        tag,
        viewModelName,
        t('diagnostics.constValueExpectedNumber')
      ),
    ]
  }

  if (kind === 'boolean' && parseBooleanLiteral(attribute.value.trim()) === null) {
    return [
      buildConstValueDiagnostic(
        attribute,
        tag,
        viewModelName,
        t('diagnostics.constValueExpectedBoolean')
      ),
    ]
  }

  if (kind === 'other') {
    return [
      buildConstValueDiagnostic(
        attribute,
        tag,
        viewModelName,
        t('diagnostics.constValueUnsupported')
      ),
    ]
  }

  return []
}

export function validateConstValues(
  tags: TagInfo[],
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  return tags.flatMap((tag) => {
    if (!isComponentTag(tag.tagName)) return []
    const constAttributes = tag.attributes.filter((attribute) => isConstAttribute(attribute.name))
    if (constAttributes.length === 0) return []

    const resolvedChild = resolveChildPropertyTypes(tag, document)
    if (resolvedChild === null) return []

    return constAttributes.flatMap((attribute) =>
      validateConstAttribute({
        attribute,
        tag,
        viewModelName: resolvedChild.viewModelName,
        typeMap: resolvedChild.typeMap,
        members: resolvedChild.members,
      })
    )
  })
}
