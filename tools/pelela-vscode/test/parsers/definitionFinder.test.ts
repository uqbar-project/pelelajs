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

  brokenObject: unknown = null;
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
    it('should find the definition of an exported class', () => {
      const location = findClassDefinition(testVMPath, 'UserViewModel')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
      assert.strictEqual(location?.range.start.line, 1)
    })

    it('should return null for a non-existent class', () => {
      const location = findClassDefinition(testVMPath, 'NonExistent')
      assert.strictEqual(location, null)
    })
  })

  describe('findPropertyDefinition', () => {
    it('should find the definition of a public property', () => {
      const location = findPropertyDefinition(testVMPath, 'username')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('should find the definition of a private property', () => {
      const location = findPropertyDefinition(testVMPath, 'password')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('should find the definition of a getter', () => {
      const location = findPropertyDefinition(testVMPath, 'displayName')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('should return null for a non-existent property', () => {
      const location = findPropertyDefinition(testVMPath, 'nonExistent')
      assert.strictEqual(location, null)
    })

    it('should escape special characters and safely return null', () => {
      const location = findPropertyDefinition(testVMPath, 'test.*prop')
      assert.strictEqual(location, null)
    })
  })

  describe('findNestedPropertyDefinition', () => {
    it('should find a first-level nested property', () => {
      const location = findNestedPropertyDefinition(testVMPath, ['profile', 'bio'])

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('should find a deeply nested property', () => {
      const location = findNestedPropertyDefinition(testVMPath, ['profile', 'settings', 'theme'])

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('should return the simple definition if the path has a single element', () => {
      const location = findNestedPropertyDefinition(testVMPath, ['username'])

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('should return null for a non-existent path', () => {
      const location = findNestedPropertyDefinition(testVMPath, ['profile', 'nonExistent'])
      assert.strictEqual(location, null)
    })

    it('should find properties with special characters in nested paths', () => {
      // Test the escaped rootPropertyName ($store) and targetProperty ($state) functionality
      const location = findNestedPropertyDefinition(testVMPath, ['$store', '$state'])

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)

      const quotedLocation = findNestedPropertyDefinition(testVMPath, ['$store', '"some.property"'])
      assert.ok(quotedLocation instanceof vscode.Location)
      assert.strictEqual(quotedLocation?.uri.fsPath, testVMPath)
    })

    it('should return null and avoid invalid jumps if the object start is corrupted', () => {
      // tests the "return -1" path when a stray '{' is found after the property
      const location = findNestedPropertyDefinition(testVMPath, ['brokenObject', 'prop'])
      assert.strictEqual(location, null)
    })
  })

  describe('findMethodDefinition', () => {
    it('should find the definition of a method', () => {
      const location = findMethodDefinition(testVMPath, 'handleLogin')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location?.uri.fsPath, testVMPath)
    })

    it('should return null for a non-existent method', () => {
      const location = findMethodDefinition(testVMPath, 'nonExistentMethod')
      assert.strictEqual(location, null)
    })
  })
})
