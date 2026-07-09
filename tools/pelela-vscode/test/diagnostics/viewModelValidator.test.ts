import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import * as vscode from 'vscode'
import { scanDocument } from '../../src/diagnostics/scanDocument'
import type { TagInfo } from '../../src/diagnostics/types'
import {
  validateBindingProperties,
  validateEventMethods,
  validateViewModelExistence,
} from '../../src/diagnostics/viewModelValidator'
import { t } from '../../src/i18n/index'
import type { ViewModelMembers } from '../../src/parsers/viewModelParser'
import { extractViewModelMembers } from '../../src/parsers/viewModelParser'
import { assertDiagnostic, createMockDocument } from './testHelpers'

const VIEW_MODEL_FIXTURE = `
export class TestViewModel {
  name: string = "test"
  count: number = 0
  obj = { value: "hello" }
  items: { name: string }[] = []

  handleClick(): void {
    console.log("clicked")
  }

  handleEnter(): void {
    console.log("enter")
  }
}
`

interface ViewModelContext {
  tsPath: string
  pelelaPath: string
  members: ViewModelMembers
}

function prepareValidation(
  lines: string[],
  context: ViewModelContext
): { tags: TagInfo[]; document: vscode.TextDocument } {
  const document = createMockDocument(lines, context.pelelaPath)
  const tags = scanDocument(document)
  return { tags, document }
}

describe('viewModelValidator', () => {
  const testFilesDir = path.join(__dirname, '../fixtures')
  const testVMPath = path.join(testFilesDir, 'viewModelTestViewModel.ts')
  const testPelelaPath = path.join(testFilesDir, 'viewModelTest.pelela')
  let context: ViewModelContext

  before(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }
    fs.writeFileSync(testVMPath, VIEW_MODEL_FIXTURE)
    context = {
      tsPath: testVMPath,
      pelelaPath: testPelelaPath,
      members: extractViewModelMembers(testVMPath),
    }
  })

  after(() => {
    if (fs.existsSync(testVMPath)) {
      fs.unlinkSync(testVMPath)
    }
  })

  describe('validateViewModelExistence', () => {
    it('accepts an existing ViewModel class', () => {
      const { tags } = prepareValidation(['<pelela view-model="TestViewModel">'], context)
      assert.strictEqual(validateViewModelExistence(tags, context.tsPath).length, 0)
    })

    it('rejects a non-existent ViewModel class', () => {
      const { tags } = prepareValidation(['<pelela view-model="NonExistentViewModel">'], context)
      const diagnostics = validateViewModelExistence(tags, context.tsPath)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.viewModelNotFound', { name: 'NonExistentViewModel' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('reports each missing ViewModel independently', () => {
      const { tags } = prepareValidation(
        ['<pelela view-model="NonExistentViewModel">', '  <component view-model="AlsoMissing">'],
        context
      )
      const diagnostics = validateViewModelExistence(tags, context.tsPath)
      assert.strictEqual(diagnostics.length, 2)
    })
  })

  describe('validateBindingProperties', () => {
    it('accepts an existing property', () => {
      const { tags, document } = prepareValidation(['<div bind-content="name">'], context)
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('rejects a non-existent property', () => {
      const { tags, document } = prepareValidation(['<div bind-content="nonExistent">'], context)
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyNotFound', { name: 'nonExistent' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('accepts an if attribute with an existing property', () => {
      const { tags, document } = prepareValidation(['<div if="count">'], context)
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a for-each item variable used in a binding', () => {
      const { tags, document } = prepareValidation(
        ['<div for-each="item of items">', '  <span bind-content="item"></span>', '</div>'],
        context
      )
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a nested property path', () => {
      const { tags, document } = prepareValidation(['<div bind-content="obj.value">'], context)
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a for-each item nested property', () => {
      const { tags, document } = prepareValidation(
        ['<div for-each="item of items">', '  <span bind-content="item.name"></span>', '</div>'],
        context
      )
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('rejects a non-existent for-each nested property', () => {
      const { tags, document } = prepareValidation(
        [
          '<div for-each="item of items">',
          '  <span bind-content="item.nonExistent"></span>',
          '</div>',
        ],
        context
      )
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyNotFound', { name: 'nonExistent' }),
        vscode.DiagnosticSeverity.Error
      )
    })
  })

  describe('validateEventMethods', () => {
    it('accepts an existing click method', () => {
      const { tags } = prepareValidation(['<button click="handleClick">'], context)
      assert.strictEqual(validateEventMethods(tags, context.members).length, 0)
    })

    it('rejects a non-existent click method', () => {
      const { tags } = prepareValidation(['<button click="nonExistentMethod">'], context)
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.methodNotFound', { name: 'nonExistentMethod' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('accepts an existing enter method', () => {
      const { tags } = prepareValidation(['<input enter="handleEnter">'], context)
      assert.strictEqual(validateEventMethods(tags, context.members).length, 0)
    })

    it('rejects a non-existent enter method', () => {
      const { tags } = prepareValidation(['<input enter="nonExistentEnter">'], context)
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.methodNotFound', { name: 'nonExistentEnter' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('reports multiple event method errors', () => {
      const { tags } = prepareValidation(
        ['<button click="badMethod" enter="anotherBadMethod">'],
        context
      )
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 2)
    })
  })
})
