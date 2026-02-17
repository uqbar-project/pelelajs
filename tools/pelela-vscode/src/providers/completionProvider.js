const vscode = require('vscode')
const { findViewModelFile } = require('../utils/fileUtils')
const { getHtmlElements, getHtmlAttributes, getPelelaAttributes } = require('../utils/htmlUtils')
const {
  getCurrentAttributeName,
  isInsideTag,
  isStartingTag,
  getAttributeValueMatch,
  findForEachInElement,
  parseForEachExpression,
  parsePropertyPath,
} = require('../parsers/documentParser')
const { extractViewModelMembers, extractNestedProperties } = require('../parsers/viewModelParser')

async function provideCompletionItems(document, position, _token, _context) {
  const items = []
  const line = document.lineAt(position.line)
  const lineText = line.text
  const textBeforeCursor = lineText.slice(0, position.character)
  const attributeName = getCurrentAttributeName(lineText, position.character)

  const isInsideAttributeValue = !!attributeName

  if (isStartingTag(textBeforeCursor) && !isInsideAttributeValue) {
    addHtmlElementCompletions(items)
    return items
  }

  if (isInsideTag(textBeforeCursor) && !isInsideAttributeValue) {
    addHtmlAttributeCompletions(items)
    addPelelaAttributeCompletions(items)
    return items
  }

  if (isInsideAttributeValue && attributeName) {
    return await provideAttributeValueCompletions(
      document,
      position,
      attributeName,
      textBeforeCursor
    )
  }

  return items
}

function addHtmlElementCompletions(items) {
  for (const tag of getHtmlElements()) {
    const item = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Property)
    item.sortText = `z${tag}`
    items.push(item)
  }
}

function addHtmlAttributeCompletions(items) {
  for (const attr of getHtmlAttributes()) {
    const item = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Property)
    item.insertText = new vscode.SnippetString(`${attr}="\${1}"`)
    item.sortText = `z${attr}`
    items.push(item)
  }
}

function addPelelaAttributeCompletions(items) {
  const attrNames = getPelelaAttributes()

  // VSCode snippet definitions use ${N:placeholder} syntax for tab stops
  const snippets = {
    'view-model': {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet placeholder
      text: 'view-model="${1:App}"',
      detail: 'Pelela: view model asociado al template',
    },
    click: {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet placeholder
      text: 'click="${1:handler}"',
      detail: 'Pelela: ejecuta un método del view model al hacer click',
    },
    // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet placeholder
    if: { text: 'if="${1:condicion}"', detail: 'Pelela: renderizado condicional' },
    'for-each': {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet placeholder
      text: 'for-each="(${1:item}, ${2:index}) of ${3:collection}"',
      detail: 'Pelela: itera sobre una colección del view model',
    },
  }

  for (const name of attrNames) {
    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Property)

    if (snippets[name]) {
      item.insertText = new vscode.SnippetString(snippets[name].text)
      item.detail = snippets[name].detail
      item.sortText = `!0_${name}`
    } else if (name.startsWith('bind-')) {
      item.insertText = new vscode.SnippetString(`${name}="\${1:propiedad}"`)
      item.detail = 'Pelela: binding al view model'
      item.sortText = `!0_${name}`
    }

    items.push(item)
  }
}

async function provideAttributeValueCompletions(
  document,
  position,
  attributeName,
  textBeforeCursor
) {
  const items = []
  const isPelelaAttribute =
    attributeName.startsWith('bind-') ||
    attributeName === 'click' ||
    attributeName === 'if' ||
    attributeName === 'for-each'

  if (!isPelelaAttribute) {
    return items
  }

  const tsFile = findViewModelFile(document.uri)
  if (!tsFile) {
    return items
  }

  const valueBeforeCursor = getAttributeValueMatch(textBeforeCursor)

  if (attributeName === 'for-each') {
    return await provideForEachValueCompletions(document, position, tsFile, valueBeforeCursor ?? '')
  }

  if (!valueBeforeCursor) {
    return await provideBasicViewModelCompletions(document, position, tsFile, attributeName)
  }

  const propertyPath = parsePropertyPath(valueBeforeCursor)
  if (propertyPath) {
    return await provideNestedPropertyCompletions(document, position, tsFile, propertyPath)
  }

  return await provideBasicViewModelCompletions(document, position, tsFile, attributeName)
}

