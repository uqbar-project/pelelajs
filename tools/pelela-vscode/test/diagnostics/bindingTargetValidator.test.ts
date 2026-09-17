import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import * as vscode from 'vscode'
import { validateBindingTargets } from '../../src/diagnostics/bindingTargetValidator'
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
  total = 0

  get isLucky() {
    return this.count === 7
  }

  increment() {}

  onUpdate = () => {}
}`

const NO_VIEW_MODEL_PELELA_CONTENT = `<component>
  <span bind-content="count"></span>
</component>`

const PARENT_TEMPLATE = (componentUsage: string): string =>
  `<pelela view-model="ParentViewModel">
  ${componentUsage}
</pelela>`

function childPropertyNotFound(
  name: string,
  tag = 'counter',
  viewModel = 'CounterViewModel'
): string {
  return t('diagnostics.childPropertyNotFound', { name, tag, viewModel })
}

function childPropertyCaseMismatch(
  name: string,
  suggestedName: string,
  tag = 'counter',
  viewModel = 'CounterViewModel'
): string {
  return t('diagnostics.childPropertyCaseMismatch', { name, suggestedName, tag, viewModel })
}

describe('validateBindingTargets', () => {
  let testDir: string
  let parentDocumentPath: string

  function getSingleDiagnostic(diagnostics: vscode.Diagnostic[]): vscode.Diagnostic {
    assert.strictEqual(diagnostics.length, 1)
    return diagnostics[0]
  }

  before(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-binding-target-'))
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
    return validateBindingTargets(scanDocument(document), document)
  }

  it('accepts a link attribute whose target exists as a field', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter link-count="count"></counter>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('accepts a prop attribute whose target exists as a field', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter prop-count="count"></counter>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('maps kebab-case attribute suffixes to camelCase field names', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter prop-last-number="count"></counter>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('reports a diagnostic when a prop target does not exist in the child ViewModel', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter prop-ivalid="count"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyNotFound('ivalid'),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('reports a diagnostic when a link target does not exist in the child ViewModel', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter link-missing="count"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyNotFound('missing'),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('reports a diagnostic when a const target does not exist in the child ViewModel', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter const-missing="1"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyNotFound('missing'),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('rejects a getter as a prop target (it cannot be set)', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter prop-is-lucky="count"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyNotFound('isLucky'),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('rejects a getter as a link target (it cannot be set)', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter link-is-lucky="count"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyNotFound('isLucky'),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('rejects a getter as a const target (it cannot be set)', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter const-is-lucky="true"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyNotFound('isLucky'),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('rejects a method as a prop target (it cannot be set)', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter prop-increment="count"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyNotFound('increment'),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('rejects a method as a link target (it cannot be set)', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter link-increment="count"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyNotFound('increment'),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('rejects a method as a const target (it cannot be set)', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter const-increment="1"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyNotFound('increment'),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('rejects an arrow field as a prop target (it cannot be set)', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter prop-on-update="count"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyNotFound('onUpdate'),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('reports no diagnostic when a getter is the child target of a bind attribute', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter bind-is-lucky></counter>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('ignores standard HTML tags', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<div prop-missing="count"></div>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('reports no diagnostic when the child component template does not exist', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<missing prop-missing="count"></missing>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('reports no diagnostic when the child template has no view-model', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<no-vm prop-missing="count"></no-vm>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('suggests the correctly-cased attribute when the child property matches by case only', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter prop-LastNumber="count"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyCaseMismatch('LastNumber', 'prop-last-number'),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('suggests the kebab-cased attribute for a const prefix', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter const-LastNumber="1"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyCaseMismatch('LastNumber', 'const-last-number'),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('positions the diagnostic over the attribute name', () => {
    const lines = [
      '<pelela view-model="ParentViewModel">',
      '  <counter',
      '    prop-ivalid="count"',
      '  ></counter>',
      '</pelela>',
    ]
    const document = createMockDocument(lines, parentDocumentPath)
    const [diagnostic] = validateBindingTargets(scanDocument(document), document)

    const nameStartColumn = lines[2].indexOf('prop-ivalid')
    assert.deepStrictEqual(diagnostic.range.start, new vscode.Position(2, nameStartColumn))
    assert.deepStrictEqual(
      diagnostic.range.end,
      new vscode.Position(2, nameStartColumn + 'prop-ivalid'.length)
    )
  })

  function getDiagnosticsEntries(
    collection: vscode.DiagnosticCollection
  ): Map<string, vscode.Diagnostic[]> {
    return (collection as unknown as { _entries: Map<string, vscode.Diagnostic[]> })._entries
  }

  it('integrates with validatePelelaDocument', () => {
    const collection = vscode.languages.createDiagnosticCollection()
    const document = createMockDocument(
      PARENT_TEMPLATE('<counter prop-ivalid="count"></counter>').split('\n'),
      parentDocumentPath
    )
    validatePelelaDocument(collection, document)

    const entries = getDiagnosticsEntries(collection)
    assert.strictEqual(entries.size, 1)
    const diagnostics = entries.get(parentDocumentPath) ?? []
    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      childPropertyNotFound('ivalid'),
      vscode.DiagnosticSeverity.Error
    )
  })
})
