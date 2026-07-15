import * as vscode from 'vscode'
import { extractViewModelMembers } from '../parsers/viewModelParser'
import { findViewModelFile } from '../utils/fileUtils'
import {
  validateComponentAttributes,
  validateTagRestrictions,
  validateUnknownAttributes,
} from './attributeValidator'
import { scanDocument } from './scanDocument'
import {
  validateBindingProperties,
  validateEventMethods,
  validateViewModelExistence,
} from './viewModelValidator'

const DEBOUNCE_DELAY = 300

export function validatePelelaDocument(
  collection: vscode.DiagnosticCollection,
  document: vscode.TextDocument
): void {
  if (document.languageId !== 'pelela') return

  const diagnostics: vscode.Diagnostic[] = []
  const tags = scanDocument(document)

  diagnostics.push(...validateUnknownAttributes(tags))
  diagnostics.push(...validateComponentAttributes(tags))
  diagnostics.push(...validateTagRestrictions(tags))

  const tsPath = findViewModelFile(document.uri)
  if (tsPath !== null) {
    diagnostics.push(...validateViewModelExistence(tags, tsPath))

    const viewModelAttribute = tags
      .flatMap((tag) => tag.attributes)
      .find((attribute) => attribute.name === 'view-model')
    const viewModelName = viewModelAttribute?.value

    if (viewModelName) {
      const members = extractViewModelMembers(tsPath, viewModelName)
      diagnostics.push(...validateBindingProperties(tags, tsPath, members, document, viewModelName))
      diagnostics.push(...validateEventMethods(tags, members))
    }
  }

  collection.set(document.uri, diagnostics)
}

export function createDiagnosticsProvider(): vscode.Disposable {
  const collection = vscode.languages.createDiagnosticCollection('pelela')
  const debounceTimers = new Map<string, NodeJS.Timeout>()

  function scheduleValidation(document: vscode.TextDocument): void {
    const existingTimer = debounceTimers.get(document.uri.toString())
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => validatePelelaDocument(collection, document), DEBOUNCE_DELAY)
    debounceTimers.set(document.uri.toString(), timer)
  }

  const openListener = vscode.workspace.onDidOpenTextDocument((document) => {
    if (document.languageId === 'pelela') {
      validatePelelaDocument(collection, document)
    }
  })

  const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.languageId === 'pelela') {
      scheduleValidation(event.document)
    }
  })

  const saveListener = vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId === 'pelela') {
      const uriString = document.uri.toString()
      const timer = debounceTimers.get(uriString)
      if (timer !== undefined) {
        clearTimeout(timer)
        debounceTimers.delete(uriString)
      }
      validatePelelaDocument(collection, document)
    }
  })

  const activeEditorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor !== undefined && editor.document.languageId === 'pelela') {
      validatePelelaDocument(collection, editor.document)
    }
  })

  const closeListener = vscode.workspace.onDidCloseTextDocument((document) => {
    const uriString = document.uri.toString()
    const timer = debounceTimers.get(uriString)
    if (timer !== undefined) {
      clearTimeout(timer)
      debounceTimers.delete(uriString)
    }
    collection.delete(document.uri)
  })

  if (vscode.window.activeTextEditor != null) {
    const activeDocument = vscode.window.activeTextEditor.document
    if (activeDocument.languageId === 'pelela') {
      validatePelelaDocument(collection, activeDocument)
    }
  }

  const baseDisposable = vscode.Disposable.from(
    openListener,
    changeListener,
    saveListener,
    activeEditorListener,
    closeListener,
    collection
  )

  return {
    dispose: () => {
      debounceTimers.forEach((timer) => {
        clearTimeout(timer)
      })
      debounceTimers.clear()
      baseDisposable.dispose()
    },
  }
}
