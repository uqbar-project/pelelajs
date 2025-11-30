const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function getCurrentAttributeName(lineText, positionCharacter) {
  const textUpToCursor = lineText.slice(0, positionCharacter);
  const match = /(\b[\w-]+)\s*=\s*"[^"]*$/.exec(textUpToCursor);
  return match ? match[1] : null;
}

function findViewModelFile(pelelaUri) {
  const pelelaPath = pelelaUri.fsPath;
  const tsPath = pelelaPath.replace(/\.pelela$/, ".ts");
  if (fs.existsSync(tsPath)) {
    return tsPath;
  }
  return null;
}

function extractViewModelMembers(tsFilePath) {
  const text = fs.readFileSync(tsFilePath, "utf-8");

  const properties = new Set();
  const methods = new Set();

  const propRegex =
    /^\s*(?:public\s+|private\s+|protected\s+)?([a-zA-Z_]\w*)\s*(?::|=)\s*/gm;
  let match;
  while ((match = propRegex.exec(text))) {
    properties.add(match[1]);
  }

  const getterRegex =
    /^\s*(?:public\s+|private\s+|protected\s+)?get\s+([a-zA-Z_]\w*)\s*\(/gm;
  while ((match = getterRegex.exec(text))) {
    properties.add(match[1]);
  }

  const methodRegex =
    /^\s*(?:public\s+|private\s+|protected\s+)?([a-zA-Z_]\w*)\s*\(/gm;
  while ((match = methodRegex.exec(text))) {
    const name = match[1];
    if (name === "constructor") continue;
    methods.add(name);
  }

  return {
    properties: Array.from(properties),
    methods: Array.from(methods),
  };
}

function getHtmlElements() {
  return [
    "div", "span", "p", "a", "button", "input", "textarea", "select", "option",
    "label", "form", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
    "table", "tr", "td", "th", "thead", "tbody", "img", "video", "audio",
    "section", "article", "header", "footer", "nav", "aside", "main"
  ];
}

function getHtmlAttributes() {
  return [
    "id", "class", "style", "title", "data-", "aria-", "role",
    "src", "href", "alt", "type", "value", "placeholder", "name",
    "disabled", "readonly", "required", "checked", "selected",
    "width", "height", "target", "rel"
  ];
}

function activate(context) {
  vscode.commands.executeCommand('setContext', 'pelela.enabled', true);
  
  vscode.workspace.onDidOpenTextDocument((doc) => {
    if (doc.languageId === 'pelela') {
      vscode.languages.setTextDocumentLanguage(doc, 'pelela');
    }
  });

  if (vscode.window.activeTextEditor) {
    const doc = vscode.window.activeTextEditor.document;
    if (doc.languageId === 'pelela') {
      vscode.languages.setTextDocumentLanguage(doc, 'pelela');
    }
  }

  vscode.languages.setLanguageConfiguration("pelela", {
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
  });

  const provider = vscode.languages.registerCompletionItemProvider(
    { language: "pelela", scheme: "file" },
    {
      async provideCompletionItems(document, position, token, context) {
        const items = [];

        const line = document.lineAt(position.line);
        const lineText = line.text;
        const textBeforeCursor = lineText.slice(0, position.character);
        const attributeName = getCurrentAttributeName(
          lineText,
          position.character,
        );

        const isInsideAttributeValue = !!attributeName;
        const isInsideTag = /<[^>]*$/.test(textBeforeCursor);
        const isStartingTag = /<\w*$/.test(textBeforeCursor);

        if (isStartingTag && !isInsideAttributeValue) {
          for (const tag of getHtmlElements()) {
            const item = new vscode.CompletionItem(
              tag,
              vscode.CompletionItemKind.Property
            );
            item.sortText = "z" + tag;
            items.push(item);
          }
        }

        if (isInsideTag && !isInsideAttributeValue) {
          for (const attr of getHtmlAttributes()) {
            const item = new vscode.CompletionItem(
              attr,
              vscode.CompletionItemKind.Property
            );
            item.insertText = new vscode.SnippetString(`${attr}="\${1}"`);
            item.sortText = "z" + attr;
            items.push(item);
          }

          const attrNames = [
            "view-model",
            "bind-value",
            "if",
            "bind-class",
            "bind-style",
            "click",
            "for-each",
          ];

          for (const name of attrNames) {
            const item = new vscode.CompletionItem(
              name,
              vscode.CompletionItemKind.Property,
            );

            if (name === "view-model") {
              item.insertText = new vscode.SnippetString(
                'view-model="${1:App}"',
              );
              item.detail = "Pelela: view model asociado al template";
              item.sortText = "!0_" + name;
            } else if (name === "click") {
              item.insertText = new vscode.SnippetString(
                'click="${1:handler}"',
              );
              item.detail = "Pelela: ejecuta un método del view model al hacer click";
              item.sortText = "!0_" + name;
            } else if (name === "if") {
              item.insertText = new vscode.SnippetString(
                'if="${1:condicion}"',
              );
              item.detail = "Pelela: renderizado condicional";
              item.sortText = "!0_" + name;
            } else if (name === "for-each") {
              item.insertText = new vscode.SnippetString(
                'for-each="${1:item} of ${2:collection}"',
              );
              item.detail = "Pelela: itera sobre una colección del view model";
              item.sortText = "!0_" + name;
            } else if (name.startsWith("bind-")) {
              item.insertText = new vscode.SnippetString(
                `${name}="\${1:propiedad}"`,
              );
              item.detail = "Pelela: binding al view model";
              item.sortText = "!0_" + name;
            }

            items.push(item);
          }
        }

        if (
          isInsideAttributeValue &&
          attributeName &&
          (attributeName.startsWith("bind-") || attributeName === "click" || attributeName === "if" || attributeName === "for-each")
        ) {
          const tsFile = findViewModelFile(document.uri);
          if (tsFile) {
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
          }
        }

        return items;
      },
    },
    " ",
    "=",
    '"',
    "'",
    "<",
    ">",
    "/"
  );

  context.subscriptions.push(provider);

  const definitionProvider = vscode.languages.registerDefinitionProvider(
    { language: "pelela", scheme: "file" },
    {
      provideDefinition(document, position, token) {
        const line = document.lineAt(position.line);
        const lineText = line.text;
        
        const viewModelMatch = /view-model=["']([^"']+)["']/g.exec(lineText);
        if (viewModelMatch && position.character >= lineText.indexOf(viewModelMatch[1]) && 
            position.character <= lineText.indexOf(viewModelMatch[1]) + viewModelMatch[1].length) {
          const className = viewModelMatch[1];
          const tsFile = findViewModelFile(document.uri);
          if (tsFile) {
            const location = findClassDefinition(tsFile, className);
            if (location) return location;
          }
        }

        const forEachInElement = findForEachInElement(document, position.line);

        const bindMatch = /(?:bind-[a-zA-Z0-9_-]+|if|for-each)=["']([^"']+)["']/g;
        let match;
        while ((match = bindMatch.exec(lineText)) !== null) {
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
              const forEachMatch = /^\s*(\w+)\s+of\s+(\w+)\s*$/.exec(fullValue);
              if (forEachMatch) {
                const itemName = forEachMatch[1];
                const collectionName = forEachMatch[2];
                const collectionStart = fullValue.indexOf(collectionName);
                const collectionEnd = collectionStart + collectionName.length;

                if (cursorOffsetInValue >= collectionStart && cursorOffsetInValue <= collectionEnd) {
                  const location = findPropertyDefinition(tsFile, collectionName);
                  if (location) return location;
                }
              }
            } else {
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
                  
                  const location = findPropertyDefinition(tsFile, part);
                  if (location) return location;
                  break;
                }
                
                currentPos = partEnd + 1;
              }
            }
          }
        }

        const clickMatch = /click=["']([^"']+)["']/g;
        while ((match = clickMatch.exec(lineText)) !== null) {
          const methodName = match[1];
          const startPos = match.index + match[0].indexOf(methodName);
          const endPos = startPos + methodName.length;
          
          if (position.character >= startPos && position.character <= endPos) {
            const tsFile = findViewModelFile(document.uri);
            if (tsFile) {
              const location = findMethodDefinition(tsFile, methodName);
              if (location) return location;
            }
          }
        }

        return null;
      }
    }
  );

  context.subscriptions.push(definitionProvider);
}

function findForEachInElement(document, currentLine) {
  const forEachResults = [];
  
  for (let i = currentLine; i >= 0; i--) {
    const lineText = document.lineAt(i).text;
    
    const forEachMatch = /for-each=["'](\w+)\s+of\s+\w+["']/.exec(lineText);
    if (forEachMatch) {
      const itemName = forEachMatch[1];
      const itemPos = lineText.indexOf(itemName, lineText.indexOf('for-each='));
      forEachResults.push({ itemName, line: i, itemPos });
    }
  }
  
  return forEachResults.length > 0 ? forEachResults[0] : null;
}

function findClassDefinition(tsFilePath, className) {
  const text = fs.readFileSync(tsFilePath, "utf-8");
  const lines = text.split("\n");
  
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
  const text = fs.readFileSync(tsFilePath, "utf-8");
  const lines = text.split("\n");
  
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

function findMethodDefinition(tsFilePath, methodName) {
  const text = fs.readFileSync(tsFilePath, "utf-8");
  const lines = text.split("\n");
  
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

function deactivate() { }

module.exports = {
  activate,
  deactivate,
};
