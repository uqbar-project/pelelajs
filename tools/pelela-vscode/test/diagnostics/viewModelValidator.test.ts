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
  selectedBetClass: { bets: { name: string }[] } = { bets: [] }
  selectedClass: string = "active"
  product: { image: string; description: string } = { image: "", description: "" }

  handleClick(): void {
    console.log("clicked")
  }

  handleEnter(): void {
    console.log("enter")
  }

  goToDetail(): void {
    console.log("detail")
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

    it('accepts length on an Array<Type> generic property', () => {
      const genericPath = path.join(testFilesDir, 'GenericArrayVM.ts')
      fs.writeFileSync(
        genericPath,
        `export class GenericArrayVM {
  productos: Array<{ name: string }> = []
}`
      )
      const genericMembers = extractViewModelMembers(genericPath)
      const { tags, document } = prepareValidation(['<div if="productos.length">'], {
        tsPath: genericPath,
        pelelaPath: testPelelaPath,
        members: genericMembers,
      })
      const diagnostics = validateBindingProperties(tags, genericPath, genericMembers, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts length on an array property without type annotation', () => {
      const noTypePath = path.join(testFilesDir, 'NoTypeArrayVM.ts')
      fs.writeFileSync(
        noTypePath,
        `export class NoTypeArrayVM {
  items = [{ x: 1 }]
}`
      )
      const noTypeMembers = extractViewModelMembers(noTypePath)
      const { tags, document } = prepareValidation(['<div if="items.length">'], {
        tsPath: noTypePath,
        pelelaPath: testPelelaPath,
        members: noTypeMembers,
      })
      const diagnostics = validateBindingProperties(tags, noTypePath, noTypeMembers, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts length on a getter returning an array', () => {
      const getterPath = path.join(testFilesDir, 'GetterReturningArray.ts')
      fs.writeFileSync(
        getterPath,
        `export class GetterReturningArray {
  get productos() {
    return [{ name: "test" }]
  }

  get cantidadProductos() {
    return this.productos.length
  }
}`
      )
      const getterMembers = extractViewModelMembers(getterPath)
      const { tags, document } = prepareValidation(['<div if="productos.length">'], {
        tsPath: getterPath,
        pelelaPath: testPelelaPath,
        members: getterMembers,
      })
      const diagnostics = validateBindingProperties(tags, getterPath, getterMembers, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts length on an Array built-in property', () => {
      const { tags, document } = prepareValidation(['<div if="items.length">'], context)
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts length on a string property', () => {
      const { tags, document } = prepareValidation(['<div if="name.length">'], context)
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a dotted nested property in bind-src on img', () => {
      const { tags, document } = prepareValidation(['<img bind-src="product.image">'], context)
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a dotted nested property in bind-alt on img', () => {
      const { tags, document } = prepareValidation(
        ['<img bind-alt="product.description">'],
        context
      )
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a ViewModel property in bind-class', () => {
      const { tags, document } = prepareValidation(['<div bind-class="selectedClass">'], context)
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts an existing method in click', () => {
      const { tags } = prepareValidation(['<div click="goToDetail">'], context)
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a for-each index variable used in a binding', () => {
      const { tags, document } = prepareValidation(
        ['<div for-each="item of items" index="i">', '  <span bind-content="i"></span>', '</div>'],
        context
      )
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

    it('accepts a for-each item variable from a dotted collection name', () => {
      const { tags, document } = prepareValidation(
        [
          '<div for-each="bet of selectedBetClass.bets">',
          '  <span bind-content="bet"></span>',
          '</div>',
        ],
        context
      )
      const diagnostics = validateBindingProperties(tags, context.tsPath, context.members, document)
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a for-each item nested property from a dotted collection name', () => {
      const { tags, document } = prepareValidation(
        [
          '<div for-each="bet of selectedBetClass.bets">',
          '  <span bind-content="bet.name"></span>',
          '</div>',
        ],
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
