import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import * as vscode from 'vscode'
import {
  findClassDefinition,
  findMethodDefinition,
  findNestedPropertyDefinition,
  findPropertyDefinition,
} from '../../src/parsers/definitionFinder'

describe('definitionFinder', () => {
  const testFilesDir = path.join(__dirname, '../fixtures')
  const testVMPath = path.join(testFilesDir, 'definitionTestVM.ts')

  before(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }

    const testVMContent = `
export class UserViewModel {
  public username: string = "john";
  private password: string = "secret";
  
  profile = {
    bio: "Developer",
    settings: {
      theme: "dark"
    }
  };
  
  get displayName() {
    return this.username;
  }
  
  public $store = {
    $state: "active",
    "some.property": "value"
  };

  brokenObject: any = null;
  // some logic
  if (true) {
    console.log("test");
  }
  
  handleLogin() {
    console.log("logging in");
  }
  
  public test_prop: number = 1;
}
`
    fs.writeFileSync(testVMPath, testVMContent)
  })

  after(() => {
    if (fs.existsSync(testVMPath)) {
      fs.unlinkSync(testVMPath)
    }
  })

  describe('findClassDefinition', () => {
    it('debería encontrar la definición de una clase exportada', () => {
      const location = findClassDefinition(testVMPath, 'UserViewModel')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
      assert.strictEqual(location?.range.start.line, 1)
    })

    it('debería retornar null para una clase inexistente', () => {
      const location = findClassDefinition(testVMPath, 'NonExistent')
      assert.strictEqual(location, null)
    })
  })

  describe('findPropertyDefinition', () => {
    it('debería encontrar la definición de una propiedad pública', () => {
      const location = findPropertyDefinition(testVMPath, 'username')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('debería encontrar la definición de una propiedad privada', () => {
      const location = findPropertyDefinition(testVMPath, 'password')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('debería encontrar la definición de un getter', () => {
      const location = findPropertyDefinition(testVMPath, 'displayName')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('debería retornar null para una propiedad inexistente', () => {
      const location = findPropertyDefinition(testVMPath, 'nonExistent')
      assert.strictEqual(location, null)
    })

    it('debería escapar caracteres especiales y retornar null de forma segura', () => {
      const location = findPropertyDefinition(testVMPath, 'test.*prop')
      assert.strictEqual(location, null)
    })
  })

  describe('findNestedPropertyDefinition', () => {
    it('debería encontrar una propiedad anidada de primer nivel', () => {
      const location = findNestedPropertyDefinition(testVMPath, ['profile', 'bio'])

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('debería encontrar una propiedad profundamente anidada', () => {
      const location = findNestedPropertyDefinition(testVMPath, ['profile', 'settings', 'theme'])

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('debería retornar la definición simple si el path tiene un solo elemento', () => {
      const location = findNestedPropertyDefinition(testVMPath, ['username'])

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('debería retornar null para un path inexistente', () => {
      const location = findNestedPropertyDefinition(testVMPath, ['profile', 'nonExistent'])
      assert.strictEqual(location, null)
    })

    it('debería encontrar propiedades con caracteres especiales en rutas anidadas', () => {
      // Test the escaped rootPropertyName ($store) and targetProperty ($state) functionality
      const location = findNestedPropertyDefinition(testVMPath, ['$store', '$state'])

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)

      const quotedLocation = findNestedPropertyDefinition(testVMPath, ['$store', '"some.property"'])
      assert.ok(quotedLocation instanceof vscode.Location)
      assert.strictEqual(quotedLocation?.uri.fsPath, testVMPath)
    })

    it('debería retornar null y evitar saltos inválidos si el inicio del objeto está corrupto', () => {
      // testea el "return -1" cuando un '{' desasociado se encuentra luego de la propiedad
      const location = findNestedPropertyDefinition(testVMPath, ['brokenObject', 'prop'])
      assert.strictEqual(location, null)
    })
  })

  describe('findMethodDefinition', () => {
    it('debería encontrar la definición de un método', () => {
      const location = findMethodDefinition(testVMPath, 'handleLogin')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('debería retornar null para un método inexistente', () => {
      const location = findMethodDefinition(testVMPath, 'nonExistentMethod')
      assert.strictEqual(location, null)
    })
  })
})
