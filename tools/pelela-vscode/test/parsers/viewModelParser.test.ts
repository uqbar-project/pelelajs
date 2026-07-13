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
