import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { after, afterEach, before, describe, it } from 'mocha'
import {
  extractInterfaceProperties,
  extractNestedProperties,
  extractViewModelMembers,
} from '../../src/parsers/viewModelParser'

const FIXTURE_CONTENT = `
import { Product } from './Product'

export class ProductRow {
  product!: Product
  currentIndex!: number
  index!: number
  name: string = "test"
  items: Item[] = []

  user = {
    name: "John",
    address: {
      street: "Main St",
      number: 123
    }
  }

  get delivery() { return this.product.deliveryDate() }
  get price() { return this.product.value }
  get isSelected() { return this.currentIndex + 1 === this.index }

  static create() { return new ProductRow() }
  handleClick({ item: Item }) { console.log(item.title) }
  private helper() { return true }
}

interface Item {
  id: number
  title: string
  completed: boolean
}
`

const EXPECTED_PROPERTIES = [
  'product',
  'currentIndex',
  'index',
  'name',
  'items',
  'user',
  'delivery',
  'price',
  'isSelected',
]
const EXPECTED_METHODS = ['handleClick', 'helper']
const EXPECTED_ITEM_INTERFACE = ['id', 'title', 'completed']
const EXPECTED_PRODUCT_INTERFACE = ['id', 'name', 'value']
const EXPECTED_USER_PROPERTIES = ['name', 'address']
const EXPECTED_ADDRESS_PROPERTIES = ['street', 'number']

