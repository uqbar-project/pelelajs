import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { after, afterEach, before, describe, it } from 'mocha'
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
  total: number = 0
  obj = { value: "hello" }
  items: { name: string }[] = []
  selectedBetClass: { bets: { name: string }[] } = { bets: [] }
  selectedClass: string = "active"
  product: { image: string; description: string } = { image: "", description: "" }
  increment = () => { this.count = this.count + 1 }
  incrementParen = (() => { this.count = this.count + 1 })
  incrementAs = (() => { this.count = this.count + 1 }) as () => void
  incrementAssert = <() => void>(() => { this.count = this.count + 1 })
  incrementSatisfies = (() => { this.count = this.count + 1 }) satisfies () => void
  incrementNonNull = (() => { this.count = this.count + 1 })!

  get totalCount() { return 0 }

  get dEcrement() { return 0 }

  counTerPlusOne(): void {
    this.count = 0
  }

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

const INHERITED_VIEW_MODEL_FIXTURE = `
export class BaseViewModel {
  title: string = "test"
  reset(): void {}
}

export class InheritedViewModel extends BaseViewModel {
  items: { name: string }[] = []
  handleItem(): void {}
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
  let genericPath: string
  let noTypePath: string
  let getterPath: string
  let missingExportPath: string
  let wrongCasePath: string
  let notAClassPath: string
  let inheritedPath: string

  before(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }
    fs.writeFileSync(testVMPath, VIEW_MODEL_FIXTURE)
    context = {
      tsPath: testVMPath,
      pelelaPath: testPelelaPath,
      members: extractViewModelMembers(testVMPath, 'TestViewModel'),
    }
    genericPath = path.join(testFilesDir, 'GenericArrayVM.ts')
    noTypePath = path.join(testFilesDir, 'NoTypeArrayVM.ts')
    getterPath = path.join(testFilesDir, 'GetterReturningArray.ts')
    missingExportPath = path.join(testFilesDir, 'MissingExportVM.ts')
    wrongCasePath = path.join(testFilesDir, 'WrongCaseVM.ts')
    notAClassPath = path.join(testFilesDir, 'NotAClassVM.ts')
    inheritedPath = path.join(testFilesDir, 'InheritedVM.ts')
    fs.writeFileSync(inheritedPath, INHERITED_VIEW_MODEL_FIXTURE)
  })

  afterEach(() => {
    ;[genericPath, noTypePath, getterPath, missingExportPath, wrongCasePath, notAClassPath].forEach(
      (filePath) => {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }
    )
  })

  after(() => {
    if (fs.existsSync(testVMPath)) {
      fs.unlinkSync(testVMPath)
    }
    if (inheritedPath && fs.existsSync(inheritedPath)) {
      fs.unlinkSync(inheritedPath)
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
        t('diagnostics.viewModelNotFound', {
          name: 'NonExistentViewModel',
          tsFileName: 'viewModelTestViewModel.ts',
          suggestedName: 'ViewModelTestViewModel',
        }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('reports missingExport when the class is declared but not exported', () => {
      fs.writeFileSync(
        missingExportPath,
        `class MissingExportVM {
  title: string = ""
}`
      )
      const { tags } = prepareValidation(['<pelela view-model="MissingExportVM">'], context)
      const diagnostics = validateViewModelExistence(tags, missingExportPath)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.viewModelMissingExport', {
          name: 'MissingExportVM',
          tsFileName: 'MissingExportVM.ts',
        }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('reports wrongCase when the exported class differs only by case', () => {
      fs.writeFileSync(
        wrongCasePath,
        `export class WrongCaseVM {
  title: string = ""
}`
      )
      const { tags } = prepareValidation(['<pelela view-model="wrongcasevm">'], context)
      const diagnostics = validateViewModelExistence(tags, wrongCasePath)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.viewModelWrongCase', { name: 'wrongcasevm', expectedName: 'WrongCaseVM' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('reports notAClass as an Object when the view model is an object literal', () => {
      fs.writeFileSync(notAClassPath, `export const conversorObj = { millas: 100, kilometros: 2 }`)
      const { tags } = prepareValidation(['<pelela view-model="conversorObj">'], context)
      const diagnostics = validateViewModelExistence(tags, notAClassPath)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.viewModelNotAClassObject', {
          name: 'conversorObj',
          tsFileName: 'NotAClassVM.ts',
        }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('reports notAClass as a Function when the view model is an exported function', () => {
      fs.writeFileSync(notAClassPath, `export function conversor() { return 0 }`)
      const { tags } = prepareValidation(['<pelela view-model="conversor">'], context)
      const diagnostics = validateViewModelExistence(tags, notAClassPath)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.viewModelNotAClassFunction', {
          name: 'conversor',
          tsFileName: 'NotAClassVM.ts',
        }),
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
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts an inherited property inside the derived ViewModel', () => {
      const inheritedMembers = extractViewModelMembers(inheritedPath, 'InheritedViewModel')
      const inheritedContext = {
        tsPath: inheritedPath,
        pelelaPath: testPelelaPath,
        members: inheritedMembers,
      }
      const { tags, document } = prepareValidation(['<div bind-content="title">'], inheritedContext)
      const diagnostics = validateBindingProperties(
        tags,
        inheritedPath,
        inheritedMembers,
        document,
        'InheritedViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('rejects a non-existent property', () => {
      const { tags, document } = prepareValidation(['<div bind-content="nonExistent">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyNotFound', { name: 'nonExistent' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('accepts an if attribute with an existing property', () => {
      const { tags, document } = prepareValidation(['<div if="count">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a for-each item variable used in a binding', () => {
      const { tags, document } = prepareValidation(
        ['<div for-each="item of items">', '  <span bind-content="item"></span>', '</div>'],
        context
      )
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a nested property path', () => {
      const { tags, document } = prepareValidation(['<div bind-content="obj.value">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts length on an Array<Type> generic property', () => {
      fs.writeFileSync(
        genericPath,
        `export class GenericArrayVM {
  productos: Array<{ name: string }> = []
}`
      )
      const genericMembers = extractViewModelMembers(genericPath, 'GenericArrayVM')
      const { tags, document } = prepareValidation(['<div if="productos.length">'], {
        tsPath: genericPath,
        pelelaPath: testPelelaPath,
        members: genericMembers,
      })
      const diagnostics = validateBindingProperties(
        tags,
        genericPath,
        genericMembers,
        document,
        'GenericArrayVM'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts length on an array property without type annotation', () => {
      fs.writeFileSync(
        noTypePath,
        `export class NoTypeArrayVM {
  items = [{ x: 1 }]
}`
      )
      const noTypeMembers = extractViewModelMembers(noTypePath, 'NoTypeArrayVM')
      const { tags, document } = prepareValidation(['<div if="items.length">'], {
        tsPath: noTypePath,
        pelelaPath: testPelelaPath,
        members: noTypeMembers,
      })
      const diagnostics = validateBindingProperties(
        tags,
        noTypePath,
        noTypeMembers,
        document,
        'NoTypeArrayVM'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts length on a getter returning an array', () => {
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
      const getterMembers = extractViewModelMembers(getterPath, 'GetterReturningArray')
      const { tags, document } = prepareValidation(['<div if="productos.length">'], {
        tsPath: getterPath,
        pelelaPath: testPelelaPath,
        members: getterMembers,
      })
      const diagnostics = validateBindingProperties(
        tags,
        getterPath,
        getterMembers,
        document,
        'GetterReturningArray'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts length on an Array built-in property', () => {
      const { tags, document } = prepareValidation(['<div if="items.length">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts length on a string property', () => {
      const { tags, document } = prepareValidation(['<div if="name.length">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a dotted nested property in bind-src on img', () => {
      const { tags, document } = prepareValidation(['<img bind-src="product.image">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a dotted nested property in bind-alt on img', () => {
      const { tags, document } = prepareValidation(
        ['<img bind-alt="product.description">'],
        context
      )
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a ViewModel property in bind-class', () => {
      const { tags, document } = prepareValidation(['<div bind-class="selectedClass">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
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
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts a for-each item nested property', () => {
      const { tags, document } = prepareValidation(
        ['<div for-each="item of items">', '  <span bind-content="item.name"></span>', '</div>'],
        context
      )
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('rejects element property accessed directly on array outside for-each', () => {
      const { tags, document } = prepareValidation(['<div bind-content="items.name">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyNotFound', { name: 'name' }),
        vscode.DiagnosticSeverity.Error
      )
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
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
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
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
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
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyNotFound', { name: 'nonExistent' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a binding to a method with methodNeedsGetter', () => {
      const { tags, document } = prepareValidation(['<div bind-content="handleClick">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.methodNeedsGetter', { name: 'handleClick' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a binding to an arrow function field with arrowFunctionNotAllowed', () => {
      const { tags, document } = prepareValidation(['<div bind-content="increment">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionNotAllowed', { name: 'increment' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a binding to an arrow function field wrapped in parentheses with arrowFunctionNotAllowed', () => {
      const { tags, document } = prepareValidation(['<div bind-content="incrementParen">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionNotAllowed', { name: 'incrementParen' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('accepts a binding to a getter', () => {
      const { tags, document } = prepareValidation(['<div bind-content="totalCount">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('rejects a binding with wrong-cased getter using propertyCaseMismatch', () => {
      const { tags, document } = prepareValidation(['<div bind-content="TotalCount">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyCaseMismatch', { name: 'TotalCount', suggestedName: 'totalCount' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a binding with wrong-cased property using propertyCaseMismatch', () => {
      const { tags, document } = prepareValidation(['<div bind-content="Name">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyCaseMismatch', { name: 'Name', suggestedName: 'name' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a binding whose property name differs only by case from a method member using propertyCaseMismatch', () => {
      const { tags, document } = prepareValidation(['<div bind-content="counterPlusOne">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyCaseMismatch', {
          name: 'counterPlusOne',
          suggestedName: 'counTerPlusOne',
        }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a binding whose property name differs only by case from an arrow function field using propertyCaseMismatch', () => {
      const { tags, document } = prepareValidation(['<div bind-content="Increment">'], context)
      const diagnostics = validateBindingProperties(
        tags,
        context.tsPath,
        context.members,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyCaseMismatch', { name: 'Increment', suggestedName: 'increment' }),
        vscode.DiagnosticSeverity.Error
      )
    })
  })

  describe('validateEventMethods', () => {
    it('accepts an existing click method', () => {
      const { tags } = prepareValidation(['<button click="handleClick">'], context)
      assert.strictEqual(validateEventMethods(tags, context.members).length, 0)
    })

    it('accepts an inherited method inside the derived ViewModel', () => {
      const inheritedMembers = extractViewModelMembers(inheritedPath, 'InheritedViewModel')
      const { tags } = prepareValidation(['<button click="reset">'], {
        tsPath: inheritedPath,
        pelelaPath: testPelelaPath,
        members: inheritedMembers,
      })
      assert.strictEqual(validateEventMethods(tags, inheritedMembers).length, 0)
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

    it('rejects an event referencing a getter with getterAsMethod', () => {
      const { tags } = prepareValidation(['<button click="totalCount">'], context)
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.getterAsMethod', { name: 'totalCount' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing a ViewModel property with propertyAsMethod', () => {
      const { tags } = prepareValidation(['<button click="total">'], context)
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyAsMethod', { name: 'total' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing an arrow function field with arrowFunctionAsMethod', () => {
      const { tags } = prepareValidation(['<button click="increment">'], context)
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionAsMethod', { name: 'increment' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing an arrow wrapped in an as expression with arrowFunctionAsMethod', () => {
      const { tags } = prepareValidation(['<button click="incrementAs">'], context)
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionAsMethod', { name: 'incrementAs' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing an arrow wrapped in a type assertion with arrowFunctionAsMethod', () => {
      const { tags } = prepareValidation(['<button click="incrementAssert">'], context)
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionAsMethod', { name: 'incrementAssert' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing an arrow wrapped in a satisfies expression with arrowFunctionAsMethod', () => {
      const { tags } = prepareValidation(['<button click="incrementSatisfies">'], context)
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionAsMethod', { name: 'incrementSatisfies' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing an arrow wrapped in a non-null expression with arrowFunctionAsMethod', () => {
      const { tags } = prepareValidation(['<button click="incrementNonNull">'], context)
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionAsMethod', { name: 'incrementNonNull' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event with wrong-cased method using methodCaseMismatch', () => {
      const { tags } = prepareValidation(['<button click="handleclick">'], context)
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.methodCaseMismatch', { name: 'handleclick', suggestedName: 'handleClick' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event whose handler name differs only by case from a getter member using methodCaseMismatch', () => {
      const { tags } = prepareValidation(['<button click="decrement">'], context)
      const diagnostics = validateEventMethods(tags, context.members)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.methodCaseMismatch', { name: 'decrement', suggestedName: 'dEcrement' }),
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
