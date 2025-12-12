const vscode = require("vscode");
const { findViewModelFile } = require("../utils/fileUtils");
const { getHtmlElements, getHtmlAttributes, getPelelaAttributes } = require("../utils/htmlUtils");
const { 
  getCurrentAttributeName, 
  isInsideTag, 
  isStartingTag,
  getAttributeValueMatch,
  findForEachInElement,
  parseForEachExpression,
  parsePropertyPath
} = require("../parsers/documentParser");
const { extractViewModelMembers, extractNestedProperties } = require("../parsers/viewModelParser");

async function provideCompletionItems(document, position, _token, _context) {
  const items = [];
  const line = document.lineAt(position.line);
  const lineText = line.text;
  const textBeforeCursor = lineText.slice(0, position.character);
  const attributeName = getCurrentAttributeName(lineText, position.character);

  const isInsideAttributeValue = !!attributeName;
  
  if (isStartingTag(textBeforeCursor) && !isInsideAttributeValue) {
    addHtmlElementCompletions(items);
    return items;
  }

  if (isInsideTag(textBeforeCursor) && !isInsideAttributeValue) {
    addHtmlAttributeCompletions(items);
    addPelelaAttributeCompletions(items);
    return items;
  }

  if (isInsideAttributeValue && attributeName) {
    return await provideAttributeValueCompletions(document, position, attributeName, textBeforeCursor);
  }

  return items;
}

function addHtmlElementCompletions(items) {
  for (const tag of getHtmlElements()) {
    const item = new vscode.CompletionItem(
      tag,
      vscode.CompletionItemKind.Property
    );
    item.sortText = `z${tag}`;
    items.push(item);
  }
}

function addHtmlAttributeCompletions(items) {
  for (const attr of getHtmlAttributes()) {
    const item = new vscode.CompletionItem(
      attr,
      vscode.CompletionItemKind.Property
    );
    item.insertText = new vscode.SnippetString(`${attr}="\${1}"`);
    item.sortText = `z${attr}`;
    items.push(item);
  }
}

function addPelelaAttributeCompletions(items) {
  const attrNames = getPelelaAttributes();

  // VSCode snippet definitions use ${N:placeholder} syntax for tab stops
  const snippets = {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet placeholder
    "view-model": { text: 'view-model="${1:App}"', detail: "Pelela: view model asociado al template" },
    // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet placeholder
    "click": { text: 'click="${1:handler}"', detail: "Pelela: ejecuta un método del view model al hacer click" },
    // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet placeholder
    "if": { text: 'if="${1:condicion}"', detail: "Pelela: renderizado condicional" },
    // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet placeholder
    "for-each": { text: 'for-each="${1:item} of ${2:collection}"', detail: "Pelela: itera sobre una colección del view model" },
  };

  for (const name of attrNames) {
    const item = new vscode.CompletionItem(
      name,
      vscode.CompletionItemKind.Property,
    );

    if (snippets[name]) {
      item.insertText = new vscode.SnippetString(snippets[name].text);
      item.detail = snippets[name].detail;
      item.sortText = `!0_${name}`;
    } else if (name.startsWith("bind-")) {
      item.insertText = new vscode.SnippetString(`${name}="\${1:propiedad}"`);
      item.detail = "Pelela: binding al view model";
      item.sortText = `!0_${name}`;
    }

    items.push(item);
  }
}

async function provideAttributeValueCompletions(document, position, attributeName, textBeforeCursor) {
  const items = [];
  const isPelelaAttribute = attributeName.startsWith("bind-") || 
                           attributeName === "click" || 
                           attributeName === "if" || 
                           attributeName === "for-each";

  if (!isPelelaAttribute) {
    return items;
  }

  const tsFile = findViewModelFile(document.uri);
  if (!tsFile) {
    return items;
  }

  const valueBeforeCursor = getAttributeValueMatch(textBeforeCursor);
  if (!valueBeforeCursor) {
    return await provideBasicViewModelCompletions(tsFile, attributeName);
  }

  const propertyPath = parsePropertyPath(valueBeforeCursor);
  if (propertyPath) {
    return await provideNestedPropertyCompletions(document, position, tsFile, propertyPath);
  }

  return await provideBasicViewModelCompletions(tsFile, attributeName);
}

async function provideBasicViewModelCompletions(tsFile, attributeName) {
  const items = [];
  const { properties, methods } = extractViewModelMembers(tsFile);

  if (attributeName.startsWith("bind-") || attributeName === "if" || attributeName === "for-each") {
    for (const name of properties) {
      const item = new vscode.CompletionItem(
        name,
        vscode.CompletionItemKind.Field,
      );
      item.detail = "Pelela ViewModel property";
      item.sortText = `!0_${name}`;
      items.push(item);
    }
  } else if (attributeName === "click") {
    for (const name of methods) {
      const item = new vscode.CompletionItem(
        name,
        vscode.CompletionItemKind.Method,
      );
      item.detail = "Pelela ViewModel method";
      item.sortText = `!0_${name}`;
      items.push(item);
    }
  }

  return items;
}

async function provideNestedPropertyCompletions(document, position, tsFile, propertyPath) {
  const items = [];
  const forEachInElement = findForEachInElement(document, position.line);
  
  if (forEachInElement && propertyPath[0] === forEachInElement.itemName && propertyPath.length === 1) {
    const forEachLine = document.lineAt(forEachInElement.line).text;
    const forEachExpr = parseForEachExpression(forEachLine);
    
    if (forEachExpr) {
      const nestedProps = extractNestedProperties(tsFile, [forEachExpr.collectionName]);
      for (const name of nestedProps) {
        const item = new vscode.CompletionItem(
          name,
          vscode.CompletionItemKind.Field,
        );
        item.detail = "Pelela ViewModel nested property";
        item.sortText = `!0_${name}`;
        items.push(item);
      }
      return items;
    }
  }
  
  const nestedProps = extractNestedProperties(tsFile, propertyPath);
  for (const name of nestedProps) {
    const item = new vscode.CompletionItem(
      name,
      vscode.CompletionItemKind.Field,
    );
    item.detail = "Pelela ViewModel nested property";
    item.sortText = `!0_${name}`;
    items.push(item);
  }
  
  return items;
}

function createCompletionProvider() {
  return vscode.languages.registerCompletionItemProvider(
    { language: "pelela", scheme: "file" },
    { provideCompletionItems },
    " ",
    "=",
    '"',
    "'",
    "<",
    ">",
    "/",
    "."
  );
}

module.exports = {
  createCompletionProvider,
};
