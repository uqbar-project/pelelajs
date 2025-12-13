const vscode = require("vscode");
const { createCompletionProvider } = require("./providers/completionProvider");
const { createDefinitionProvider } = require("./providers/definitionProvider");

function activate(context) {
  enablePelelaContext();
  setupLanguageHandlers();
  configurePelelaLanguage();
  
  const completionProvider = createCompletionProvider();
  const definitionProvider = createDefinitionProvider();
  
  context.subscriptions.push(completionProvider);
  context.subscriptions.push(definitionProvider);
}

function enablePelelaContext() {
  vscode.commands.executeCommand('setContext', 'pelela.enabled', true);
}

function setupLanguageHandlers() {
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
}

function configurePelelaLanguage() {
  vscode.languages.setLanguageConfiguration("pelela", {
    wordPattern: /(-?\d*\.\d\w*)|([^`~!@$^&*()=+[{\]}\\|;:'",.<>/\s]+)/g,
  });
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
