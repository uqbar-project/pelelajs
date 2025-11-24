// tools/pelela-vscode/extension.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

/**
 * Devuelve el nombre del atributo en el que está el cursor, si aplica.
 * Ej: <span bind-value="|">  -> "bind-value"
 */
function getCurrentAttributeName(lineText, positionCharacter) {
  const textUpToCursor = lineText.slice(0, positionCharacter);
  const match = /(\b[\w-]+)\s*=\s*"[^"]*$/.exec(textUpToCursor);
  return match ? match[1] : null;
}

/**
 * Dado un archivo .pelela, encuentra el .ts asociado (mismo nombre)
 */
function findViewModelFile(pelelaUri) {
  const pelelaPath = pelelaUri.fsPath;
  const tsPath = pelelaPath.replace(/\.pelela$/, ".ts");
  if (fs.existsSync(tsPath)) {
    return tsPath;
  }
  return null;
}

/**
 * Extrae nombres "interesantes" del view model:
 * - propiedades (foo: number = 0;  / foo = 0)
 * - getters (get foo() { ... })
 * - métodos (foo() { ... })
 *
 * Es un parser muy simple a base de regex; para docencia alcanza de sobra.
 */
function extractViewModelMembers(tsFilePath) {
  const text = fs.readFileSync(tsFilePath, "utf-8");

  /** @type {Set<string>} */
  const properties = new Set();
  /** @type {Set<string>} */
  const methods = new Set();

  // propiedades con tipo o asignación
  const propRegex =
    /^\s*(?:public\s+|private\s+|protected\s+)?([a-zA-Z_]\w*)\s*(?::|=)\s*/gm;
  let match;
  while ((match = propRegex.exec(text))) {
    properties.add(match[1]);
  }

  // getters -> los tratamos como propiedades
  const getterRegex =
    /^\s*(?:public\s+|private\s+|protected\s+)?get\s+([a-zA-Z_]\w*)\s*\(/gm;
  while ((match = getterRegex.exec(text))) {
    properties.add(match[1]);
  }

  // métodos "normales"
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

/**
 * Registra el completion provider para Pelela.
 */
function activate(context) {
  const provider = vscode.languages.registerCompletionItemProvider(
    { language: "pelela", scheme: "file" },
    {
      /**
       * @param {vscode.TextDocument} document
       * @param {vscode.Position} position
       * @returns {vscode.CompletionItem[]}
       */
      provideCompletionItems(document, position) {
        const items = [];

        const line = document.lineAt(position.line);
        const lineText = line.text;
        const attributeName = getCurrentAttributeName(
          lineText,
          position.character,
        );

        const isInsideAttributeValue = !!attributeName;

        // 1) Siempre sugerimos atributos propios de Pelela (view-model, bind-*, click)
        if (!isInsideAttributeValue) {
          const attrNames = [
            "view-model",
            "bind-value",
            "bind-visible",
            "bind-class",
            "bind-style",
            "click",
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
            } else if (name === "click") {
              item.insertText = new vscode.SnippetString(
                'click="${1:handler}"',
              );
              item.detail = "Pelela: ejecuta un método del view model al hacer click";
            } else if (name.startsWith("bind-")) {
              item.insertText = new vscode.SnippetString(
                `${name}="\${1:propiedad}"`,
              );
              item.detail = "Pelela: binding al view model";
            }

            items.push(item);
          }
        }

        // 2) Si estamos dentro del valor de un bind-* o click="..."
        //    sugerimos propiedades/métodos del view model.
        if (
          isInsideAttributeValue &&
          attributeName &&
          (attributeName.startsWith("bind-") || attributeName === "click")
        ) {
          const tsFile = findViewModelFile(document.uri);
          if (tsFile) {
            const { properties, methods } = extractViewModelMembers(tsFile);

            if (attributeName.startsWith("bind-")) {
              // solo propiedades (icono de property, rectángulo azul)
              for (const name of properties) {
                const item = new vscode.CompletionItem(
                  name,
                  vscode.CompletionItemKind.Field,
                );
                item.detail = "Pelela ViewModel property";
                item.sortText = `1_${name}`; // arriba de los atributos
                items.push(item);
              }
            } else if (attributeName === "click") {
              // solo métodos (icono de método)
              for (const name of methods) {
                const item = new vscode.CompletionItem(
                  name,
                  vscode.CompletionItemKind.Method,
                );
                item.detail = "Pelela ViewModel method";
                item.sortText = `1_${name}`;
                items.push(item);
              }
            }
          }
        }

        return items;
      },
    },
    '"', // trigger al abrir comillas
    ".", // y si quieren forzar con punto
  );

  context.subscriptions.push(provider);
}

function deactivate() { }

module.exports = {
  activate,
  deactivate,
};