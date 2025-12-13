const assert = require('node:assert')
const path = require('node:path')
const fs = require('node:fs')
const {
  extractViewModelMembers,
  extractNestedProperties,
  extractInterfaceProperties,
} = require('../../src/parsers/viewModelParser')

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
    it('debería extraer propiedades y métodos de una clase', () => {
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

    it('no debería incluir constructor en los métodos', () => {
      const { methods } = extractViewModelMembers(testVMPath)
      assert.ok(!methods.includes('constructor'))
    })

    it('debería incluir getters como propiedades', () => {
      const { properties } = extractViewModelMembers(testVMPath)
      assert.ok(properties.includes('fullName'))
    })
  })

  describe('extractNestedProperties', () => {
    it('debería extraer propiedades anidadas de un objeto literal', () => {
      const props = extractNestedProperties(testVMPath, ['user'])

      assert.ok(props.includes('name'))
      assert.ok(props.includes('address'))
    })

    it('debería extraer propiedades profundamente anidadas', () => {
      const props = extractNestedProperties(testVMPath, ['user', 'address'])

      assert.ok(props.includes('street'))
      assert.ok(props.includes('number'))
    })

    it('debería retornar array vacío para propiedades inexistentes', () => {
      const props = extractNestedProperties(testVMPath, ['nonExistent'])
      assert.strictEqual(props.length, 0)
    })

    it('debería extraer propiedades de una interfaz cuando la propiedad es un array', () => {
      const props = extractNestedProperties(testVMPath, ['items'])

      assert.ok(props.includes('id'))
      assert.ok(props.includes('title'))
      assert.ok(props.includes('completed'))
    })
  })

  describe('extractInterfaceProperties', () => {
    it('debería extraer propiedades de una interfaz', () => {
      const testVMContent = fs.readFileSync(testVMPath, 'utf-8')
      const props = extractInterfaceProperties(testVMContent, 'Item')

      assert.ok(props.includes('id'))
      assert.ok(props.includes('title'))
      assert.ok(props.includes('completed'))
    })

    it('debería retornar array vacío para interfaces inexistentes', () => {
      const testVMContent = fs.readFileSync(testVMPath, 'utf-8')
      const props = extractInterfaceProperties(testVMContent, 'NonExistent')

      assert.strictEqual(props.length, 0)
    })
  })
})
