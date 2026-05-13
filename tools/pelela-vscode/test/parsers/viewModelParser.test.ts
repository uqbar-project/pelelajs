import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import {
  extractInterfaceProperties,
  extractNestedProperties,
  extractViewModelMembers,
} from '../../src/parsers/viewModelParser'

describe('viewModelParser', () => {
  const testFilesDir = path.join(__dirname, '../fixtures')
  const testVMPath = path.join(testFilesDir, 'testViewModel.ts')

  before(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }

    const testVMContent = `
export class TestViewModel {
  public name: string = "test";
  private _internal: number = 0;
  
  items: Item[] = [];
  
  user = {
    name: "John",
    address: {
      street: "Main St",
      number: 123
    }
  };
  
  get fullName() {
    return this.name;
  }
  
  handleClick() {
    console.log("clicked");
  }
  
  private helperMethod() {
    return true;
  }
}

interface Item {
  id: number;
  title: string;
  completed: boolean;
}
`
    fs.writeFileSync(testVMPath, testVMContent)
  })

  after(() => {
    if (fs.existsSync(testVMPath)) {
      fs.unlinkSync(testVMPath)
    }
  })

  describe('extractViewModelMembers', () => {
    it('should extract properties and methods from a class', () => {
      const { properties, methods } = extractViewModelMembers(testVMPath)

      assert.ok(properties.includes('name'))
      assert.ok(properties.includes('_internal'))
      assert.ok(properties.includes('items'))
      assert.ok(properties.includes('user'))
      assert.ok(properties.includes('fullName'))

      assert.ok(methods.includes('handleClick'))
      assert.ok(methods.includes('helperMethod'))
      assert.ok(!methods.includes('constructor'))
    })

    it('should not include the constructor in methods', () => {
      const { methods } = extractViewModelMembers(testVMPath)
      assert.ok(!methods.includes('constructor'))
    })

    it('should include getters as properties', () => {
      const { properties } = extractViewModelMembers(testVMPath)
      assert.ok(properties.includes('fullName'))
    })
  })

  describe('extractNestedProperties', () => {
    it('should extract nested properties from an object literal', () => {
      const props = extractNestedProperties(testVMPath, ['user'])

      assert.ok(props.includes('name'))
      assert.ok(props.includes('address'))
    })

    it('should extract deeply nested properties', () => {
      const props = extractNestedProperties(testVMPath, ['user', 'address'])

      assert.ok(props.includes('street'))
      assert.ok(props.includes('number'))
    })

    it('should return an empty array for non-existent properties', () => {
      const props = extractNestedProperties(testVMPath, ['nonExistent'])
      assert.strictEqual(props.length, 0)
    })

    it('should extract properties from an interface when the property is an array', () => {
      const props = extractNestedProperties(testVMPath, ['items'])

      assert.ok(props.includes('id'))
      assert.ok(props.includes('title'))
      assert.ok(props.includes('completed'))
    })
  })

  describe('extractInterfaceProperties', () => {
    it('should extract properties from an interface', () => {
      const testVMContent = fs.readFileSync(testVMPath, 'utf-8')
      const props = extractInterfaceProperties(testVMContent, 'Item')

      assert.ok(props.includes('id'))
      assert.ok(props.includes('title'))
      assert.ok(props.includes('completed'))
    })

    it('should return an empty array for non-existent interfaces', () => {
      const testVMContent = fs.readFileSync(testVMPath, 'utf-8')
      const props = extractInterfaceProperties(testVMContent, 'NonExistent')

      assert.strictEqual(props.length, 0)
    })
  })
})
