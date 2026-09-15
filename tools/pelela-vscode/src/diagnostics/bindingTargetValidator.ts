import { toCamelCase, toKebabCase } from 'pelelajs'
import { extractViewModelPropertyTypes, type ViewModelPropertyTypes } from 'pelelajs/analysis'
import * as vscode from 'vscode'
import { t } from '../i18n/index'
import { extractViewModelMembers, type ViewModelMembers } from '../parsers/viewModelParser'
import { findViewModelFile, readFileContent } from '../utils/fileUtils'
import { isComponentTag, resolveChildComponent } from './childComponentResolver'
import { makeDiagnostic } from './createDiagnostic'
import { getViewModelName } from './scanDocument'
import type { AttrInfo, TagInfo } from './types'

const BINDING_PREFIXES = ['const-', 'prop-', 'link-'] as const

type BindingPrefix = (typeof BINDING_PREFIXES)[number]

function prefixOfAttribute(name: string): BindingPrefix | null {
  return BINDING_PREFIXES.find((prefix) => name.startsWith(prefix)) ?? null
}

function findCaseInsensitiveMember(members: ViewModelMembers, name: string): string | undefined {
  const nameLowerCase = name.toLowerCase()
  const allMembers = [
    ...members.properties,
    ...members.getters,
    ...members.methods,
    ...members.arrows,
  ]
  return allMembers.find((member) => member.toLowerCase() === nameLowerCase)
}

export function isSettableField(members: ViewModelMembers, childKey: string): boolean {
  const isField = members.properties.includes(childKey)
  const isGetter = members.getters.includes(childKey)
  return isField && !isGetter
}

function buildChildPropertyDiagnostic(params: {
  attribute: AttrInfo
  tag: TagInfo
  viewModelName: string
  childKey: string
  prefix: BindingPrefix
  suggestedName: string | undefined
}): vscode.Diagnostic {
  const { attribute, tag, viewModelName, childKey, prefix, suggestedName } = params
  const messageParams = {
    name: childKey,
    tag: tag.tagName,
    viewModel: viewModelName,
  }

  if (suggestedName === undefined) {
    return makeDiagnostic(
      attribute.nameRange,
      'diagnostics.childPropertyNotFound',
      messageParams,
      vscode.DiagnosticSeverity.Error
    )
  }

  return makeDiagnostic(
    attribute.nameRange,
    'diagnostics.childPropertyCaseMismatch',
    { ...messageParams, suggestedName: `${prefix}${toKebabCase(suggestedName)}` },
    vscode.DiagnosticSeverity.Error
  )
}

function validateChildProperty(params: {
  attribute: AttrInfo
  tag: TagInfo
  viewModelName: string
  members: ViewModelMembers
  prefix: BindingPrefix
}): vscode.Diagnostic[] {
  const { attribute, tag, viewModelName, members, prefix } = params
  const childKey = toCamelCase(attribute.name.slice(prefix.length))
  if (childKey === '') return []

  if (isSettableField(members, childKey)) return []

  const suggestedName = findCaseInsensitiveMember(members, childKey)
  return [
    buildChildPropertyDiagnostic({
      attribute,
      tag,
      viewModelName,
      childKey,
      prefix,
      suggestedName,
    }),
  ]
}

export function validateBindingTargets(
  tags: TagInfo[],
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  return tags.flatMap((tag) => {
    if (!isComponentTag(tag.tagName)) return []

    const bindingAttributes = tag.attributes.flatMap((attribute) => {
      const prefix = prefixOfAttribute(attribute.name)
      return prefix === null ? [] : [{ attribute, prefix }]
    })
    if (bindingAttributes.length === 0) return []

    const childComponent = resolveChildComponent(tag.tagName, document)
    if (childComponent === null) return []

    const members = extractViewModelMembers(childComponent.tsPath, childComponent.viewModelName)

    return bindingAttributes.flatMap(({ attribute, prefix }) =>
      validateChildProperty({
        attribute,
        tag,
        viewModelName: childComponent.viewModelName,
        members,
        prefix,
      })
    )
  })
}

