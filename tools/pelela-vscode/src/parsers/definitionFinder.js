const vscode = require("vscode");
const { readFileLines } = require("../utils/fileUtils");

function findClassDefinition(tsFilePath, className) {
  const lines = readFileLines(tsFilePath);
  const classRegex = new RegExp(`^\\s*(?:export\\s+)?class\\s+${className}\\b`, "m");
  
  for (let i = 0; i < lines.length; i++) {
    if (classRegex.test(lines[i])) {
      const character = lines[i].indexOf(className);
      return new vscode.Location(
        vscode.Uri.file(tsFilePath),
        new vscode.Position(i, character)
      );
    }
  }
  
  return null;
}

function findPropertyDefinition(tsFilePath, propertyName) {
  const lines = readFileLines(tsFilePath);
  const propRegex = new RegExp(`^\\s*(?:public\\s+|private\\s+|protected\\s+)?${propertyName}\\??\\s*[=:]`, "m");
  const getterRegex = new RegExp(`^\\s*(?:public\\s+|private\\s+|protected\\s+)?get\\s+${propertyName}\\s*\\(`, "m");
  
  for (let i = 0; i < lines.length; i++) {
    if (propRegex.test(lines[i]) || getterRegex.test(lines[i])) {
      const character = lines[i].indexOf(propertyName);
      return new vscode.Location(
        vscode.Uri.file(tsFilePath),
        new vscode.Position(i, character)
      );
    }
  }
  
  return null;
}

function findNestedPropertyDefinition(tsFilePath, propertyPath) {
  if (propertyPath.length === 1) {
    return findPropertyDefinition(tsFilePath, propertyPath[0]);
  }

  const lines = readFileLines(tsFilePath);
  const rootProperty = propertyPath[0];
  const rootPropRegex = new RegExp(`^\\s*(?:public\\s+|private\\s+|protected\\s+)?${rootProperty}\\??\\s*[=:]`, "m");
  
  const rootLineIndex = findLineWithRegex(lines, rootPropRegex);
  
  if (rootLineIndex === -1) {
    return null;
  }

  return traverseNestedPath(lines, rootLineIndex, propertyPath.slice(1), tsFilePath);
}

function findLineWithRegex(lines, regex) {
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      return i;
    }
  }
  return -1;
}

function traverseNestedPath(lines, startIndex, remainingPath, tsFilePath) {
  let currentLineIndex = startIndex;
  let braceDepth = 0;
  let inObjectLiteral = false;
  
  for (let pathIndex = 0; pathIndex < remainingPath.length; pathIndex++) {
    const targetProperty = remainingPath[pathIndex];
    let found = false;
    
    for (let i = currentLineIndex; i < lines.length; i++) {
      const line = lines[i];
      
      if (!inObjectLiteral) {
        if (line.includes('{')) {
          inObjectLiteral = true;
          braceDepth = calculateBraceDepth(line);
          continue;
        }
      } else {
        braceDepth = updateBraceDepth(braceDepth, line);
        
        if (braceDepth === 0) {
          break;
        }
        
        const nestedPropRegex = new RegExp(`^\\s*${targetProperty}\\s*[=:]`);
        if (nestedPropRegex.test(line)) {
          if (pathIndex === remainingPath.length - 1) {
            const character = line.indexOf(targetProperty);
            return new vscode.Location(
              vscode.Uri.file(tsFilePath),
              new vscode.Position(i, character)
            );
          } else {
            currentLineIndex = i;
            inObjectLiteral = false;
            braceDepth = 0;
            found = true;
            break;
          }
        }
      }
    }
    
    if (!found && pathIndex < remainingPath.length - 1) {
      return null;
    }
  }
  
  return null;
}

function calculateBraceDepth(line) {
  const openBraces = (line.match(/{/g) || []).length;
  const closeBraces = (line.match(/}/g) || []).length;
  return openBraces - closeBraces;
}

function updateBraceDepth(currentDepth, line) {
  return currentDepth + calculateBraceDepth(line);
}

function findMethodDefinition(tsFilePath, methodName) {
  const lines = readFileLines(tsFilePath);
  const methodRegex = new RegExp(`^\\s*(?:public\\s+|private\\s+|protected\\s+)?${methodName}\\s*\\(`, "m");
  
  for (let i = 0; i < lines.length; i++) {
    if (methodRegex.test(lines[i])) {
      const character = lines[i].indexOf(methodName);
      return new vscode.Location(
        vscode.Uri.file(tsFilePath),
        new vscode.Position(i, character)
      );
    }
  }
  
  return null;
}

module.exports = {
  findClassDefinition,
  findPropertyDefinition,
  findNestedPropertyDefinition,
  findMethodDefinition,
};