describe('viewModelParser', () => {
  let testFilesDir: string
  let testVMPath: string
  let productFixturePath: string

  const PRODUCT_FIXTURE_CONTENT = `
export interface Product {
  id: number
  name: string
  value: number
}
`

  const createdFiles: string[] = []

  before(() => {
    testFilesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-test-'))
    testVMPath = path.join(testFilesDir, 'testViewModel.ts')
    productFixturePath = path.join(testFilesDir, 'Product.ts')
    fs.writeFileSync(testVMPath, FIXTURE_CONTENT)
    fs.writeFileSync(productFixturePath, PRODUCT_FIXTURE_CONTENT)
  })

  afterEach(() => {
    createdFiles.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    })
    createdFiles.length = 0
  })

  after(() => {
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true })
    }
  })

  describe('extractViewModelMembers', () => {
    it('should return all non-static properties including getters', () => {
      const { properties } = extractViewModelMembers(testVMPath, 'ProductRow')
      assert.deepStrictEqual([...properties].sort(), [...EXPECTED_PROPERTIES].sort())
    })

    it('should return all non-static methods', () => {
      const { methods } = extractViewModelMembers(testVMPath, 'ProductRow')
      assert.deepStrictEqual([...methods].sort(), [...EXPECTED_METHODS].sort())
    })

    it('should exclude constructor, static methods, and if', () => {
      const { methods } = extractViewModelMembers(testVMPath, 'ProductRow')
      assert.ok(!methods.includes('constructor'))
      assert.ok(!methods.includes('create'))
      assert.ok(!methods.includes('if'))
    })

    it('should pick the class matching the given name when multiple classes are exported', () => {
      const fPath = path.join(testFilesDir, 'MultipleExportsVM.ts')
      fs.writeFileSync(
        fPath,
        `export class OtherHelper {
  helperValue: number = 0
}

export class MainViewModel {
  items: string[] = []
  name: string = 'test'
  handleClick(): void {}
}`
      )
      createdFiles.push(fPath)
      const members = extractViewModelMembers(fPath, 'MainViewModel')
      assert.ok(members.properties.includes('items'), 'should include items from MainViewModel')
      assert.ok(members.properties.includes('name'), 'should include name from MainViewModel')
      assert.ok(
        members.methods.includes('handleClick'),
        'should include handleClick from MainViewModel'
      )
      assert.ok(
        !members.properties.includes('helperValue'),
        'should NOT include helperValue from OtherHelper'
      )
    })

    it('should find the ViewModel class across transitive imports', () => {
      const innerPath = path.join(testFilesDir, 'Inner.ts')
      fs.writeFileSync(
        innerPath,
        `export class Inner {
  attribute: string = 'value'
}`
      )
      createdFiles.push(innerPath)

      const outerPath = path.join(testFilesDir, 'Outer.ts')
      fs.writeFileSync(
        outerPath,
        `import { Inner } from './Inner'

export class Outer {
  inner = new Inner()
}`
      )
      createdFiles.push(outerPath)

      const viewModelPath = path.join(testFilesDir, 'AppViewModel.ts')
      fs.writeFileSync(
        viewModelPath,
        `import { Outer } from './Outer'

export class OtherHelper {
  helperValue: number = 0
}

export class AppViewModel {
  outer = new Outer()
}`
      )
      createdFiles.push(viewModelPath)
      const members = extractViewModelMembers(viewModelPath, 'AppViewModel')
      assert.ok(members.properties.includes('outer'), 'should include outer from AppViewModel')
      assert.ok(
        !members.properties.includes('helperValue'),
        'should NOT include helperValue from OtherHelper'
      )
    })
  })

  describe('extractNestedProperties', () => {
    it('should resolve properties from a class with constructor parameter properties', () => {
      const paramClassPath = path.join(testFilesDir, 'ParamClass.ts')
      fs.writeFileSync(
        paramClassPath,
        `export class ParamClass {
  constructor(
    public foo: number,
    public bar: string,
  ) {}
  get baz() { return this.foo }
}`
      )
      createdFiles.push(paramClassPath)
      const vmWithParamRefPath = path.join(testFilesDir, 'vmWithParamRef.ts')
      fs.writeFileSync(
        vmWithParamRefPath,
        `import { ParamClass } from './ParamClass'
export class ViewModelWithParamRef {
  param!: ParamClass
}`
      )
      createdFiles.push(vmWithParamRefPath)
      const properties = extractNestedProperties(
        vmWithParamRefPath,
        ['param'],
        'ViewModelWithParamRef'
      )
      assert.ok(properties.includes('foo'), 'should include parameter property foo')
      assert.ok(properties.includes('bar'), 'should include parameter property bar')
      assert.ok(properties.includes('baz'), 'should include getter baz')
    })
    it('should extract properties from an object literal', () => {
      const properties = extractNestedProperties(testVMPath, ['user'], 'ProductRow')
      assert.deepStrictEqual([...properties].sort(), [...EXPECTED_USER_PROPERTIES].sort())
    })

    it('should extract deeply nested properties from an object literal', () => {
      const properties = extractNestedProperties(testVMPath, ['user', 'address'], 'ProductRow')
      assert.deepStrictEqual([...properties].sort(), [...EXPECTED_ADDRESS_PROPERTIES].sort())
    })

    it('should return an empty array for non-existent properties', () => {
      const properties = extractNestedProperties(testVMPath, ['nonExistent'], 'ProductRow')
      assert.deepStrictEqual(properties, [])
    })

    it('should extract properties from an interface when the property is an array', () => {
      const properties = extractNestedProperties(testVMPath, ['items'], 'ProductRow')
      assert.ok(!properties.includes('id'), 'should NOT include element property id on array')
    })

    it('should include Array built-in properties', () => {
      const properties = extractNestedProperties(testVMPath, ['items'], 'ProductRow')
      const arrayBuiltins = Object.getOwnPropertyNames(Array.prototype)
      arrayBuiltins.forEach((prop) => {
        assert.ok(properties.includes(prop), `should include Array.${prop}`)
      })
    })

    it('should include String built-in properties for a string property', () => {
      const properties = extractNestedProperties(testVMPath, ['name'], 'ProductRow')
      const stringBuiltins = Object.getOwnPropertyNames(String.prototype)
      stringBuiltins.forEach((prop) => {
        assert.ok(properties.includes(prop), `should include String.${prop}`)
      })
    })

    it('should include Number built-in properties for a number property', () => {
      const properties = extractNestedProperties(testVMPath, ['currentIndex'], 'ProductRow')
      const numberBuiltins = Object.getOwnPropertyNames(Number.prototype)
      numberBuiltins.forEach((prop) => {
        assert.ok(properties.includes(prop), `should include Number.${prop}`)
      })
    })

    it('should include Boolean built-in properties for a boolean property', () => {
      const properties = extractNestedProperties(testVMPath, ['isSelected'], 'ProductRow')
      const booleanBuiltins = Object.getOwnPropertyNames(Boolean.prototype)
      booleanBuiltins.forEach((prop) => {
        assert.ok(properties.includes(prop), `should include Boolean.${prop}`)
      })
    })

    it('should resolve Array<Type> generic syntax like an array type', () => {
      const fPath = path.join(testFilesDir, 'ArrayGenericVM.ts')
      fs.writeFileSync(
        fPath,
        `export class ArrayGenericVM {
  items: Array<{ title: string; completed: boolean }> = []
}`
      )
      createdFiles.push(fPath)
      const properties = extractNestedProperties(fPath, ['items'], 'ArrayGenericVM')
      assert.ok(properties.includes('length'), 'should include array built-in length')
      assert.ok(!properties.includes('title'), 'should NOT include element property title on array')
    })

    it('should resolve nested property through Array<Type> syntax', () => {
      const fPath = path.join(testFilesDir, 'ArrayGenericNestedVM.ts')
      fs.writeFileSync(
        fPath,
        `export class ArrayGenericNestedVM {
  items: Array<{ name: string; child: { value: number } }> = []
}`
      )
      createdFiles.push(fPath)
      const properties = extractNestedProperties(fPath, ['items', 'child'], 'ArrayGenericNestedVM')
      assert.ok(properties.includes('value'), 'should include child property value')
    })

    it('should resolve Array<Type> with a primitive element type', () => {
      const fPath = path.join(testFilesDir, 'ArrayGenericPrimitiveVM.ts')
      fs.writeFileSync(
        fPath,
        `export class ArrayGenericPrimitiveVM {
  names: Array<string> = []
}`
      )
      createdFiles.push(fPath)
      const properties = extractNestedProperties(fPath, ['names'], 'ArrayGenericPrimitiveVM')
      assert.ok(properties.includes('length'), 'should include array built-in length')
      assert.ok(
        !properties.includes('charAt'),
        'should NOT include element string property charAt on array'
      )
    })

    it('should resolve Array built-in properties from an array literal initializer', () => {
      const fPath = path.join(testFilesDir, 'ArrayLiteralVM.ts')
      fs.writeFileSync(
        fPath,
        `export class ArrayLiteralVM {
  items = [{ name: "test" }]
}`
      )
      createdFiles.push(fPath)
      const properties = extractNestedProperties(fPath, ['items'], 'ArrayLiteralVM')
      assert.ok(properties.includes('length'), 'should include array built-in length')
    })

    it('should resolve properties from a getter with an explicit return type', () => {
      const fPath = path.join(testFilesDir, 'GetterExplicitType.ts')
      fs.writeFileSync(
        fPath,
        `export class GetterExplicitType {
  get products(): Array<{ name: string }> {
    return getProducts()
  }
}`
      )
      createdFiles.push(fPath)
      const properties = extractNestedProperties(fPath, ['products'], 'GetterExplicitType')
      assert.ok(properties.includes('length'), 'should include array built-in length')
      assert.ok(!properties.includes('name'), 'should NOT include element property name on array')
    })

    it('should resolve properties from a getter returning an array literal', () => {
      const fPath = path.join(testFilesDir, 'GetterArrayLiteral.ts')
      fs.writeFileSync(
        fPath,
        `export class GetterArrayLiteral {
  get products() {
    return [{ name: "test" }]
  }
}`
      )
      createdFiles.push(fPath)
      const properties = extractNestedProperties(fPath, ['products'], 'GetterArrayLiteral')
      assert.ok(
        properties.includes('length'),
        'should include array built-in length from ArrayLiteralExpression'
      )
    })

    it('should prefer the exported class when multiple classes exist in the file', () => {
      const fPath = path.join(testFilesDir, 'MultiClass.ts')
      fs.writeFileSync(
        fPath,
        `class Helper {
  value: number = 0
}

export class ExportedViewModel {
  items: string[] = []
  handleClick(): void {}
}`
      )
      createdFiles.push(fPath)
      const members = extractViewModelMembers(fPath, 'ExportedViewModel')
      assert.ok(members.properties.includes('items'), 'should include property from exported class')
      assert.ok(
        members.methods.includes('handleClick'),
        'should include method from exported class'
      )
      assert.ok(
        !members.properties.includes('value'),
        'should NOT include property from non-exported class'
      )
    })

    it('should resolve properties from a type alias', () => {
      const fPath = path.join(testFilesDir, 'TypeAliasVM.ts')
      fs.writeFileSync(
        fPath,
        `export type BetType = {
  description: string
  gain: number
  betValues: (number | string)[]
}

export class TypeAliasVM {
  tipos: BetType[] = []
}`
      )
      createdFiles.push(fPath)
      const properties = extractNestedProperties(fPath, ['tipos'], 'TypeAliasVM')
      assert.ok(properties.includes('length'), 'should include array built-in length')
      assert.ok(
        !properties.includes('description'),
        'should NOT include element property description on array'
      )
    })

    it('should resolve properties through a union type', () => {
      const fPath = path.join(testFilesDir, 'UnionTypeVM.ts')
      fs.writeFileSync(
        fPath,
        `type Inner = { value: string; extra: number }

export class UnionTypeVM {
  field: Inner | null = null
}`
      )
      createdFiles.push(fPath)
      const properties = extractNestedProperties(fPath, ['field'], 'UnionTypeVM')
      assert.ok(properties.includes('value'), 'should include value from the non-null union member')
      assert.ok(properties.includes('extra'), 'should include extra from the non-null union member')
    })

    it('should resolve types across files via import', () => {
      const properties = extractNestedProperties(testVMPath, ['product'], 'ProductRow')
      assert.deepStrictEqual([...properties].sort(), [...EXPECTED_PRODUCT_INTERFACE].sort())
    })

    it('should resolve properties from a NewExpression initializer without type annotation', () => {
      const fPath = path.join(testFilesDir, 'NewExpressionVM.ts')
      fs.writeFileSync(
        fPath,
        `class Tweet {
  text = ''
  likes = 0
}

export class NewExpressionVM {
  tweet = new Tweet()
}`
      )
      createdFiles.push(fPath)
      const properties = extractNestedProperties(fPath, ['tweet'], 'NewExpressionVM')
      assert.ok(properties.includes('text'), 'should include text from NewExpression target')
      createdFiles.push(fPath)
      assert.ok(properties.includes('likes'), 'should include likes from NewExpression target')
    })

    it('should include getter names from a type literal with method signatures', () => {
      const fPath = path.join(testFilesDir, 'TypeLiteralGettersVM.ts')
      fs.writeFileSync(
        fPath,
        `export type WithGetters = {
  label: string
  get count(): number
}

export class TypeLiteralGettersVM {
  field!: WithGetters
}`
      )
      createdFiles.push(fPath)
      const properties = extractNestedProperties(fPath, ['field'], 'TypeLiteralGettersVM')
      assert.ok(properties.includes('label'), 'should include label PropertySignature')
      createdFiles.push(fPath)
      assert.ok(properties.includes('count'), 'should include count MethodSignature getter')
    })

    it('should resolve properties from a getter without explicit return type', () => {
      const fPath = path.join(testFilesDir, 'GetterNoReturnTypeVM.ts')
      fs.writeFileSync(
        fPath,
        `class InnerTarget {
  value = 42
  label = 'test'
}

export class GetterNoReturnTypeVM {
  get inner() {
    return new InnerTarget()
  }
}`
      )
      createdFiles.push(fPath)
      const properties = extractNestedProperties(fPath, ['inner'], 'GetterNoReturnTypeVM')
      assert.ok(properties.includes('value'), 'should include value from InnerTarget')
      createdFiles.push(fPath)
      assert.ok(properties.includes('label'), 'should include label from InnerTarget')
    })

    it('should resolve types through transitive imports', () => {
      const deepTargetPath = path.join(testFilesDir, 'DeepTarget.ts')
      fs.writeFileSync(
        deepTargetPath,
        `export class DeepTarget {
  deepValue = 42
  label = 'hello'
}`
      )
      createdFiles.push(deepTargetPath)
      const intermediatePath = path.join(testFilesDir, 'Intermediate.ts')
      fs.writeFileSync(
        intermediatePath,
        `import { DeepTarget } from './DeepTarget'

export class Intermediate {
  target: DeepTarget | null = null
}`
      )
      createdFiles.push(intermediatePath)
      const transitiveVmPath = path.join(testFilesDir, 'TransitiveVM.ts')
      fs.writeFileSync(
        transitiveVmPath,
        `import { Intermediate } from './Intermediate'

export class TransitiveVM {
  container!: Intermediate
}`
      )
      createdFiles.push(transitiveVmPath)
      const properties = extractNestedProperties(
        transitiveVmPath,
        ['container', 'target'],
        'TransitiveVM'
      )
      assert.ok(properties.includes('deepValue'), 'should include deepValue from DeepTarget')
      assert.ok(properties.includes('label'), 'should include label from DeepTarget')
    })

    it('should resolve deep nested property through transitive import chain', () => {
      const aPath = path.join(testFilesDir, 'A.ts')
      fs.writeFileSync(
        aPath,
        `export class A {
  attribute: string = 'hello'
}`
      )
      createdFiles.push(aPath)

      const bPath = path.join(testFilesDir, 'B.ts')
      fs.writeFileSync(
        bPath,
        `import { A } from './A'

export class B {
  a = new A()
}`
      )
      createdFiles.push(bPath)

      const appPath = path.join(testFilesDir, 'AppVM.ts')
      fs.writeFileSync(
        appPath,
        `import { B } from './B'

export class Other {
  x: number = 0
}

export class AppVM {
  b = new B()
}`
      )
      createdFiles.push(appPath)

      const properties = extractNestedProperties(appPath, ['b', 'a', 'attribute'], 'AppVM')
      assert.ok(properties.includes('length'), 'should include String built-in length on attribute')
    })
  })

  describe('extractInterfaceProperties', () => {
    it('should extract properties from an existing interface', () => {
      const properties = extractInterfaceProperties(FIXTURE_CONTENT, 'Item')
      assert.deepStrictEqual([...properties].sort(), [...EXPECTED_ITEM_INTERFACE].sort())
    })

    it('should return an empty array for a non-existent interface', () => {
      const properties = extractInterfaceProperties(FIXTURE_CONTENT, 'NonExistent')
      assert.deepStrictEqual(properties, [])
    })
  })
})
