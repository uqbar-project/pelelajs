import * as assert from 'node:assert'
import * as fs from 'node:fs'
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

describe('viewModelParser', () => {
  const testFilesDir = path.join(__dirname, '../fixtures')
  const testVMPath = path.join(testFilesDir, 'testViewModel.ts')
  const productFixturePath = path.join(testFilesDir, 'Product.ts')

  const PRODUCT_FIXTURE_CONTENT = `
export interface Product {
  id: number
  name: string
  value: number
}
`

  before(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }
    fs.writeFileSync(testVMPath, FIXTURE_CONTENT)
    fs.writeFileSync(productFixturePath, PRODUCT_FIXTURE_CONTENT)
  })

  after(() => {
    if (fs.existsSync(testVMPath)) {
      fs.unlinkSync(testVMPath)
    }
    if (fs.existsSync(productFixturePath)) {
      fs.unlinkSync(productFixturePath)
    }
  })

  describe('extractViewModelMembers', () => {
    it('should include properties with definite assignment (!:)', () => {
      const { properties } = extractViewModelMembers(testVMPath)
      assert.ok(properties.includes('product'))
      assert.ok(properties.includes('currentIndex'))
      assert.ok(properties.includes('index'))
    })

    it('should include properties with regular type annotation', () => {
      const { properties } = extractViewModelMembers(testVMPath)
      assert.ok(properties.includes('name'))
      assert.ok(properties.includes('items'))
    })

    it('should include getters as properties', () => {
      const { properties } = extractViewModelMembers(testVMPath)
      assert.ok(properties.includes('delivery'))
      assert.ok(properties.includes('price'))
      assert.ok(properties.includes('isSelected'))
    })

    it('should include methods', () => {
      const { methods } = extractViewModelMembers(testVMPath)
      assert.ok(methods.includes('handleClick'))
      assert.ok(methods.includes('helper'))
    })

    it('should include methods with destructured parameters', () => {
      const { methods } = extractViewModelMembers(testVMPath)
      assert.ok(methods.includes('handleClick'))
    })

    it('should not include constructor or if', () => {
      const { methods } = extractViewModelMembers(testVMPath)
      assert.ok(!methods.includes('constructor'))
      assert.ok(!methods.includes('if'))
    })

    it('should not include static methods', () => {
      const { methods } = extractViewModelMembers(testVMPath)
      assert.ok(!methods.includes('create'))
    })
  })

  describe('extractNestedProperties', () => {
    it('should extract properties from an object literal', () => {
      const properties = extractNestedProperties(testVMPath, ['user'])
      assert.ok(properties.includes('name'))
      assert.ok(properties.includes('address'))
    })

    it('should extract deeply nested properties from an object literal', () => {
      const properties = extractNestedProperties(testVMPath, ['user', 'address'])
      assert.ok(properties.includes('street'))
      assert.ok(properties.includes('number'))
    })

    it('should return an empty array for non-existent properties', () => {
      const properties = extractNestedProperties(testVMPath, ['nonExistent'])
      assert.strictEqual(properties.length, 0)
    })

    it('should extract properties from an interface when the property is an array', () => {
      const properties = extractNestedProperties(testVMPath, ['items'])
      assert.ok(properties.includes('id'))
      assert.ok(properties.includes('title'))
      assert.ok(properties.includes('completed'))
    })

    it('should resolve types across files via import', () => {
      const properties = extractNestedProperties(testVMPath, ['product'])
      assert.ok(properties.includes('id'))
      assert.ok(properties.includes('name'))
      assert.ok(properties.includes('value'))
    })
  })

  describe('extractInterfaceProperties', () => {
    it('should extract properties from an existing interface', () => {
      const properties = extractInterfaceProperties(FIXTURE_CONTENT, 'Item')
      assert.ok(properties.includes('id'))
      assert.ok(properties.includes('title'))
      assert.ok(properties.includes('completed'))
    })

    it('should return an empty array for a non-existent interface', () => {
      const properties = extractInterfaceProperties(FIXTURE_CONTENT, 'NonExistent')
      assert.strictEqual(properties.length, 0)
    })
  })
})
