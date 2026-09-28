import * as vscode from 'vscode'
import { createDiagnosticsProvider } from './diagnostics/diagnosticsProvider'
import {
  disposeViewModelLanguageService,
  invalidateViewModelLanguageService,
} from './parsers/viewModelLanguageServiceRegistry'
import { createCompletionProvider } from './providers/completionProvider'
import { createDefinitionProvider } from './providers/definitionProvider'
import { createHoverProvider } from './providers/hoverProvider'
import { createTypeScriptDefinitionProvider } from './providers/tsDefinitionProvider'
import { invalidateComponentIndex } from './utils/componentIndex'

export function activate(context: vscode.ExtensionContext) {
  console.log('[Pelela Extension] Activated')
  enablePelelaContext()
  setupLanguageHandlers()
  configurePelelaLanguage()

  const completionProvider = createCompletionProvider()
  const definitionProvider = createDefinitionProvider()
  const diagnosticsProvider = createDiagnosticsProvider()
  const hoverProvider = createHoverProvider()
  const tsDefinitionProvider = createTypeScriptDefinitionProvider()

  context.subscriptions.push(completionProvider)
  context.subscriptions.push(definitionProvider)
  context.subscriptions.push(diagnosticsProvider)
  context.subscriptions.push(hoverProvider)
  context.subscriptions.push(tsDefinitionProvider)
  context.subscriptions.push(new vscode.Disposable(disposeViewModelLanguageService))
  context.subscriptions.push(registerViewModelWatcher())
}

/**
 * A view model edited outside the editor changes what a `const-*` or `prop-*`
 * attribute should accept, so the cached program has to be dropped and the
 * affected templates revalidated.
 */
function registerViewModelWatcher(): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,pelela}')

  const onChange = (uri: vscode.Uri) => {
    invalidateViewModelLanguageService(uri.fsPath)
    invalidateComponentIndex()
    refreshPelelaDiagnostics()
  }

  watcher.onDidChange(onChange)
  watcher.onDidCreate(onChange)
  watcher.onDidDelete(onChange)

  return watcher
}

function refreshPelelaDiagnostics(): void {
  vscode.workspace.textDocuments
    .filter((document) => document.languageId === 'pelela')
    .forEach((document) => {
      vscode.commands.executeCommand('editor.action.validate', document.uri)
    })
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
