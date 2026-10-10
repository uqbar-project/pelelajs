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
  validateForEachCollections,
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
  ids: Set<number> = new Set()
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

const NAV_BAR_VIEW_MODEL_FIXTURE = `
export class NavLink {
  path: string = "/orders"
  goTo = (): void => { console.log("go") }
  navigate(): void {
    console.log("navigate")
  }
  get title(): string {
    return this.path
  }
}

export class NavBar {
  get links(): NavLink[] {
    return []
  }
}
`

const NULLABLE_UNION_NAV_FIXTURE = `
export class NavLink {
  navigate(): void {
    console.log("navigate")
  }
}

export class NullableUnionNav {
  links: null | NavLink[] = null
}
`

const BET_SLIP_FIXTURE = `
export type BetType = {
  description: string
  get gain(): number
  confirm(): void
  goTo: () => void
}

export interface BetOption {
  description: string
  get gain(): number
  confirm(): void
}

export class BetSlip {
  bets: BetType[] = []
  options: BetOption[] = []
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
  let navBarPath: string
  let navBarMembers: ViewModelMembers
  let nullableUnionPath: string
  let nullableUnionMembers: ViewModelMembers

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
    navBarPath = path.join(testFilesDir, 'NavBarViewModel.ts')
    fs.writeFileSync(navBarPath, NAV_BAR_VIEW_MODEL_FIXTURE)
    navBarMembers = extractViewModelMembers(navBarPath, 'NavBar')
    nullableUnionPath = path.join(testFilesDir, 'NullableUnionNavViewModel.ts')
    fs.writeFileSync(nullableUnionPath, NULLABLE_UNION_NAV_FIXTURE)
    nullableUnionMembers = extractViewModelMembers(nullableUnionPath, 'NullableUnionNav')
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
          suggestedName: 'TestViewModel',
        }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('reports a non-existent ViewModel class without an empty suggestion', () => {
      fs.writeFileSync(notAClassPath, 'export const MAX = 10')
      const { tags } = prepareValidation(['<pelela view-model="NonExistentViewModel">'], context)
      const diagnostics = validateViewModelExistence(tags, notAClassPath)

      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.viewModelNotFoundWithoutSuggestion', {
          name: 'NonExistentViewModel',
          tsFileName: 'NotAClassVM.ts',
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
      fs.writeFileSync(notAClassPath, `export const converterObj = { millas: 100, kilometros: 2 }`)
      const { tags } = prepareValidation(['<pelela view-model="converterObj">'], context)
      const diagnostics = validateViewModelExistence(tags, notAClassPath)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.viewModelNotAClassObject', {
          name: 'converterObj',
          tsFileName: 'NotAClassVM.ts',
        }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('reports notAClass as a Function when the view model is an exported function', () => {
      fs.writeFileSync(notAClassPath, `export function converter() { return 0 }`)
      const { tags } = prepareValidation(['<pelela view-model="converter">'], context)
      const diagnostics = validateViewModelExistence(tags, notAClassPath)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.viewModelNotAClassFunction', {
          name: 'converter',
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
      const { tags, document } = prepareValidation(['<div click="goToDetail">'], context)
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
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
      const { tags, document } = prepareValidation(['<button click="handleClick">'], context)
      assert.strictEqual(
        validateEventMethods(tags, context.members, context.tsPath, document, 'TestViewModel')
          .length,
        0
      )
    })

    it('accepts an inherited method inside the derived ViewModel', () => {
      const inheritedMembers = extractViewModelMembers(inheritedPath, 'InheritedViewModel')
      const { tags, document } = prepareValidation(['<button click="reset">'], {
        tsPath: inheritedPath,
        pelelaPath: testPelelaPath,
        members: inheritedMembers,
      })
      const diagnostics = validateEventMethods(
        tags,
        inheritedMembers,
        inheritedPath,
        document,
        'InheritedViewModel'
      )
      assert.strictEqual(diagnostics.length, 0)
    })

    it('rejects a non-existent click method', () => {
      const { tags, document } = prepareValidation(['<button click="nonExistentMethod">'], context)
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.methodNotFound', { name: 'nonExistentMethod' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('accepts an existing enter method', () => {
      const { tags, document } = prepareValidation(['<input enter="handleEnter">'], context)
      assert.strictEqual(
        validateEventMethods(tags, context.members, context.tsPath, document, 'TestViewModel')
          .length,
        0
      )
    })

    it('rejects a non-existent enter method', () => {
      const { tags, document } = prepareValidation(['<input enter="nonExistentEnter">'], context)
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.methodNotFound', { name: 'nonExistentEnter' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing a getter with getterAsMethod', () => {
      const { tags, document } = prepareValidation(['<button click="totalCount">'], context)
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.getterAsMethod', { name: 'totalCount' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing a ViewModel property with propertyAsMethod', () => {
      const { tags, document } = prepareValidation(['<button click="total">'], context)
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyAsMethod', { name: 'total' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing an arrow function field with arrowFunctionAsMethod', () => {
      const { tags, document } = prepareValidation(['<button click="increment">'], context)
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionAsMethod', { name: 'increment' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing an arrow wrapped in an as expression with arrowFunctionAsMethod', () => {
      const { tags, document } = prepareValidation(['<button click="incrementAs">'], context)
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionAsMethod', { name: 'incrementAs' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing an arrow wrapped in a type assertion with arrowFunctionAsMethod', () => {
      const { tags, document } = prepareValidation(['<button click="incrementAssert">'], context)
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionAsMethod', { name: 'incrementAssert' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing an arrow wrapped in a satisfies expression with arrowFunctionAsMethod', () => {
      const { tags, document } = prepareValidation(['<button click="incrementSatisfies">'], context)
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionAsMethod', { name: 'incrementSatisfies' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event referencing an arrow wrapped in a non-null expression with arrowFunctionAsMethod', () => {
      const { tags, document } = prepareValidation(['<button click="incrementNonNull">'], context)
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionAsMethod', { name: 'incrementNonNull' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event with wrong-cased method using methodCaseMismatch', () => {
      const { tags, document } = prepareValidation(['<button click="handleclick">'], context)
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.methodCaseMismatch', { name: 'handleclick', suggestedName: 'handleClick' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an event whose handler name differs only by case from a getter member using methodCaseMismatch', () => {
      const { tags, document } = prepareValidation(['<button click="decrement">'], context)
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.methodCaseMismatch', { name: 'decrement', suggestedName: 'dEcrement' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('reports multiple event method errors', () => {
      const { tags, document } = prepareValidation(
        ['<button click="badMethod" enter="anotherBadMethod">'],
        context
      )
      const diagnostics = validateEventMethods(
        tags,
        context.members,
        context.tsPath,
        document,
        'TestViewModel'
      )
      assert.strictEqual(diagnostics.length, 2)
    })

    describe('handlers of the iterated item inside for-each', () => {
      const navBarContext: ViewModelContext = {
        tsPath: navBarPath,
        pelelaPath: testPelelaPath,
        members: navBarMembers,
      }

      function validateInForEach(attribute: string): vscode.Diagnostic[] {
        const { tags, document } = prepareValidation(
          [
            '<pelela view-model="NavBar">',
            `  <div for-each="link of links">`,
            `    <button ${attribute}></button>`,
            '  </div>',
            '</pelela>',
          ],
          navBarContext
        )
        return validateEventMethods(tags, navBarMembers, navBarPath, document, 'NavBar')
      }

      it('accepts an instance method of the item', () => {
        assert.deepStrictEqual(validateInForEach('click="link.navigate"'), [])
      })

      it('skips validation of deeper item paths addressing nested types', () => {
        assert.deepStrictEqual(validateInForEach('click="link.nested.navigate"'), [])
      })

      it('rejects an arrow function field of the item with arrowFunctionAsMethod', () => {
        const diagnostics = validateInForEach('click="link.goTo"')
        assert.strictEqual(diagnostics.length, 1)
        assertDiagnostic(
          diagnostics[0],
          t('diagnostics.arrowFunctionAsMethod', { name: 'link.goTo' }),
          vscode.DiagnosticSeverity.Error
        )
      })

      it('rejects a getter of the item with getterAsMethod', () => {
        const diagnostics = validateInForEach('click="link.title"')
        assert.strictEqual(diagnostics.length, 1)
        assertDiagnostic(
          diagnostics[0],
          t('diagnostics.getterAsMethod', { name: 'link.title' }),
          vscode.DiagnosticSeverity.Error
        )
      })

      it('rejects a plain property of the item with propertyAsMethod', () => {
        const diagnostics = validateInForEach('click="link.path"')
        assert.strictEqual(diagnostics.length, 1)
        assertDiagnostic(
          diagnostics[0],
          t('diagnostics.propertyAsMethod', { name: 'link.path' }),
          vscode.DiagnosticSeverity.Error
        )
      })

      it('rejects a non-existent item method with methodNotFound', () => {
        const diagnostics = validateInForEach('click="link.missing"')
        assert.strictEqual(diagnostics.length, 1)
        assertDiagnostic(
          diagnostics[0],
          t('diagnostics.methodNotFound', { name: 'missing' }),
          vscode.DiagnosticSeverity.Error
        )
      })

      it('rejects an item handler name with wrong case with methodCaseMismatch', () => {
        const diagnostics = validateInForEach('click="link.Navigate"')
        assert.strictEqual(diagnostics.length, 1)
        assertDiagnostic(
          diagnostics[0],
          t('diagnostics.methodCaseMismatch', { name: 'link.Navigate', suggestedName: 'navigate' }),
          vscode.DiagnosticSeverity.Error
        )
      })

      it('accepts the index variable of the for-each', () => {
        const { tags, document } = prepareValidation(
          [
            '<pelela view-model="NavBar">',
            '  <div for-each="link of links" index="i">',
            '    <button click="i"></button>',
            '  </div>',
            '</pelela>',
          ],
          navBarContext
        )
        assert.deepStrictEqual(
          validateEventMethods(tags, navBarMembers, navBarPath, document, 'NavBar'),
          []
        )
      })

      it('keeps validating view model handlers of a for-each with their own messages', () => {
        const { tags, document } = prepareValidation(
          [
            '<pelela view-model="NavBar">',
            '  <div for-each="link of links">',
            '    <button click="link.navigate" enter="nonExistentMethod"></button>',
            '  </div>',
            '</pelela>',
          ],
          navBarContext
        )
        const diagnostics = validateEventMethods(
          tags,
          navBarMembers,
          navBarPath,
          document,
          'NavBar'
        )
        assert.strictEqual(diagnostics.length, 1)
        assertDiagnostic(
          diagnostics[0],
          t('diagnostics.methodNotFound', { name: 'nonExistentMethod' }),
          vscode.DiagnosticSeverity.Error
        )
      })
    })

    describe('handlers of a nullable-union collection inside for-each', () => {
      const nullableUnionContext: ViewModelContext = {
        tsPath: nullableUnionPath,
        pelelaPath: testPelelaPath,
        members: nullableUnionMembers,
      }

      function validateNullableUnionInForEach(attribute: string): vscode.Diagnostic[] {
        const { tags, document } = prepareValidation(
          [
            '<pelela view-model="NullableUnionNav">',
            `  <div for-each="link of links">`,
            `    <button ${attribute}></button>`,
            '  </div>',
            '</pelela>',
          ],
          nullableUnionContext
        )
        return validateEventMethods(
          tags,
          nullableUnionMembers,
          nullableUnionPath,
          document,
          'NullableUnionNav'
        )
      }

      it('accepts an instance method of the item with null before the array type', () => {
        assert.deepStrictEqual(validateNullableUnionInForEach('click="link.navigate"'), [])
      })

      it('rejects a non-existent item method with methodNotFound', () => {
        const diagnostics = validateNullableUnionInForEach('click="link.missing"')
        assert.strictEqual(diagnostics.length, 1)
        assertDiagnostic(
          diagnostics[0],
          t('diagnostics.methodNotFound', { name: 'missing' }),
          vscode.DiagnosticSeverity.Error
        )
      })
    })
  })

  describe('validateForEachCollections', () => {
    function validateForEachCollection(lines: string[]): vscode.Diagnostic[] {
      const { tags } = prepareValidation(lines, context)
      return validateForEachCollections(tags, context.tsPath, context.members, 'TestViewModel')
    }

    it('accepts an existing root collection', () => {
      assert.deepStrictEqual(validateForEachCollection(['<div for-each="item of items">']), [])
    })

    it('accepts an existing nested collection', () => {
      assert.deepStrictEqual(
        validateForEachCollection(['<div for-each="bet of selectedBetClass.bets">']),
        []
      )
    })

    it('rejects a missing root collection', () => {
      const diagnostics = validateForEachCollection(['<div for-each="order of orders3">'])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyNotFound', { name: 'orders3' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a missing nested collection segment', () => {
      const diagnostics = validateForEachCollection([
        '<div for-each="bet of selectedBetClass.missing">',
      ])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyNotFound', { name: 'missing' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an expression without the item of collection format', () => {
      const diagnostics = validateForEachCollection(['<div for-each="alotofwords">'])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.forEachInvalidSyntax', {
          expression: 'alotofwords',
          format: 'item of collection',
        }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an expression without a collection', () => {
      const diagnostics = validateForEachCollection(['<div for-each="order of">'])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.forEachInvalidSyntax', {
          expression: 'order of',
          format: 'item of collection',
        }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('ignores an empty expression', () => {
      assert.deepStrictEqual(validateForEachCollection(['<div for-each="">']), [])
    })

    it('rejects a method used as collection with methodNeedsGetter', () => {
      const diagnostics = validateForEachCollection(['<div for-each="item of handleClick">'])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.methodNeedsGetter', { name: 'handleClick' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects an arrow function used as collection', () => {
      const diagnostics = validateForEachCollection(['<div for-each="item of increment">'])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionNotAllowed', { name: 'increment' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('reports a collection name with wrong case', () => {
      const diagnostics = validateForEachCollection(['<div for-each="item of Items">'])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyCaseMismatch', { name: 'Items', suggestedName: 'items' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a root property that is not an array', () => {
      const diagnostics = validateForEachCollection(['<div for-each="letter of name">'])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.forEachNotArray', { name: 'name' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a Set used as collection', () => {
      const diagnostics = validateForEachCollection(['<div for-each="id of ids">'])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.forEachNotArray', { name: 'ids' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a nested property that is not an array', () => {
      const diagnostics = validateForEachCollection(['<div for-each="value of obj.value">'])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.forEachNotArray', { name: 'obj.value' }),
        vscode.DiagnosticSeverity.Error
      )
    })
  })

  describe('for-each over type-level items', () => {
    const betSlipFileName = 'BetSlipForEachVM.ts'
    let betSlipPath: string
    let betSlipMembers: ViewModelMembers

    before(() => {
      betSlipPath = path.join(testFilesDir, betSlipFileName)
      fs.writeFileSync(betSlipPath, BET_SLIP_FIXTURE)
      betSlipMembers = extractViewModelMembers(betSlipPath, 'BetSlip')
    })

    after(() => {
      if (fs.existsSync(betSlipPath)) {
        fs.unlinkSync(betSlipPath)
      }
    })

    function betSlipContext(): ViewModelContext {
      return { tsPath: betSlipPath, pelelaPath: testPelelaPath, members: betSlipMembers }
    }

    function validateItemBinding(lines: string[]): vscode.Diagnostic[] {
      const { tags, document } = prepareValidation(lines, betSlipContext())
      return validateBindingProperties(tags, betSlipPath, betSlipMembers, document, 'BetSlip')
    }

    function validateItemHandler(lines: string[]): vscode.Diagnostic[] {
      const { tags, document } = prepareValidation(lines, betSlipContext())
      return validateEventMethods(tags, betSlipMembers, betSlipPath, document, 'BetSlip')
    }

    it('accepts a getter of an item typed by alias', () => {
      const diagnostics = validateItemBinding([
        '<div for-each="bet of bets">',
        '  <span bind-content="bet.gain"></span>',
        '</div>',
      ])
      assert.strictEqual(diagnostics.length, 0)
    })

    it('rejects a missing member of an item typed by alias', () => {
      const diagnostics = validateItemBinding([
        '<div for-each="bet of bets">',
        '  <span bind-content="bet.missing"></span>',
        '</div>',
      ])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyNotFound', { name: 'missing' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('accepts a getter of an item typed by interface', () => {
      const diagnostics = validateItemBinding([
        '<div for-each="opt of options">',
        '  <span bind-content="opt.gain"></span>',
        '</div>',
      ])
      assert.strictEqual(diagnostics.length, 0)
    })

    it('accepts an instance method of an item typed by alias', () => {
      const diagnostics = validateItemHandler([
        '<div for-each="bet of bets">',
        '  <button click="bet.confirm"></button>',
        '</div>',
      ])
      assert.strictEqual(diagnostics.length, 0)
    })

    it('rejects an arrow function field of an item typed by alias', () => {
      const diagnostics = validateItemHandler([
        '<div for-each="bet of bets">',
        '  <button click="bet.goTo"></button>',
        '</div>',
      ])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.arrowFunctionAsMethod', { name: 'bet.goTo' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a getter of an item typed by alias', () => {
      const diagnostics = validateItemHandler([
        '<div for-each="bet of bets">',
        '  <button click="bet.gain"></button>',
        '</div>',
      ])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.getterAsMethod', { name: 'bet.gain' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a plain property of an item typed by alias', () => {
      const diagnostics = validateItemHandler([
        '<div for-each="bet of bets">',
        '  <button click="bet.description"></button>',
        '</div>',
      ])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyAsMethod', { name: 'bet.description' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a missing method of an item typed by alias', () => {
      const diagnostics = validateItemHandler([
        '<div for-each="bet of bets">',
        '  <button click="bet.missing"></button>',
        '</div>',
      ])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.methodNotFound', { name: 'missing' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects a missing method of an item typed by interface', () => {
      const diagnostics = validateItemHandler([
        '<div for-each="opt of options">',
        '  <button click="opt.missing"></button>',
        '</div>',
      ])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.methodNotFound', { name: 'missing' }),
        vscode.DiagnosticSeverity.Error
      )
    })
  })

  describe('nested bindings over interface-typed members', () => {
    const holderFileName = 'InterfaceMemberVM.ts'
    let holderPath: string
    let holderMembers: ViewModelMembers

    before(() => {
      holderPath = path.join(testFilesDir, holderFileName)
      fs.writeFileSync(
        holderPath,
        `export interface IItem {
  get something(): number
}

export class Holder {
  item!: IItem
}`
      )
      holderMembers = extractViewModelMembers(holderPath, 'Holder')
    })

    after(() => {
      if (fs.existsSync(holderPath)) {
        fs.unlinkSync(holderPath)
      }
    })

    function validateNestedBinding(lines: string[]): vscode.Diagnostic[] {
      const context: ViewModelContext = {
        tsPath: holderPath,
        pelelaPath: testPelelaPath,
        members: holderMembers,
      }
      const { tags, document } = prepareValidation(lines, context)
      return validateBindingProperties(tags, holderPath, holderMembers, document, 'Holder')
    }

    it('accepts a getter of an interface-typed member', () => {
      const diagnostics = validateNestedBinding(['<span bind-content="item.something"></span>'])
      assert.strictEqual(diagnostics.length, 0)
    })

    it('rejects a missing member of an interface-typed member', () => {
      const diagnostics = validateNestedBinding(['<span bind-content="item.missing"></span>'])
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.propertyNotFound', { name: 'missing' }),
        vscode.DiagnosticSeverity.Error
      )
    })
  })
})
