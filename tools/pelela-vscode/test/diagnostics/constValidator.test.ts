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

const COUNTER_VIEW_MODEL_CONTENT = `import { BaseCounterViewModel } from './base-counter-view-model'
export type Size = 'sm' | 'lg'
export enum Level { Low = 'low', High = 'high' }
export class CounterViewModel extends BaseCounterViewModel {
  count = 0
  lastNumber = 0
  active = true
  set amount(value: number) {}
  label = ''
  config = { level: 1 }
  items: string[] = []
  date = new Date()
  dynamic
  size: Size = 'sm'
  level: Level = Level.Low
  mode: 'grid' | 'list' = 'grid'
}`

const NO_VIEW_MODEL_PELELA_CONTENT = `<component>
  <span bind-content="count"></span>
</component>`

const ROSTER_PELELA_CONTENT = `<pelela view-model="StudentRoster">
  <span bind-content="total"></span>
</pelela>`

const ROSTER_VIEW_MODEL_CONTENT = `export class StudentRoster {
  students = []
  total = 0
  title = ''
  pendingScores!: number[]
  dueAt!: number | Date
  label!: string | number
  shift!: Shift
}

type Shift = 'morning' | 'evening'`

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
  const {
    name,
    value,
    expected,
    tag = 'counter-view-model',
    viewModel = 'CounterViewModel',
  } = params
  return t('diagnostics.constValueInvalid', { name, value, expected, tag, viewModel })
}

const ROSTER_TAG = 'student-roster'
const ROSTER_VIEW_MODEL = 'StudentRoster'

function rosterConstError(params: { name: string; value: string; expected: string }): string {
  return constError({ ...params, tag: ROSTER_TAG, viewModel: ROSTER_VIEW_MODEL })
}

function unsupportedTypeError(params: {
  name: string
  declaredType: string
  tag?: string
  viewModel?: string
}): string {
  const { name, declaredType, tag = 'counter-view-model', viewModel = 'CounterViewModel' } = params
  return t('diagnostics.constValueUnsupportedType', { name, declaredType, tag, viewModel })
}

function rosterUnsupportedTypeError(params: { name: string; declaredType: string }): string {
  return unsupportedTypeError({ ...params, tag: ROSTER_TAG, viewModel: ROSTER_VIEW_MODEL })
}

