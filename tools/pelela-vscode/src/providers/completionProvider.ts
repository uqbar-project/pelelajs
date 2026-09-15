// biome-ignore-all lint/suspicious/noTemplateCurlyInString: VSCode snippet syntax
import { toKebabCase } from 'pelelajs'
import * as vscode from 'vscode'
import { isSettableField } from '../diagnostics/bindingTargetValidator'
import { isComponentTag, resolveChildComponent } from '../diagnostics/childComponentResolver'
import { getViewModelName, scanDocument } from '../diagnostics/scanDocument'
import { t } from '../i18n/index'
import {
  type ForEachResult,
  findForEachInElement,
  getAttributeValueMatch,
  getCurrentAttributeName,
  getCurrentTagName,
  isInsideTag,
  isStartingTag,
  parseForEachExpression,
  parsePropertyPath,
} from '../parsers/documentParser'
import { extractNestedProperties, extractViewModelMembers } from '../parsers/viewModelParser'
import { findViewModelFile } from '../utils/fileUtils'
import {
  getHtmlAttributesForTag,
  getHtmlElements,
  getPelelaAttributesForTag,
} from '../utils/htmlUtils'

const EVENT_ATTRIBUTES = new Set(['click', 'enter'])
const PELELA_ATTRIBUTE_NAMES = new Set(['click', 'enter', 'if', 'for-each'])
const CHILD_BINDING_PREFIXES = ['const-', 'prop-', 'link-'] as const

export async function provideCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
  _token: vscode.CancellationToken,
  _context: vscode.CompletionContext
): Promise<vscode.CompletionItem[]> {
  const lineText = document.lineAt(position.line).text
  const textBeforeCursor = lineText.slice(0, position.character)
  const attributeName = getCurrentAttributeName(lineText, position.character)

  if (attributeName) {
    return await provideAttributeValueCompletions(
      document,
      position,
      attributeName,
      textBeforeCursor
    )
  }

  const items: vscode.CompletionItem[] = []
  if (isStartingTag(textBeforeCursor)) {
    addHtmlElementCompletions(items)
  } else if (isInsideTag(textBeforeCursor)) {
    const tagName = getCurrentTagName(textBeforeCursor)
    const typedChildPrefix = CHILD_BINDING_PREFIXES.find((candidate) =>
      textBeforeCursor.endsWith(candidate)
    )
    addHtmlAttributeCompletions(items, tagName ?? undefined)
    addPelelaAttributeCompletions(items, tagName, document, {
      skipChildProperties: typedChildPrefix !== undefined,
    })
    if (tagName !== null && typedChildPrefix !== undefined) {
      addTypedChildPropertyCompletions({
        items,
        document,
        tagName,
        prefix: typedChildPrefix,
        textBeforeCursor,
        position,
      })
    }
  }

  return items
}

function addHtmlElementCompletions(items: vscode.CompletionItem[]): void {
  getHtmlElements().forEach((tag) => {
    const item = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Property)
    item.sortText = `z${tag}`
    items.push(item)
  })
}

function addHtmlAttributeCompletions(items: vscode.CompletionItem[], tagName?: string): void {
  getHtmlAttributesForTag(tagName ?? '').forEach((attr: string) => {
    const item = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Property)
    item.insertText = new vscode.SnippetString(`${attr}="\${1}"`)
    item.sortText = `z${attr}`
    items.push(item)
  })
}

