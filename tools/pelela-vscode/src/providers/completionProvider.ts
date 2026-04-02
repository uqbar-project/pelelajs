import * as vscode from 'vscode'
import {
  type ForEachResult,
  findForEachInElement,
  getAttributeValueMatch,
  getCurrentAttributeName,
  isInsideTag,
  isStartingTag,
  parseForEachExpression,
  parsePropertyPath,
} from '../parsers/documentParser'
import { extractNestedProperties, extractViewModelMembers } from '../parsers/viewModelParser'
import { findViewModelFile } from '../utils/fileUtils'
import { getHtmlAttributes, getHtmlElements, getPelelaAttributes } from '../utils/htmlUtils'

async function provideCompletionItems(
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
    addHtmlAttributeCompletions(items)
    addPelelaAttributeCompletions(items)
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

function addHtmlAttributeCompletions(items: vscode.CompletionItem[]): void {
  getHtmlAttributes().forEach((attr) => {
    const item = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Property)
    item.insertText = new vscode.SnippetString(`${attr}="\${1}"`)
    item.sortText = `z${attr}`
    items.push(item)
  })
}

function addPelelaAttributeCompletions(items: vscode.CompletionItem[]): void {
  const attrNames = getPelelaAttributes()

  const attributeSnippets: Record<string, { text: string; detail: string }> = {
    'view-model': {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet syntax
      text: 'view-model="${1:App}"',
      detail: 'Pelela: view model asociado al template',
    },
    click: {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet syntax
      text: 'click="${1:handler}"',
      detail: 'Pelela: ejecuta un método del view model al hacer click',
    },
    if: {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet syntax
      text: 'if="${1:condicion}"',
      detail: 'Pelela: renderizado condicional',
    },
    'for-each': {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet syntax
      text: 'for-each="${1:item} of ${2:collection}"',
      detail: 'Pelela: itera sobre una colección del view model',
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
      item.detail = 'Pelela: binding al view model'
      item.sortText = `!0_${name}`
    }

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
    attributeName.startsWith('bind-') || ['click', 'if', 'for-each'].includes(attributeName)

  if (!isPelelaAttribute) return []

  const typescriptFilePath = findViewModelFile(document.uri)
  if (!typescriptFilePath) return []

  const valueBeforeCursor = getAttributeValueMatch(textBeforeCursor)
  if (!valueBeforeCursor) {
    return provideBasicViewModelCompletions(typescriptFilePath, attributeName)
  }

  const propertyPath = parsePropertyPath(valueBeforeCursor)
  return propertyPath
    ? provideNestedPropertyCompletions(document, position, typescriptFilePath, propertyPath)
    : provideBasicViewModelCompletions(typescriptFilePath, attributeName)
}

function provideBasicViewModelCompletions(
  typescriptFilePath: string,
  attributeName: string
): vscode.CompletionItem[] {
  const items: vscode.CompletionItem[] = []
  const { properties, methods } = extractViewModelMembers(typescriptFilePath)

  if (attributeName === 'click') {
    methods.forEach((name) => {
      items.push(createMethodCompletion(name))
    })
  } else {
    properties.forEach((name) => {
      items.push(createPropertyCompletion(name))
    })
  }

  return items
}

function createMethodCompletion(name: string): vscode.CompletionItem {
  const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Method)
  item.detail = 'Pelela ViewModel method'
  item.sortText = `!0_${name}`
  return item
}

function createPropertyCompletion(name: string): vscode.CompletionItem {
  const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Field)
  item.detail = 'Pelela ViewModel property'
  item.sortText = `!0_${name}`
  return item
}

async function provideNestedPropertyCompletions(
  document: vscode.TextDocument,
  position: vscode.Position,
  typescriptFilePath: string,
  propertyPath: string[]
): Promise<vscode.CompletionItem[]> {
  const forEachInElement = findForEachInElement(document, position.line)

  if (isIteratedItemProperty(forEachInElement, propertyPath) && forEachInElement) {
    return handleIteratedItemCompletions(document, forEachInElement, typescriptFilePath)
  }

  return extractNestedProperties(typescriptFilePath, propertyPath).map((name) => {
    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Field)
    item.detail = 'Pelela ViewModel nested property'
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
  typescriptFilePath: string
): vscode.CompletionItem[] {
  const forEachLine = document.lineAt(forEachInElement.line).text
  const forEachExpr = parseForEachExpression(forEachLine)

  if (!forEachExpr) return []

  return extractNestedProperties(typescriptFilePath, [forEachExpr.collectionName]).map((name) => {
    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Field)
    item.detail = 'Pelela ViewModel nested property'
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
