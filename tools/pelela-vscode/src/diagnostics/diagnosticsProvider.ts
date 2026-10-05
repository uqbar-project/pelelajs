import * as vscode from 'vscode'
import { extractViewModelMembers } from '../parsers/viewModelParser'
import { findViewModelFile } from '../utils/fileUtils'
import {
  validateComponentAttributes,
  validateTagRestrictions,
  validateUnknownAttributes,
} from './attributeValidator'
import { validateBindingTargets, validateBindingTypes } from './bindingTargetValidator'
import { validateConstValues } from './constValidator'
import { getViewModelName, scanDocument } from './scanDocument'
import type { TagInfo } from './types'
import {
  validateBindingProperties,
  validateEventMethods,
  validateViewModelExistence,
} from './viewModelValidator'

const DEBOUNCE_DELAY = 300

function collectValidatorDiagnostics(
  validators: Array<() => vscode.Diagnostic[]>,
  diagnostics: vscode.Diagnostic[]
): void {
  validators.forEach((validate) => {
    try {
      diagnostics.push(...validate())
    } catch (error) {
      // A view model that cannot be read (deleted or locked mid-session) must
      // degrade to the diagnostics collected so far instead of interrupting
      // the whole update; the failure is logged for debugging.
      console.error(error)
    }
  })
}

function validateViewModelDiagnostics(
  tags: TagInfo[],
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  const tsPath = findViewModelFile(document.uri)
  if (tsPath === null) return []
  const viewModelDiagnostics = validateViewModelExistence(tags, tsPath)
  const viewModelName = getViewModelName(tags)
  if (!viewModelName || viewModelDiagnostics.length > 0) return viewModelDiagnostics
  const members = extractViewModelMembers(tsPath, viewModelName)
  return [
    ...viewModelDiagnostics,
    ...validateBindingProperties(tags, tsPath, members, document, viewModelName),
    ...validateEventMethods(tags, members),
  ]
}

export function validatePelelaDocument(
  collection: vscode.DiagnosticCollection,
  document: vscode.TextDocument
): void {
  if (document.languageId !== 'pelela') return

  const diagnostics: vscode.Diagnostic[] = []
  const tags = scanDocument(document)

  collectValidatorDiagnostics(
    [
      () => validateUnknownAttributes(tags),
      () => validateComponentAttributes(tags),
      () => validateTagRestrictions(tags),
      () => validateConstValues(tags, document),
      () => validateBindingTargets(tags, document),
      () => validateBindingTypes(tags, document),
      () => validateViewModelDiagnostics(tags, document),
    ],
    diagnostics
  )

  collection.set(document.uri, diagnostics)
}

export interface PelelaDiagnosticsProvider extends vscode.Disposable {
  /**
   * Revalidates every open Pelela document. A view model edited outside the
   * editor changes what its templates should accept without being a text change
   * in them, so no debounced or save driven validation would ever run.
   */
  refresh(): void
}

export function createDiagnosticsProvider(): PelelaDiagnosticsProvider {
  const collection = vscode.languages.createDiagnosticCollection('pelela')
  const debounceTimers = new Map<string, NodeJS.Timeout>()

  function refresh(): void {
    vscode.workspace.textDocuments
      .filter((document) => document.languageId === 'pelela')
      .forEach((document) => {
        validatePelelaDocument(collection, document)
      })
  }

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
    refresh,
    dispose: () => {
      debounceTimers.forEach((timer) => {
        clearTimeout(timer)
      })
      debounceTimers.clear()
      baseDisposable.dispose()
    },
  }
}