export function addPelelaAttributeCompletions(
  items: vscode.CompletionItem[],
  tagName?: string | null,
  document?: vscode.TextDocument,
  options?: { skipChildProperties?: boolean }
): void {
  const attrNames = getPelelaAttributesForTag(tagName ?? null)

  const attributeSnippets: Record<string, { text: string; detail: string }> = {
    'view-model': {
      text: 'view-model="${1:App}"',
      detail: t('completions.viewModelDetail'),
    },
    click: {
      text: 'click="${1:handler}"',
      detail: t('completions.clickDetail'),
    },
    enter: {
      text: 'enter="${1:handler}"',
      detail: t('completions.enterDetail'),
    },
    if: {
      text: 'if="${1:condicion}"',
      detail: t('completions.ifDetail'),
    },
    'for-each': {
      text: 'for-each="${1:item} of ${2:collection}"',
      detail: t('completions.forEachDetail'),
    },
    index: {
      text: 'index="${1:index}"',
      detail: t('completions.indexDetail'),
    },
  }

  attrNames.forEach((name) => {
    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Property)

    if (attributeSnippets[name]) {
      item.insertText = new vscode.SnippetString(attributeSnippets[name].text)
      item.detail = attributeSnippets[name].detail
      item.sortText = `!0_${name}`
    } else if (name.startsWith('bind-')) {
      item.insertText = new vscode.SnippetString(`${name}="\${1:propiedad}"`)
      item.detail = t('completions.bindDetail')
      item.sortText = `!0_${name}`
    } else if (name.startsWith('prop-')) {
      item.insertText = new vscode.SnippetString('prop-${1:field-name}="${2:value}"')
      item.detail = t('completions.propDetail')
      item.sortText = `!0_${name}`
    } else if (name.startsWith('link-')) {
      item.insertText = new vscode.SnippetString('link-${1:field-name}="${2:value}"')
      item.detail = t('completions.linkDetail')
      item.sortText = `!0_${name}`
    } else if (name.startsWith('const-')) {
      item.insertText = new vscode.SnippetString('const-${1:field-name}="${2:value}"')
      item.detail = t('completions.constDetail')
      item.sortText = `!0_${name}`
    }

    items.push(item)
  })

  if (
    tagName !== null &&
    tagName !== undefined &&
    document !== undefined &&
    options?.skipChildProperties !== true
  ) {
    addChildPropertyAttributeCompletions(items, document, tagName)
  }
}

function addChildPropertyAttributeCompletions(
  items: vscode.CompletionItem[],
  document: vscode.TextDocument,
  tagName: string
): void {
  const childProperties = getChildSettableProperties(document, tagName)
  if (childProperties === null) return

  childProperties.forEach((childProperty) => {
    CHILD_BINDING_PREFIXES.forEach((prefix) => {
      const label = `${prefix}${toKebabCase(childProperty)}`
      const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Field)
      item.detail = t('completions.childPropertyDetail')
      item.sortText = `!0_${label}`
      items.push(item)
    })
  })
}

function getChildSettableProperties(
  document: vscode.TextDocument,
  tagName: string
): string[] | null {
  if (!isComponentTag(tagName)) return null
  const childComponent = resolveChildComponent(tagName, document)
  if (childComponent === null) return null

  const members = extractViewModelMembers(childComponent.tsPath, childComponent.viewModelName)
  return members.properties.filter((name) => isSettableField(members, name))
}

function addTypedChildPropertyCompletions(params: {
  items: vscode.CompletionItem[]
  document: vscode.TextDocument
  tagName: string
  prefix: string
  textBeforeCursor: string
  position: vscode.Position
}): void {
  const { items, document, tagName, prefix, textBeforeCursor, position } = params
  const childProperties = getChildSettableProperties(document, tagName)
  if (childProperties === null) return

  const prefixStart = textBeforeCursor.length - prefix.length
  const replaceRange = new vscode.Range(
    position.line,
    prefixStart,
    position.line,
    position.character
  )

  childProperties.forEach((childProperty) => {
    const label = `${prefix}${toKebabCase(childProperty)}`
    const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Field)
    item.detail = t('completions.childPropertyDetail')
    item.sortText = `!0_${label}`
    item.insertText = new vscode.SnippetString(`${label}="\${1:value}"`)
    item.range = replaceRange
    items.push(item)
  })
}

async function provideAttributeValueCompletions(
  document: vscode.TextDocument,
  position: vscode.Position,
  attributeName: string,
  textBeforeCursor: string
): Promise<vscode.CompletionItem[]> {
  const isPelelaAttribute =
    attributeName.startsWith('bind-') ||
    attributeName.startsWith('prop-') ||
    attributeName.startsWith('link-') ||
    attributeName.startsWith('const-') ||
    PELELA_ATTRIBUTE_NAMES.has(attributeName)

  if (!isPelelaAttribute) return []

  if (attributeName.startsWith('const-')) return []

  const typescriptFilePath = findViewModelFile(document.uri)
  if (!typescriptFilePath) return []

  const viewModelName = getViewModelName(scanDocument(document))
  if (!viewModelName) return []

  const valueBeforeCursor = getAttributeValueMatch(textBeforeCursor)
  if (!valueBeforeCursor) {
    return provideBasicViewModelCompletions({
      typescriptFilePath,
      attributeName,
      document,
      position,
      viewModelName,
    })
  }

  const propertyPath = parsePropertyPath(valueBeforeCursor)
  return propertyPath
    ? provideNestedPropertyCompletions({
        document,
        position,
        typescriptFilePath,
        propertyPath,
        viewModelName,
      })
    : provideBasicViewModelCompletions({
        typescriptFilePath,
        attributeName,
        document,
        position,
        viewModelName,
      })
}

