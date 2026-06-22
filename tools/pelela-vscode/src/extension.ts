import * as vscode from 'vscode'
import { createCompletionProvider } from './providers/completionProvider'
import { createDefinitionProvider } from './providers/definitionProvider'
import { createTypeScriptDefinitionProvider } from './providers/tsDefinitionProvider'

export function activate(context: vscode.ExtensionContext) {
  console.log('[Pelela Extension] Activated')
  enablePelelaContext()
  setupLanguageHandlers()
  configurePelelaLanguage()

  const completionProvider = createCompletionProvider()
  const definitionProvider = createDefinitionProvider()
  const tsDefinitionProvider = createTypeScriptDefinitionProvider()

  context.subscriptions.push(completionProvider)
  context.subscriptions.push(definitionProvider)
  context.subscriptions.push(tsDefinitionProvider)
}

function enablePelelaContext() {
  vscode.commands.executeCommand('setContext', 'pelela.enabled', true)
}

function setupLanguageHandlers() {
  vscode.workspace.onDidOpenTextDocument((doc) => {
    if (doc.languageId === 'pelela') {
      vscode.languages.setTextDocumentLanguage(doc, 'pelela')
    }
  })

  if (vscode.window.activeTextEditor) {
    const doc = vscode.window.activeTextEditor.document
    if (doc.languageId === 'pelela') {
      vscode.languages.setTextDocumentLanguage(doc, 'pelela')
    }
  }
}

function configurePelelaLanguage() {
  vscode.languages.setLanguageConfiguration('pelela', {
    wordPattern: /(-?\d*\.\d\w*)|([^`~!@$^&*()=+[{\]}\\|;:'",.<>/\s]+)/g,
  })
}

export function deactivate() {}