function isForEachCollectionContext(valueBeforeCursor) {
  // `(item, index) of users` and `item of users` are both valid.
  // Before `of`, user is naming local aliases; after `of`, user is choosing a VM collection.
  return /(?:^|\s)of\s+(\w*)$/.test(valueBeforeCursor)
}

async function provideForEachValueCompletions(document, position, tsFile, valueBeforeCursor) {
  if (isForEachCollectionContext(valueBeforeCursor)) {
    return await provideBasicViewModelCompletions(document, position, tsFile, 'for-each')
  }
  // In the alias section of `for-each`, users are declaring names (item/index),
  // so we intentionally avoid ViewModel suggestions there.
  return []
}

function getForEachLocalAliases(forEachInElement, attributeName) {
  if (attributeName === 'for-each' || !forEachInElement) {
    return []
  }

  const aliases = [forEachInElement.itemName]

  if (forEachInElement.indexName) {
    aliases.push(forEachInElement.indexName)
  }

  return aliases
}

function buildCompletionCandidateNames(properties, localAliases) {
  return [...new Set([...localAliases, ...properties])]
}

function createFieldCompletionItem(name, isLocalAlias) {
  const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Field)
  item.detail = isLocalAlias ? 'Pelela for-each local variable' : 'Pelela ViewModel property'
  item.sortText = `!0_${name}`
  return item
}

function createMethodCompletionItem(name) {
  const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Method)
  item.detail = 'Pelela ViewModel method'
  item.sortText = `!0_${name}`
  return item
}

async function provideBasicViewModelCompletions(document, position, tsFile, attributeName) {
  const items = []
  const { properties, methods } = extractViewModelMembers(tsFile)
  const forEachInElement = findForEachInElement(document, position.line)

  if (attributeName.startsWith('bind-') || attributeName === 'if' || attributeName === 'for-each') {
    const localAliases = getForEachLocalAliases(forEachInElement, attributeName)
    const candidateNames = buildCompletionCandidateNames(properties, localAliases)
    const localAliasSet = new Set(localAliases)

    for (const name of candidateNames) {
      const isLocalAlias = localAliasSet.has(name)
      const completionItem = createFieldCompletionItem(name, isLocalAlias)
      items.push(completionItem)
    }
  } else if (attributeName === 'click') {
    for (const name of methods) {
      const completionItem = createMethodCompletionItem(name)
      items.push(completionItem)
    }
  }

  return items
}

async function provideNestedPropertyCompletions(document, position, tsFile, propertyPath) {
  const items = []
  const forEachInElement = findForEachInElement(document, position.line)

  if (
    forEachInElement &&
    propertyPath[0] === forEachInElement.itemName &&
    propertyPath.length === 1
  ) {
    const forEachLine = document.lineAt(forEachInElement.line).text
    const forEachExpr = parseForEachExpression(forEachLine)

    if (forEachExpr) {
      const nestedProps = extractNestedProperties(tsFile, [forEachExpr.collectionName])
      for (const name of nestedProps) {
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Field)
        item.detail = 'Pelela ViewModel nested property'
        item.sortText = `!0_${name}`
        items.push(item)
      }
      return items
    }
  }

  const indexName = forEachInElement?.indexName
  // `index` is a local numeric alias in for-each, not an object path from the ViewModel.
  // Avoid offering nested completions for expressions like `index.`
  if (typeof indexName === 'string' && propertyPath.length === 1 && propertyPath[0] === indexName) {
    return items
  }

  const nestedProps = extractNestedProperties(tsFile, propertyPath)
  for (const name of nestedProps) {
    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Field)
    item.detail = 'Pelela ViewModel nested property'
    item.sortText = `!0_${name}`
    items.push(item)
  }

  return items
}

function createCompletionProvider() {
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

module.exports = {
  createCompletionProvider,
}