export function provideBasicViewModelCompletions(params: {
  typescriptFilePath: string
  attributeName: string
  document: vscode.TextDocument
  position: vscode.Position
  viewModelName: string
}): vscode.CompletionItem[] {
  const { typescriptFilePath, attributeName, document, position, viewModelName } = params
  const items: vscode.CompletionItem[] = []
  const { properties, methods, getters } = extractViewModelMembers(
    typescriptFilePath,
    viewModelName
  )

  if (EVENT_ATTRIBUTES.has(attributeName)) {
    items.push(...methods.map(createMethodCompletion))
  } else {
    const forEachInElement = findForEachInElement(document, position.line)
    if (forEachInElement) {
      items.push(createIterationPropertyCompletion(forEachInElement.itemName))
      if (forEachInElement.indexName) {
        items.push(createIterationPropertyCompletion(forEachInElement.indexName))
      }
    }
    items.push(
      ...properties.map((name) =>
        getters.includes(name) ? createGetterCompletion(name) : createPropertyCompletion(name)
      )
    )
  }

  return items
}

function createMethodCompletion(name: string): vscode.CompletionItem {
  const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Method)
  item.detail = t('completions.methodDetail')
  item.sortText = `!0_${name}`
  return item
}

function createGetterCompletion(name: string): vscode.CompletionItem {
  const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Property)
  item.detail = t('completions.getterDetail')
  item.sortText = `!0_${name}`
  return item
}

function createPropertyCompletion(name: string): vscode.CompletionItem {
  const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Field)
  item.detail = t('completions.propertyDetail')
  item.sortText = `!0_${name}`
  return item
}

function createIterationPropertyCompletion(name: string): vscode.CompletionItem {
  const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Variable)
  item.detail = t('completions.iterationPropertyDetail')
  item.sortText = `!0_${name}`
  return item
}

async function provideNestedPropertyCompletions(params: {
  document: vscode.TextDocument
  position: vscode.Position
  typescriptFilePath: string
  propertyPath: string[]
  viewModelName: string
}): Promise<vscode.CompletionItem[]> {
  const { document, position, typescriptFilePath, propertyPath, viewModelName } = params
  const forEachInElement = findForEachInElement(document, position.line)

  if (isIteratedItemProperty(forEachInElement, propertyPath) && forEachInElement) {
    return handleIteratedItemCompletions(
      document,
      forEachInElement,
      typescriptFilePath,
      viewModelName
    )
  }

  return extractNestedProperties(typescriptFilePath, propertyPath, viewModelName).map((name) => {
    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Field)
    item.detail = t('completions.nestedPropertyDetail')
    item.sortText = `!0_${name}`
    return item
  })
}

function isIteratedItemProperty(
  forEachInElement: ForEachResult | null,
  propertyPath: string[]
): boolean {
  return (
    !!forEachInElement && propertyPath[0] === forEachInElement.itemName && propertyPath.length === 1
  )
}

function handleIteratedItemCompletions(
  document: vscode.TextDocument,
  forEachInElement: ForEachResult,
  typescriptFilePath: string,
  viewModelName: string
): vscode.CompletionItem[] {
  const forEachLine = document.lineAt(forEachInElement.line).text
  const forEachExpr = parseForEachExpression(forEachLine)

  if (!forEachExpr) return []

  return extractNestedProperties(
    typescriptFilePath,
    forEachExpr.collectionName.split('.'),
    viewModelName
  ).map((name) => {
    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Field)
    item.detail = t('completions.nestedPropertyDetail')
    item.sortText = `!0_${name}`
    return item
  })
}

export function createCompletionProvider(): vscode.Disposable {
  return vscode.languages.registerCompletionItemProvider(
    { language: 'pelela', scheme: 'file' },
    { provideCompletionItems },
    ' ',
    '=',
    '"',
    "'",
    '<',
    '>',
    '/',
    '.'
  )
}
