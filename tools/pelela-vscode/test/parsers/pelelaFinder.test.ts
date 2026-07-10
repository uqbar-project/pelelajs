import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import * as vscode from 'vscode'
import {
  findMethodUsage,
  findPropertyUsage,
  findViewModelTag,
} from '../../src/parsers/pelelaFinder'

describe('pelelaFinder', () => {
  const testFilesDir = path.join(__dirname, '../fixtures')
  const testPelelaPath = path.join(testFilesDir, 'testApp.pelela')

  before(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }

    const pelelaContent = `<pelela view-model="TestApp">
  <div>
    <span bind-content="userName"></span>
    <span bind-content="user.email"></span>
    <input bind-value="userName" />
    <button click="handleSubmit">Save</button>
    <input enter="onEnter" />
    <p if="isVisible">Visible text</p>
    <ul>
      <li for-each="item of items" bind-content="item"></li>
      <li for-each="product of products" bind-content="productName"></li>
      <span bind-content="items"></span>
    </ul>
    <div const-style="color: red" const-myAttr="value"></div>
    <div bind-class="activeClass"></div>
    <img bind-src="imageUrl" bind-alt="imageAlt" />
    <input bind-enabled="isEditable" />
  </div>
</pelela>`

    fs.writeFileSync(testPelelaPath, pelelaContent)
  })

  after(() => {
    if (fs.existsSync(testPelelaPath)) {
      fs.unlinkSync(testPelelaPath)
    }
  })

  describe('findViewModelTag', () => {
    it('should find the view-model attribute tag', () => {
      const location = findViewModelTag(testPelelaPath, 'TestApp')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
      assert.strictEqual(location.range.start.line, 0)
    })

    it('should return null for a non-existent class', () => {
      const location = findViewModelTag(testPelelaPath, 'NonExistent')

      assert.strictEqual(location, null)
    })

    it('should not match view-model with wrong case', () => {
      const location = findViewModelTag(testPelelaPath, 'testapp')

      assert.strictEqual(location, null)
    })
  })

  describe('findPropertyUsage', () => {
    it('should find usage in bind-content', () => {
      const location = findPropertyUsage(testPelelaPath, 'userName')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should find usage in bind-content with nested path', () => {
      const location = findPropertyUsage(testPelelaPath, 'email')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should find usage in bind-value', () => {
      const location = findPropertyUsage(testPelelaPath, 'userName')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should find usage in if attribute', () => {
      const location = findPropertyUsage(testPelelaPath, 'isVisible')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should find usage as for-each collection', () => {
      const location = findPropertyUsage(testPelelaPath, 'items')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should not match a for-each loop variable as a property', () => {
      const location = findPropertyUsage(testPelelaPath, 'product')

      assert.strictEqual(location, null)
    })

    it('should find usage as for-each collection without bind-* fallback', () => {
      const location = findPropertyUsage(testPelelaPath, 'products')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should find usage in const-* attribute', () => {
      const location = findPropertyUsage(testPelelaPath, 'myAttr')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should find usage in bind-class', () => {
      const location = findPropertyUsage(testPelelaPath, 'activeClass')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should find usage in bind-src', () => {
      const location = findPropertyUsage(testPelelaPath, 'imageUrl')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should find usage in bind-alt', () => {
      const location = findPropertyUsage(testPelelaPath, 'imageAlt')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should find usage in bind-enabled', () => {
      const location = findPropertyUsage(testPelelaPath, 'isEditable')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should return null for a non-existent property', () => {
      const location = findPropertyUsage(testPelelaPath, 'nonExistentProp')

      assert.strictEqual(location, null)
    })

    it('should not match a property name that is a substring of another word', () => {
      const location = findPropertyUsage(testPelelaPath, 'name')

      assert.strictEqual(location, null)
    })

    it('should not match property with wrong case', () => {
      const location = findPropertyUsage(testPelelaPath, 'USERNAME')

      assert.strictEqual(location, null)
    })
  })

  describe('findMethodUsage', () => {
    it('should find usage in click attribute', () => {
      const location = findMethodUsage(testPelelaPath, 'handleSubmit')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should find usage in enter attribute', () => {
      const location = findMethodUsage(testPelelaPath, 'onEnter')

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, testPelelaPath)
    })

    it('should return null for a non-existent method', () => {
      const location = findMethodUsage(testPelelaPath, 'nonExistentMethod')

      assert.strictEqual(location, null)
    })

    it('should not match method with wrong case', () => {
      const location = findMethodUsage(testPelelaPath, 'HandleSubmit')

      assert.strictEqual(location, null)
    })
  })
})