describe('validateConstValues', () => {
  let testDir: string
  let parentDocumentPath: string

  before(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-const-'))
    fs.writeFileSync(path.join(testDir, 'counter.pelela'), COUNTER_PELELA_CONTENT)
    fs.writeFileSync(
      path.join(testDir, 'base-counter-view-model.ts'),
      `export class BaseCounterViewModel {
  inheritedCount = 0
}`
    )
    fs.writeFileSync(path.join(testDir, 'counter.ts'), COUNTER_VIEW_MODEL_CONTENT)
    fs.writeFileSync(path.join(testDir, 'no-vm.pelela'), NO_VIEW_MODEL_PELELA_CONTENT)
    fs.writeFileSync(path.join(testDir, 'student-roster.pelela'), ROSTER_PELELA_CONTENT)
    fs.writeFileSync(path.join(testDir, 'student-roster.ts'), ROSTER_VIEW_MODEL_CONTENT)
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
    const diagnostics = validate(
      PARENT_TEMPLATE('<counter-view-model const-count="a"></counter-view-model>')
    )

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
    const numericValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-count="2"></counter-view-model>')
    )
    const trimmedValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-count=" 42 "></counter-view-model>')
    )

    assert.strictEqual(numericValue.length, 0)
    assert.strictEqual(trimmedValue.length, 0)
  })

  it('validates const values for a property defined only by a setter', () => {
    const invalidValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-amount="invalid"></counter-view-model>')
    )
    const validValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-amount="42"></counter-view-model>')
    )

    assertDiagnostic(
      getSingleDiagnostic(invalidValue),
      constError({
        name: 'amount',
        value: 'invalid',
        expected: t('diagnostics.constValueExpectedNumber'),
      }),
      vscode.DiagnosticSeverity.Error
    )
    assert.strictEqual(validValue.length, 0)
  })

  it('validates const values for properties inherited from a base class in another file', () => {
    const invalidValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-inherited-count="invalid"></counter-view-model>')
    )
    const validValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-inherited-count="42"></counter-view-model>')
    )

    assertDiagnostic(
      getSingleDiagnostic(invalidValue),
      constError({
        name: 'inheritedCount',
        value: 'invalid',
        expected: t('diagnostics.constValueExpectedNumber'),
      }),
      vscode.DiagnosticSeverity.Error
    )
    assert.strictEqual(validValue.length, 0)
  })

  it('reports a diagnostic when a const boolean receives an invalid literal', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<counter-view-model const-active="maybe"></counter-view-model>')
    )

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
    const trueValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-active="true"></counter-view-model>')
    )
    const spacedValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-active=" false "></counter-view-model>')
    )

    assert.strictEqual(trueValue.length, 0)
    assert.strictEqual(spacedValue.length, 0)
  })

  it('accepts any literal for a string property', () => {
    const numericValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-label="42"></counter-view-model>')
    )
    const textValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-label="hi"></counter-view-model>')
    )

    assert.strictEqual(numericValue.length, 0)
    assert.strictEqual(textValue.length, 0)
  })

  it('reports a diagnostic for object, array and Date properties', () => {
    const configValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-config="x"></counter-view-model>')
    )
    const itemsValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-items="x"></counter-view-model>')
    )
    const dateValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-date="x"></counter-view-model>')
    )

    assertDiagnostic(
      getSingleDiagnostic(configValue),
      unsupportedTypeError({ name: 'config', declaredType: '{ level: number; }' }),
      vscode.DiagnosticSeverity.Error
    )
    assertDiagnostic(
      getSingleDiagnostic(itemsValue),
      unsupportedTypeError({ name: 'items', declaredType: 'string[]' }),
      vscode.DiagnosticSeverity.Error
    )
    assertDiagnostic(
      getSingleDiagnostic(dateValue),
      unsupportedTypeError({ name: 'date', declaredType: 'Date' }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('reports a diagnostic for an array property declared without an initializer', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<student-roster const-pending-scores="three"></student-roster>')
    )

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      rosterUnsupportedTypeError({ name: 'pendingScores', declaredType: 'number[]' }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('reports a diagnostic for a union that mixes a scalar type with a class type', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<student-roster const-due-at="2026-09-28"></student-roster>')
    )

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      rosterUnsupportedTypeError({ name: 'dueAt', declaredType: 'number | Date' }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('names the allowed values of a string union reached through a type alias', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<student-roster const-shift="midday"></student-roster>')
    )

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      rosterConstError({
        name: 'shift',
        value: 'midday',
        expected: t('diagnostics.constValueExpected', { expected: '"morning" | "evening"' }),
      }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('accepts a listed value of a string union reached through a type alias', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<student-roster const-shift="morning"></student-roster>')
    )

    assert.strictEqual(diagnostics.length, 0)
  })

  it('leaves a union of two scalar types unchecked for runtime resolution', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<student-roster const-label="three"></student-roster>')
    )

    assert.strictEqual(diagnostics.length, 0)
  })

  it('accepts values for a property without a known type', () => {
    const textValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-dynamic="x"></counter-view-model>')
    )
    const numericValue = validate(
      PARENT_TEMPLATE('<counter-view-model const-dynamic="2"></counter-view-model>')
    )

    assert.strictEqual(textValue.length, 0)
    assert.strictEqual(numericValue.length, 0)
  })

  it('accepts a value listed in a type alias of string literals', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<counter-view-model const-size="lg"></counter-view-model>')
    )

    assert.strictEqual(diagnostics.length, 0)
  })

  it('names the allowed values when a value is outside a type alias of string literals', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<counter-view-model const-size="xx"></counter-view-model>')
    )

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      constError({
        name: 'size',
        value: 'xx',
        expected: t('diagnostics.constValueExpected', { expected: '"sm" | "lg"' }),
      }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('rejects a numeric value for a type alias of string literals', () => {
    const diagnostics = validate(
      PARENT_TEMPLATE('<counter-view-model const-size="5"></counter-view-model>')
    )

    assertDiagnostic(
      getSingleDiagnostic(diagnostics),
      constError({
        name: 'size',
        value: '5',
        expected: t('diagnostics.constValueExpected', { expected: '"sm" | "lg"' }),
      }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('accepts a value listed in an inline union of string literals', () => {
    const accepted = validate(
      PARENT_TEMPLATE('<counter-view-model const-mode="grid"></counter-view-model>')
    )
    const rejected = validate(
      PARENT_TEMPLATE('<counter-view-model const-mode="zz"></counter-view-model>')
    )

    assert.strictEqual(accepted.length, 0)
    assertDiagnostic(
      getSingleDiagnostic(rejected),
      constError({
        name: 'mode',
        value: 'zz',
        expected: t('diagnostics.constValueExpected', { expected: '"grid" | "list"' }),
      }),
      vscode.DiagnosticSeverity.Error
    )
  })

  it('accepts a string enum member because it holds that string at runtime', () => {
    const accepted = validate(
      PARENT_TEMPLATE('<counter-view-model const-level="high"></counter-view-model>')
    )
    const rejected = validate(
      PARENT_TEMPLATE('<counter-view-model const-level="mid"></counter-view-model>')
    )

    assert.strictEqual(accepted.length, 0)
    assertDiagnostic(
      getSingleDiagnostic(rejected),
      constError({
        name: 'level',
        value: 'mid',
        expected: t('diagnostics.constValueExpected', { expected: '"low" | "high"' }),
      }),
      vscode.DiagnosticSeverity.Error
    )
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
    const diagnostics = validate(
      PARENT_TEMPLATE('<counter-view-model const-last-number="a"></counter-view-model>')
    )

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
      '  <counter-view-model',
      '    const-count="a"',
      '  ></counter-view-model>',
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
      PARENT_TEMPLATE('<counter-view-model const-count="a"></counter-view-model>').split('\n'),
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
