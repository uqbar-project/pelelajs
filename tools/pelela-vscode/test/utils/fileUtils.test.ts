import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import type * as vscode from 'vscode'
import {
  findPelelaFile,
  findViewModelFile,
  readFileContent,
  readFileLines,
} from '../../src/utils/fileUtils'

describe('fileUtils', () => {
  const testFilesDir = path.join(__dirname, '../fixtures')
  const testPelelaPath = path.join(testFilesDir, 'test.pelela')
  const testTsPath = path.join(testFilesDir, 'test.ts')

  before(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }
    fs.writeFileSync(testPelelaPath, '<div>Test</div>')
    fs.writeFileSync(testTsPath, 'export class Test {}')
  })

  after(() => {
    if (fs.existsSync(testPelelaPath)) {
      fs.unlinkSync(testPelelaPath)
    }
    if (fs.existsSync(testTsPath)) {
      fs.unlinkSync(testTsPath)
    }
  })

  describe('findViewModelFile', () => {
    it('should find the corresponding ViewModel file', () => {
      const mockUri = { fsPath: testPelelaPath } as vscode.Uri
      const result = findViewModelFile(mockUri)

      assert.strictEqual(result, testTsPath)
    })

    it('should return null if the ViewModel file does not exist', () => {
      const nonExistentPath = path.join(testFilesDir, 'nonexistent.pelela')
      const mockUri = { fsPath: nonExistentPath } as vscode.Uri
      const result = findViewModelFile(mockUri)

      assert.strictEqual(result, null)
    })
  })

  describe('findPelelaFile', () => {
    it('should find the corresponding .pelela file', () => {
      const result = findPelelaFile(testTsPath)

      assert.strictEqual(result, testPelelaPath)
    })

    it('should return null if the .pelela file does not exist', () => {
      const nonExistentPath = path.join(testFilesDir, 'nonexistent.ts')
      const result = findPelelaFile(nonExistentPath)

      assert.strictEqual(result, null)
    })
  })

  describe('readFileLines', () => {
    it('should read a file and return an array of lines', () => {
      const testContent = 'line1\nline2\nline3'
      const testFile = path.join(testFilesDir, 'readtest.txt')
      fs.writeFileSync(testFile, testContent)

      const lines = readFileLines(testFile)

      assert.ok(Array.isArray(lines))
      assert.strictEqual(lines.length, 3)
      assert.strictEqual(lines[0], 'line1')
      assert.strictEqual(lines[1], 'line2')
      assert.strictEqual(lines[2], 'line3')

      fs.unlinkSync(testFile)
    })

    it('should handle empty files', () => {
      const testFile = path.join(testFilesDir, 'empty.txt')
      fs.writeFileSync(testFile, '')

      const lines = readFileLines(testFile)

      assert.ok(Array.isArray(lines))
      assert.strictEqual(lines.length, 1)
      assert.strictEqual(lines[0], '')

      fs.unlinkSync(testFile)
    })
  })

  describe('readFileContent', () => {
    it('should read the complete file content', () => {
      const testContent = 'Hello World\nSecond line'
      const testFile = path.join(testFilesDir, 'content.txt')
      fs.writeFileSync(testFile, testContent)

      const content = readFileContent(testFile)

      assert.strictEqual(content, testContent)

      fs.unlinkSync(testFile)
    })

    it('should handle empty files', () => {
      const testFile = path.join(testFilesDir, 'empty2.txt')
      fs.writeFileSync(testFile, '')

      const content = readFileContent(testFile)

      assert.strictEqual(content, '')

      fs.unlinkSync(testFile)
    })
  })
})
