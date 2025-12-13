const vscode = require("vscode");
const { findViewModelFile } = require("../utils/fileUtils");
const { findForEachInElement } = require("../parsers/documentParser");
const {
  findClassDefinition,
  findPropertyDefinition,
  findNestedPropertyDefinition,
  findMethodDefinition,
} = require("../parsers/definitionFinder");

// Regex patterns for attribute matching
const BIND_ATTRIBUTE_PATTERN = /(?:bind-[a-zA-Z0-9_-]+|if|for-each)=["']([^"']+)["']/g;
const CLICK_ATTRIBUTE_PATTERN = /click=["']([^"']+)["']/g;

function provideDefinition(document, position, _token) {
  const line = document.lineAt(position.line);
  const lineText = line.text;
  
  const viewModelLocation = checkViewModelDefinition(document, position, lineText);
  if (viewModelLocation) return viewModelLocation;

  const forEachInElement = findForEachInElement(document, position.line);

  const bindLocation = checkBindAttributeDefinitions(document, position, lineText, forEachInElement);
  if (bindLocation) return bindLocation;

  const clickLocation = checkClickAttributeDefinition(document, position, lineText);
  if (clickLocation) return clickLocation;

  return null;
}

function checkViewModelDefinition(document, position, lineText) {
  const viewModelMatch = /view-model=["']([^"']+)["']/g.exec(lineText);
  if (viewModelMatch && 
      position.character >= lineText.indexOf(viewModelMatch[1]) && 
      position.character <= lineText.indexOf(viewModelMatch[1]) + viewModelMatch[1].length) {
    const className = viewModelMatch[1];
    const tsFile = findViewModelFile(document.uri);
    if (tsFile) {
      return findClassDefinition(tsFile, className);
    }
  }
  return null;
}

function checkBindAttributeDefinitions(document, position, lineText, forEachInElement) {
  for (const match of lineText.matchAll(BIND_ATTRIBUTE_PATTERN)) {
    const fullValue = match[1];
    const attrStartPos = match.index;
    const valueStartPos = attrStartPos + match[0].indexOf(fullValue);
    const valueEndPos = valueStartPos + fullValue.length;

    if (position.character >= valueStartPos && position.character <= valueEndPos) {
      const tsFile = findViewModelFile(document.uri);
      if (!tsFile) continue;

      const cursorOffsetInValue = position.character - valueStartPos;
      const attrName = match[0].match(/^([^=]+)=/)[1];

      if (attrName === "for-each") {
        return handleForEachDefinition(fullValue, cursorOffsetInValue, tsFile);
      } else {
        return handlePropertyPathDefinition(document, fullValue, cursorOffsetInValue, tsFile, forEachInElement);
      }
    }
  }

  return null;
}

function handleForEachDefinition(fullValue, cursorOffsetInValue, tsFile) {
  const forEachMatch = /^\s*(\w+)\s+of\s+(\w+)\s*$/.exec(fullValue);
  if (forEachMatch) {
    const collectionName = forEachMatch[2];
    const collectionStart = fullValue.indexOf(collectionName);
    const collectionEnd = collectionStart + collectionName.length;

    if (cursorOffsetInValue >= collectionStart && cursorOffsetInValue <= collectionEnd) {
      return findPropertyDefinition(tsFile, collectionName);
    }
  }
  return null;
}

function handlePropertyPathDefinition(document, fullValue, cursorOffsetInValue, tsFile, forEachInElement) {
  const parts = fullValue.split('.');
  let currentPos = 0;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    const partStart = fullValue.indexOf(part, currentPos);
    const partEnd = partStart + part.length;
    
    if (cursorOffsetInValue >= partStart && cursorOffsetInValue <= partEnd) {
      if (forEachInElement && part === forEachInElement.itemName) {
        return new vscode.Location(
          document.uri,
          new vscode.Position(forEachInElement.line, forEachInElement.itemPos)
        );
      }
      
      const propertyPath = parts.slice(0, i + 1);
      return findNestedPropertyDefinition(tsFile, propertyPath);
    }
    
    currentPos = partEnd + 1;
  }
  
  return null;
}

function checkClickAttributeDefinition(document, position, lineText) {
  for (const match of lineText.matchAll(CLICK_ATTRIBUTE_PATTERN)) {
    const methodName = match[1];
    const startPos = match.index + match[0].indexOf(methodName);
    const endPos = startPos + methodName.length;

    if (position.character >= startPos && position.character <= endPos) {
      const tsFile = findViewModelFile(document.uri);
      if (tsFile) {
        return findMethodDefinition(tsFile, methodName);
      }
    }
  }

  return null;
}

function createDefinitionProvider() {
  return vscode.languages.registerDefinitionProvider(
    { language: "pelela", scheme: "file" },
    { provideDefinition }
  );
}

module.exports = {
  createDefinitionProvider,
};
