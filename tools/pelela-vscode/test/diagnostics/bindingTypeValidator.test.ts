import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import * as vscode from 'vscode'
import { validateBindingTypes } from '../../src/diagnostics/bindingTargetValidator'
import { validatePelelaDocument } from '../../src/diagnostics/diagnosticsProvider'
import { scanDocument } from '../../src/diagnostics/scanDocument'
import { t } from '../../src/i18n/index'
import { assertDiagnostic, createMockDocument } from './testHelpers'

const COUNTER_PELELA_CONTENT = `<component view-model="CounterViewModel">
  <span bind-content="value"></span>
</component>`

const COUNTER_VIEW_MODEL_CONTENT = `export class CounterViewModel {
  value = 0
  total = 0
  label = ''
  config = {}
  dynamic
}`

const PARENT_VIEW_MODEL_CONTENT = `export class HomeViewModel {
  selectedIndex = 1
  selectedLabel = ''
  selectedOptions = []
  people = [{ id: 1 }]

  get totalPeople() {
    return this.people.length
  }
}`

const RESERVED_PELELA_CONTENT = `<component view-model="ReservedViewModel"></component>`

const RESERVED_VIEW_MODEL_CONTENT = `export class ReservedViewModel {
  __proto__ = 0
}`

const PARENT_TEMPLATE = (componentUsage: string): string =>
  `<pelela view-model="HomeViewModel">
  ${componentUsage}
</pelela>`

function bindingTypeMismatch(params: {
  attr: string
  tag: string
  parentKey: string
  childKey: string
  parentKind: string
  childKind: string
}): string {
  return t('diagnostics.bindingTypeMismatch', { ...params })
}

describe('validateBindingTypes', () => {
  let testDir: string
  let parentDocumentPath: string

  before(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-binding-type-'))
    fs.writeFileSync(path.join(testDir, 'counter.pelela'), COUNTER_PELELA_CONTENT)
    fs.writeFileSync(path.join(testDir, 'counter.ts'), COUNTER_VIEW_MODEL_CONTENT)
    fs.writeFileSync(path.join(testDir, 'parent.ts'), PARENT_VIEW_MODEL_CONTENT)
    fs.writeFileSync(path.join(testDir, 'reserved.pelela'), RESERVED_PELELA_CONTENT)
    fs.writeFileSync(path.join(testDir, 'reserved.ts'), RESERVED_VIEW_MODEL_CONTENT)
    parentDocumentPath = path.join(testDir, 'parent.pelela')
  })

  after(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  function validate(content: string): vscode.Diagnostic[] {
    const document = createMockDocument(content.split('\n'), parentDocumentPath)
    return validateBindingTypes(scanDocument(document), document)
  }

  it('accepts a link whose parent and child values are both numbers', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter link-value="selectedIndex"></counter>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('accepts a link whose parent and child values share the same type', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter link-label="selectedLabel"></counter>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('reports a diagnostic when the parent string does not match the child number property', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter prop-total="selectedLabel"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      bindingTypeMismatch({
        attr: 'prop-total',
        tag: 'counter',
        parentKey: 'selectedLabel',
        childKey: 'total',
        parentKind: t('diagnostics.bindingKindString'),
        childKind: t('diagnostics.bindingKindNumber'),
      }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('reports a diagnostic when the parent number does not match the child boolean property', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter prop-label="selectedIndex"></counter>'))

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      bindingTypeMismatch({
        attr: 'prop-label',
        tag: 'counter',
        parentKey: 'selectedIndex',
        childKey: 'label',
        parentKind: t('diagnostics.bindingKindNumber'),
        childKind: t('diagnostics.bindingKindString'),
      }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('reports no diagnostic when the parent getter is a computed expression', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter prop-total="totalPeople"></counter>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('reports no diagnostic when the parent value is a for-each variable', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE(
        '<div for-each="person of people"><counter prop-total="person"></counter></div>'
      )
    )

    assert.strictEqual(diagnostics.length, 0)
  })

  it('reports no diagnostic when both sides are non-primitive values', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<counter prop-config="selectedOptions"></counter>')
    )

    assert.strictEqual(diagnostics.length, 0)
  })

  it('reports no diagnostic when the parent value is a nested path', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<counter prop-total="selectedLabel.length"></counter>')
    )

    assert.strictEqual(diagnostics.length, 0)
  })

  it('reports no diagnostic when the parent value is a reserved prototype key', () => {
    const reservedKeys = ['__proto__', 'constructor', 'prototype']

    reservedKeys.forEach((reservedKey) => {
      const diagnostics = validate(
        PARENT_TEMPLATE(`<counter prop-total="${reservedKey}"></counter>`)
      )

      assert.strictEqual(diagnostics.length, 0)
    })
  })

  it('reports no diagnostic when the child target is a reserved prototype key', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<reserved prop-__proto__="selectedIndex"></reserved>')
    )

    assert.strictEqual(diagnostics.length, 0)
  })

  it('reports no diagnostic when the child property has an unknown type', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<counter prop-dynamic="selectedLabel"></counter>')
    )

    assert.strictEqual(diagnostics.length, 0)
  })

  it('accepts a const attribute (types are validated by the const validator)', () => {
    const diagnostics = validate(PARENT_TEMPLATE('<counter const-total="1"></counter>'))

    assert.strictEqual(diagnostics.length, 0)
  })

  it('reports no diagnostic when the document has no view model', () => {
    const diagnostics = validate('<counter prop-total="selectedLabel"></counter>')

    assert.strictEqual(diagnostics.length, 0)
  })

  it('positions the diagnostic over the attribute value', () => {
    const lines = [
      '<pelela view-model="HomeViewModel">',
      '  <counter',
      '    prop-total="selectedLabel"',
      '  ></counter>',
      '</pelela>',
    ]
    const document = createMockDocument(lines, parentDocumentPath)
    const [diagnostic] = validateBindingTypes(scanDocument(document), document)

    const valueStartColumn = lines[2].indexOf('selectedLabel')
    assert.deepStrictEqual(diagnostic.range.start, new vscode.Position(2, valueStartColumn))
    assert.deepStrictEqual(
      diagnostic.range.end,
      new vscode.Position(2, valueStartColumn + 'selectedLabel'.length)
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
      PARENT_TEMPLATE('<counter prop-total="selectedLabel"></counter>').split('\n'),
      parentDocumentPath
    )
    validatePelelaDocument(collection, document)

    const entries = getDiagnosticsEntries(collection)
    assert.strictEqual(entries.size, 1)
    const diagnostics = entries.get(parentDocumentPath) ?? []
    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      bindingTypeMismatch({
        attr: 'prop-total',
        tag: 'counter',
        parentKey: 'selectedLabel',
        childKey: 'total',
        parentKind: t('diagnostics.bindingKindString'),
        childKind: t('diagnostics.bindingKindNumber'),
      }),
      vscode.DiagnosticSeverity.Error
    )
  })

  function getSingleDiagnostic(diagnostics: vscode.Diagnostic[]): vscode.Diagnostic {
    assert.strictEqual(diagnostics.length, 1)
    return diagnostics[0]
  }
})
