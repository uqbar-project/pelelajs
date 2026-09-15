import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import * as vscode from 'vscode'
import { validateConstValues } from '../../src/diagnostics/constValidator'
import { validatePelelaDocument } from '../../src/diagnostics/diagnosticsProvider'
import { scanDocument } from '../../src/diagnostics/scanDocument'
import { t } from '../../src/i18n/index'
import { assertDiagnostic, createMockDocument } from './testHelpers'

const COUNTER_PELELA_CONTENT = `<component view-model="CounterViewModel">
  <span bind-content="count"></span>
</component>`

const COUNTER_VIEW_MODEL_CONTENT = `export class CounterViewModel {
  count = 0
  lastNumber = 0
  active = true
  label = ''
  config = { level: 1 }
  items: string[] = []
  date = new Date()
  dynamic
}`

const NO_VIEW_MODEL_PELELA_CONTENT = `<component>
  <span bind-content="count"></span>
</component>`

const PARENT_TEMPLATE = (componentUsage: string): string =>
  `<pelela view-model="ParentViewModel">
  ${componentUsage}
</pelela>`

function constError(params: {
  name: string
  value: string
  expected: string
  tag?: string
  viewModel?: string
}): string {
  const { name, value, expected, tag = 'counter', viewModel = 'CounterViewModel' } = params
  return t('diagnostics.constValueInvalid', { name, value, expected, tag, viewModel })
}

describe('validateConstValues', () => {
  let testDir: string
  let parentDocumentPath: string

  before(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-const-'))
    fs.writeFileSync(path.join(testDir, 'counter.pelela'), COUNTER_PELELA_CONTENT)
    fs.writeFileSync(path.join(testDir, 'counter.ts'), COUNTER_VIEW_MODEL_CONTENT)
    fs.writeFileSync(path.join(testDir, 'no-vm.pelela'), NO_VIEW_MODEL_PELELA_CONTENT)
    parentDocumentPath = path.join(testDir, 'parent.pelela')
  })

  after(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  function validate(content: string): vscode.Diagnostic[] {
    const document = createMockDocument(content.split('\n'), parentDocumentPath)
    return validateConstValues(scanDocument(document), document)
  }

  function getSingleDiagnostic(diagnostics: vscode.Diagnostic[]): vscode.Diagnostic {
    assert.strictEqual(diagnostics.length, 1)
    return diagnostics[0]
  }

  it('reports a diagnostic when a const number receives a non-numeric literal', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter const-count="a"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      constError({
        name: 'count',
        value: 'a',
        expected: t('diagnostics.constValueExpectedNumber'),
      }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('accepts a numeric literal for a number property', () => {
    const numericValue = validate(PARENT_TEMPLATE('<counter const-count="2"></counter>'))
    const trimmedValue = validate(PARENT_TEMPLATE('<counter const-count=" 42 "></counter>'))

    assert.strictEqual(numericValue.length, 0)
    assert.strictEqual(trimmedValue.length, 0)
  })

  it('reports a diagnostic when a const boolean receives an invalid literal', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter const-active="maybe"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      constError({
        name: 'active',
        value: 'maybe',
        expected: t('diagnostics.constValueExpectedBoolean'),
      }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('accepts boolean literals for a boolean property', () => {
    const trueValue = validate(PARENT_TEMPLATE('<counter const-active="true"></counter>'))
    const spacedValue = validate(PARENT_TEMPLATE('<counter const-active=" false "></counter>'))

    assert.strictEqual(trueValue.length, 0)
    assert.strictEqual(spacedValue.length, 0)
  })

  it('accepts any literal for a string property', () => {
    const numericValue = validate(PARENT_TEMPLATE('<counter const-label="42"></counter>'))
    const textValue = validate(PARENT_TEMPLATE('<counter const-label="hi"></counter>'))

    assert.strictEqual(numericValue.length, 0)
    assert.strictEqual(textValue.length, 0)
  })

  it('reports a diagnostic for object, array and Date properties', () => {
    const configValue = validate(PARENT_TEMPLATE('<counter const-config="x"></counter>'))
    const itemsValue = validate(PARENT_TEMPLATE('<counter const-items="x"></counter>'))
    const dateValue = validate(PARENT_TEMPLATE('<counter const-date="x"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(configValue),
      constError({ name: 'config', value: 'x', expected: t('diagnostics.constValueUnsupported') }),
      vscode.DiagnosticSeverity.Error
    )
    assertDiagnostic(
      getSingleDiagnostic(itemsValue),
      constError({ name: 'items', value: 'x', expected: t('diagnostics.constValueUnsupported') }),
      vscode.DiagnosticSeverity.Error
    )
    assertDiagnostic(
      getSingleDiagnostic(dateValue),
      constError({ name: 'date', value: 'x', expected: t('diagnostics.constValueUnsupported') }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('accepts values for a property without a known type', () => {
    const textValue = validate(PARENT_TEMPLATE('<counter const-dynamic="x"></counter>'))
    const numericValue = validate(PARENT_TEMPLATE('<counter const-dynamic="2"></counter>'))

    assert.strictEqual(textValue.length, 0)
    assert.strictEqual(numericValue.length, 0)
  })

  it('reports no diagnostic when the child component template does not exist', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<missing const-count="a"></missing>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('reports no diagnostic when the child template has no view-model', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<no-vm const-count="a"></no-vm>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('maps kebab-case const attributes to camelCase properties', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter const-last-number="a"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      constError({
        name: 'lastNumber',
        value: 'a',
        expected: t('diagnostics.constValueExpectedNumber'),
      }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('positions the diagnostic over the attribute value', () => {
    const lines = [
      '<pelela view-model="ParentViewModel">',
      '  <counter',
      '    const-count="a"',
      '  ></counter>',
      '</pelela>',
    ]
    const document = createMockDocument(lines, parentDocumentPath)
    const [diagnostic] = validateConstValues(scanDocument(document), document)

    const valueStartColumn = lines[2].indexOf('a')
    assert.deepStrictEqual(diagnostic.range.start, new vscode.Position(2, valueStartColumn))
    assert.deepStrictEqual(diagnostic.range.end, new vscode.Position(2, valueStartColumn + 1))
  })

  function getDiagnosticsEntries(
    collection: vscode.DiagnosticCollection
  ): Map<string, vscode.Diagnostic[]> {
    return (collection as unknown as { _entries: Map<string, vscode.Diagnostic[]> })._entries
  }

  it('integrates with validatePelelaDocument', () => {
    const collection = vscode.languages.createDiagnosticCollection()
    const document = createMockDocument(
      PARENT_TEMPLATE('<counter const-count="a"></counter>').split('\n'),
      parentDocumentPath
    )
    validatePelelaDocument(collection, document)

    const entries = getDiagnosticsEntries(collection)
    assert.strictEqual(entries.size, 1)
    const diagnostics = entries.get(parentDocumentPath) ?? []
    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      constError({
        name: 'count',
        value: 'a',
        expected: t('diagnostics.constValueExpectedNumber'),
      }),
      vscode.DiagnosticSeverity.Error
    )
  })
})
