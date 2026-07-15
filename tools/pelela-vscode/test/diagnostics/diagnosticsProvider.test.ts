import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import * as vscode from 'vscode'
import {
  createDiagnosticsProvider,
  validatePelelaDocument,
} from '../../src/diagnostics/diagnosticsProvider'

const PELELA_CONTENT = `<pelela view-model="TestViewModel">
  <div>
    <span bind-content="name"></span>
    <button click="handleClick">Click me</button>
    <input bind-value="count" />
  </div>
</pelela>`

const VIEW_MODEL_CONTENT = `export class TestViewModel {
  name: string = "test"
  count: number = 0
  handleClick(): void {}
}`

function createMockDocument(
  content: string,
  languageId: string,
  uriPath: string
): vscode.TextDocument {
  const lines = content.split('\n')
  return {
    lineCount: lines.length,
    languageId,
    uri: vscode.Uri.file(uriPath),
    lineAt: (lineIndex: number) => ({ text: lines[lineIndex] }),
    getText: () => content,
  } as unknown as vscode.TextDocument
}

function getEntries(collection: vscode.DiagnosticCollection): Map<string, vscode.Diagnostic[]> {
  return (collection as unknown as { _entries: Map<string, vscode.Diagnostic[]> })._entries
}

describe('diagnosticsProvider', () => {
  let testFilesDir: string
  let tsPath: string
  let pelelaPath: string

  before(() => {
    testFilesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-dp-test-'))
    pelelaPath = path.join(testFilesDir, 'TestView.pelela')
    tsPath = pelelaPath.replace(/\.pelela$/, '.ts')
    fs.writeFileSync(tsPath, VIEW_MODEL_CONTENT)
  })

  after(() => {
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true })
    }
  })

  describe('validatePelelaDocument', () => {
    it('skips non-pelela documents', () => {
      const collection = vscode.languages.createDiagnosticCollection()
      const document = createMockDocument(PELELA_CONTENT, 'typescript', pelelaPath)
      validatePelelaDocument(collection, document)
      assert.strictEqual(getEntries(collection).size, 0)
    })

    it('produces diagnostic for an unknown binding property', () => {
      const collection = vscode.languages.createDiagnosticCollection()
      const document = createMockDocument(
        `<pelela view-model="TestViewModel">
  <span bind-content="nonExistentProperty"></span>
</pelela>`,
        'pelela',
        pelelaPath
      )
      validatePelelaDocument(collection, document)
      const entries = getEntries(collection)
      assert.ok(entries.size > 0)
      const diagnostics = entries.get(pelelaPath) ?? []
      assert.ok(diagnostics.length > 0)
    })

    it('reports viewModelNotFound when the class is not exported', () => {
      const noExportPelelaPath = path.join(testFilesDir, 'NoExport.pelela')
      const noExportTsPath = noExportPelelaPath.replace(/\.pelela$/, '.ts')
      fs.writeFileSync(
        noExportTsPath,
        `class TestViewModel {
  name: string = "test"
}`
      )
      const collection = vscode.languages.createDiagnosticCollection()
      const document = createMockDocument(
        `<pelela view-model="TestViewModel"></pelela>`,
        'pelela',
        noExportPelelaPath
      )
      validatePelelaDocument(collection, document)
      const diagnostics = getEntries(collection).get(noExportPelelaPath) ?? []
      const viewModelDiag = diagnostics.find((diagnostic) =>
        diagnostic.message.includes('ViewModel')
      )
      assert.ok(
        viewModelDiag !== undefined,
        `expected a viewModelNotFound diagnostic, got: ${diagnostics.map((diagnostic) => diagnostic.message).join(', ')}`
      )
      fs.unlinkSync(noExportTsPath)
    })
  })

  describe('createDiagnosticsProvider wiring', () => {
    it('returns a disposable with dispose method', () => {
      const provider = createDiagnosticsProvider()
      assert.ok(typeof provider.dispose === 'function')
      provider.dispose()
    })

    it('dispose runs without error on double call', () => {
      const provider = createDiagnosticsProvider()
      provider.dispose()
      provider.dispose()
    })
  })
})