const TYPE_BINDING_PREFIXES = ['prop-', 'link-'] as const

type TypeBindingPrefix = (typeof TYPE_BINDING_PREFIXES)[number]

const KIND_LABELS: Record<string, string> = {
  number: 'diagnostics.bindingKindNumber',
  string: 'diagnostics.bindingKindString',
  boolean: 'diagnostics.bindingKindBoolean',
  other: 'diagnostics.bindingKindOther',
}

function typeBindingPrefixOf(name: string): TypeBindingPrefix | null {
  return TYPE_BINDING_PREFIXES.find((prefix) => name.startsWith(prefix)) ?? null
}

function buildBindingTypeDiagnostic(params: {
  attribute: AttrInfo
  tag: TagInfo
  parentKey: string
  childKey: string
  parentKind: string
  childKind: string
}): vscode.Diagnostic {
  const { attribute, tag, parentKey, childKey, parentKind, childKind } = params
  return makeDiagnostic(
    attribute.valueRange ?? attribute.nameRange,
    'diagnostics.bindingTypeMismatch',
    {
      attr: attribute.name,
      tag: tag.tagName,
      parentKey,
      childKey,
      parentKind: t(KIND_LABELS[parentKind] ?? ''),
      childKind: t(KIND_LABELS[childKind] ?? ''),
    },
    vscode.DiagnosticSeverity.Error
  )
}

function validateBindingType(params: {
  attribute: AttrInfo
  tag: TagInfo
  parentKindMap: ViewModelPropertyTypes
  childKindMap: ViewModelPropertyTypes
  childMembers: ViewModelMembers
  prefix: TypeBindingPrefix
}): vscode.Diagnostic[] {
  const { attribute, tag, parentKindMap, childKindMap, childMembers, prefix } = params
  const childKey = toCamelCase(attribute.name.slice(prefix.length))
  if (childKey === '') return []
  if (!isSettableField(childMembers, childKey)) return []

  const parentKey = attribute.value
  if (parentKey.includes('.')) return []

  const childKind = childKindMap[childKey]
  const parentKind = parentKindMap[parentKey]
  if (childKind === undefined || parentKind === undefined) return []
  if (childKind === 'unknown' || parentKind === 'unknown') return []
  return childKind === parentKind
    ? []
    : [buildBindingTypeDiagnostic({ attribute, tag, parentKey, childKey, parentKind, childKind })]
}

export function validateBindingTypes(
  tags: TagInfo[],
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  const parentViewModelName = getViewModelName(tags)
  if (parentViewModelName === undefined) return []
  const parentTsPath = findViewModelFile(document.uri)
  if (parentTsPath === null) return []

  const parentKindMap = extractViewModelPropertyTypes(
    readFileContent(parentTsPath),
    parentViewModelName
  )

  return tags.flatMap((tag) => {
    if (!isComponentTag(tag.tagName)) return []

    const bindingAttributes = tag.attributes.flatMap((attribute) => {
      const prefix = typeBindingPrefixOf(attribute.name)
      return prefix === null ? [] : [{ attribute, prefix }]
    })
    if (bindingAttributes.length === 0) return []

    const childComponent = resolveChildComponent(tag.tagName, document)
    if (childComponent === null) return []

    const childKindMap = extractViewModelPropertyTypes(
      readFileContent(childComponent.tsPath),
      childComponent.viewModelName
    )
    const childMembers = extractViewModelMembers(
      childComponent.tsPath,
      childComponent.viewModelName
    )

    return bindingAttributes.flatMap(({ attribute, prefix }) =>
      validateBindingType({
        attribute,
        tag,
        parentKindMap,
        childKindMap,
        childMembers,
        prefix,
      })
    )
  })
}
