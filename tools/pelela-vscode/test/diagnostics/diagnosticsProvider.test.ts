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

const EXPECTED_VIEWMODEL_NOT_FOUND =
  "ViewModel 'TestViewModel' no encontrado en el archivo TypeScript"
const EXPECTED_PROPERTY_NOT_FOUND = "La propiedad 'nonExistentProperty' no existe en el ViewModel"

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
      assert.strictEqual(entries.size, 1)
      const diagnostics = entries.get(pelelaPath) ?? []
      assert.strictEqual(diagnostics.length, 1)
      const diagnostic = diagnostics[0]
      assert.strictEqual(diagnostic.message, EXPECTED_PROPERTY_NOT_FOUND)
      assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Error)
      assert.strictEqual(diagnostic.source, 'pelela')
      assert.strictEqual(diagnostic.range.start.line, 1)
      assert.strictEqual(diagnostic.range.start.character, 22)
      assert.strictEqual(diagnostic.range.end.line, 1)
      assert.strictEqual(diagnostic.range.end.character, 41)
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
      assert.strictEqual(diagnostics.length, 1)
      const diagnostic = diagnostics[0]
      assert.strictEqual(diagnostic.message, EXPECTED_VIEWMODEL_NOT_FOUND)
      assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Error)
      assert.strictEqual(diagnostic.source, 'pelela')
      assert.strictEqual(diagnostic.range.start.line, 0)
      assert.strictEqual(diagnostic.range.start.character, 20)
      assert.strictEqual(diagnostic.range.end.line, 0)
      assert.strictEqual(diagnostic.range.end.character, 33)
      fs.unlinkSync(noExportTsPath)
    })

    it('skips binding and event validation when viewModelNotFound', () => {
      const noBindPelelaPath = path.join(testFilesDir, 'NoBind.pelela')
      const noBindTsPath = noBindPelelaPath.replace(/\.pelela$/, '.ts')
      fs.writeFileSync(
        noBindTsPath,
        `class TestViewModel {
  name: string = "test"
  handleClick(): void {}
}`
      )
      const collection = vscode.languages.createDiagnosticCollection()
      const document = createMockDocument(
        `<pelela view-model="TestViewModel">
  <span bind-content="name"></span>
  <button click="handleClick">Click me</button>
  <input bind-value="count" />
</pelela>`,
        'pelela',
        noBindPelelaPath
      )
      validatePelelaDocument(collection, document)
      const diagnostics = getEntries(collection).get(noBindPelelaPath) ?? []
      assert.strictEqual(diagnostics.length, 1)
      const diagnostic = diagnostics[0]
      assert.strictEqual(diagnostic.message, EXPECTED_VIEWMODEL_NOT_FOUND)
      assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Error)
      assert.strictEqual(diagnostic.source, 'pelela')
      assert.strictEqual(diagnostic.range.start.line, 0)
      assert.strictEqual(diagnostic.range.start.character, 20)
      assert.strictEqual(diagnostic.range.end.line, 0)
      assert.strictEqual(diagnostic.range.end.character, 33)
      fs.unlinkSync(noBindTsPath)
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
