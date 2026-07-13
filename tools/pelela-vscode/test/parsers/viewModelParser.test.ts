import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
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

  before(() => {
    testFilesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-test-'))
    testVMPath = path.join(testFilesDir, 'testViewModel.ts')
    productFixturePath = path.join(testFilesDir, 'Product.ts')
    fs.writeFileSync(testVMPath, FIXTURE_CONTENT)
    fs.writeFileSync(productFixturePath, PRODUCT_FIXTURE_CONTENT)
  })

  after(() => {
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true })
    }
  })

  describe('extractViewModelMembers', () => {
    it('should return all non-static properties including getters', () => {
      const { properties } = extractViewModelMembers(testVMPath)
      assert.deepStrictEqual([...properties].sort(), [...EXPECTED_PROPERTIES].sort())
    })

    it('should return all non-static methods', () => {
      const { methods } = extractViewModelMembers(testVMPath)
      assert.deepStrictEqual([...methods].sort(), [...EXPECTED_METHODS].sort())
    })

    it('should exclude constructor, static methods, and if', () => {
      const { methods } = extractViewModelMembers(testVMPath)
      assert.ok(!methods.includes('constructor'))
      assert.ok(!methods.includes('create'))
      assert.ok(!methods.includes('if'))
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
      const vmWithParamRefPath = path.join(testFilesDir, 'vmWithParamRef.ts')
      fs.writeFileSync(
        vmWithParamRefPath,
        `import { ParamClass } from './ParamClass'
export class ViewModelWithParamRef {
  param!: ParamClass
}`
      )
      const properties = extractNestedProperties(vmWithParamRefPath, ['param'])
      assert.ok(properties.includes('foo'), 'should include parameter property foo')
      assert.ok(properties.includes('bar'), 'should include parameter property bar')
      assert.ok(properties.includes('baz'), 'should include getter baz')
    })
    it('should extract properties from an object literal', () => {
      const properties = extractNestedProperties(testVMPath, ['user'])
      assert.deepStrictEqual([...properties].sort(), [...EXPECTED_USER_PROPERTIES].sort())
    })

    it('should extract deeply nested properties from an object literal', () => {
      const properties = extractNestedProperties(testVMPath, ['user', 'address'])
      assert.deepStrictEqual([...properties].sort(), [...EXPECTED_ADDRESS_PROPERTIES].sort())
    })

    it('should return an empty array for non-existent properties', () => {
      const properties = extractNestedProperties(testVMPath, ['nonExistent'])
      assert.deepStrictEqual(properties, [])
    })

    it('should extract properties from an interface when the property is an array', () => {
      const properties = extractNestedProperties(testVMPath, ['items'])
      EXPECTED_ITEM_INTERFACE.forEach((prop) => {
        assert.ok(properties.includes(prop), `should include element property ${prop}`)
      })
      assert.ok(properties.includes('length'), 'should include array built-in length')
    })

    it('should include Array built-in properties', () => {
      const properties = extractNestedProperties(testVMPath, ['items'])
      const arrayBuiltins = Object.getOwnPropertyNames(Array.prototype)
      arrayBuiltins.forEach((prop) => {
        assert.ok(properties.includes(prop), `should include Array.${prop}`)
      })
    })

    it('should include String built-in properties for a string property', () => {
      const properties = extractNestedProperties(testVMPath, ['name'])
      const stringBuiltins = Object.getOwnPropertyNames(String.prototype)
      stringBuiltins.forEach((prop) => {
        assert.ok(properties.includes(prop), `should include String.${prop}`)
      })
    })

    it('should include Number built-in properties for a number property', () => {
      const properties = extractNestedProperties(testVMPath, ['currentIndex'])
      const numberBuiltins = Object.getOwnPropertyNames(Number.prototype)
      numberBuiltins.forEach((prop) => {
        assert.ok(properties.includes(prop), `should include Number.${prop}`)
      })
    })

    it('should include Boolean built-in properties for a boolean property', () => {
      const properties = extractNestedProperties(testVMPath, ['isSelected'])
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
      const properties = extractNestedProperties(fPath, ['items'])
      assert.ok(properties.includes('length'), 'should include array built-in length')
      assert.ok(properties.includes('title'), 'should include element property title')
      assert.ok(properties.includes('completed'), 'should include element property completed')
    })

    it('should resolve nested property through Array<Type> syntax', () => {
      const fPath = path.join(testFilesDir, 'ArrayGenericNestedVM.ts')
      fs.writeFileSync(
        fPath,
        `export class ArrayGenericNestedVM {
  items: Array<{ name: string; child: { value: number } }> = []
}`
      )
      const properties = extractNestedProperties(fPath, ['items', 'child'])
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
      const properties = extractNestedProperties(fPath, ['names'])
      const stringBuiltins = Object.getOwnPropertyNames(String.prototype)
      stringBuiltins.forEach((prop) => {
        assert.ok(properties.includes(prop), `should include String.${prop}`)
      })
    })

    it('should resolve Array built-in properties from an array literal initializer', () => {
      const fPath = path.join(testFilesDir, 'ArrayLiteralVM.ts')
      fs.writeFileSync(
        fPath,
        `export class ArrayLiteralVM {
  items = [{ name: "test" }]
}`
      )
      const properties = extractNestedProperties(fPath, ['items'])
      assert.ok(properties.includes('length'), 'should include array built-in length')
    })

    it('should resolve properties from a getter with an explicit return type', () => {
      const fPath = path.join(testFilesDir, 'GetterExplicitType.ts')
      fs.writeFileSync(
        fPath,
        `export class GetterExplicitType {
  get productos(): Array<{ name: string }> {
    return getProducts()
  }
}`
      )
      const properties = extractNestedProperties(fPath, ['productos'])
      assert.ok(properties.includes('length'), 'should include array built-in length')
      assert.ok(properties.includes('name'), 'should include element property name')
    })

    it('should resolve properties from a getter returning an array literal', () => {
      const fPath = path.join(testFilesDir, 'GetterArrayLiteral.ts')
      fs.writeFileSync(
        fPath,
        `export class GetterArrayLiteral {
  get productos() {
    return [{ name: "test" }]
  }
}`
      )
      const properties = extractNestedProperties(fPath, ['productos'])
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
      const members = extractViewModelMembers(fPath)
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
        `export type TipoApuesta = {
  descripcion: string
  ganancia: number
  valoresAApostar: (number | string)[]
}

export class TypeAliasVM {
  tipos: TipoApuesta[] = []
}`
      )
      const properties = extractNestedProperties(fPath, ['tipos'])
      assert.ok(properties.includes('descripcion'), 'should include descripcion from type alias')
      assert.ok(properties.includes('ganancia'), 'should include ganancia from type alias')
      assert.ok(
        properties.includes('valoresAApostar'),
        'should include valoresAApostar from type alias'
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
      const properties = extractNestedProperties(fPath, ['field'])
      assert.ok(properties.includes('value'), 'should include value from the non-null union member')
      assert.ok(properties.includes('extra'), 'should include extra from the non-null union member')
    })

    it('should resolve types across files via import', () => {
      const properties = extractNestedProperties(testVMPath, ['product'])
      assert.deepStrictEqual([...properties].sort(), [...EXPECTED_PRODUCT_INTERFACE].sort())
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
