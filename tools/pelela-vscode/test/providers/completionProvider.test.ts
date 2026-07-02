import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import * as vscode from 'vscode'
import {
  addPelelaAttributeCompletions,
  provideBasicViewModelCompletions,
} from '../../src/providers/completionProvider'

const VIEWMODEL_FIXTURE = `
export class TestViewModel {
  name: string = "test"
  items: Item[] = []

  get fullName() {
    return this.name
  }

  handleClick() {
    console.log("clicked")
  }

  private helperMethod() {
    return true
  }
}

interface Item {
  id: number
  title: string
  completed: boolean
}
`

function createMockDocument(lines: string[]): vscode.TextDocument {
  return {
    lineAt: (lineIndex: number) => ({ text: lines[lineIndex] }),
  } as unknown as vscode.TextDocument
}

function createMockPosition(line: number, character: number): vscode.Position {
  return { line, character } as vscode.Position
}

describe('completionProvider', () => {
  const testFilesDir = path.join(__dirname, '../fixtures')
  const testVMPath = path.join(testFilesDir, 'completionTestViewModel.ts')

  before(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }
    fs.writeFileSync(testVMPath, VIEWMODEL_FIXTURE)
  })

  after(() => {
    if (fs.existsSync(testVMPath)) {
      fs.unlinkSync(testVMPath)
    }
  })

  describe('addPelelaAttributeCompletions', () => {
    it('should return correct CompletionItem for "const-*" attributes', () => {
      const items: vscode.CompletionItem[] = []
      addPelelaAttributeCompletions(items)

      const constItem = items.find((item) => item.label === 'const-')
      assert.ok(constItem, 'const- completion item should exist')

      // Verify insertText
      assert.ok(constItem.insertText instanceof vscode.SnippetString)
      assert.strictEqual(
        (constItem.insertText as vscode.SnippetString).value,
        // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet syntax
        'const-${1:field-name}="${2:value}"'
      )

      // Verify detail
      assert.strictEqual(constItem.detail, 'Pelela: valor constante para un componente')

      // Verify sortText
      assert.ok(
        constItem.sortText?.startsWith('!0_'),
        `sortText should start with !0_, but was ${constItem.sortText}`
      )
      assert.strictEqual(constItem.sortText, '!0_const-')
    })
  })

  describe('provideBasicViewModelCompletions', () => {
    it('should include for-each variable alongside ViewModel properties', () => {
      const document = createMockDocument([
        '<div for-each="item of items">',
        '  <span bind-content="',
      ])
      const position = createMockPosition(1, 22)
      const completions = provideBasicViewModelCompletions(
        testVMPath,
        'bind-content',
        document,
        position
      )

      const labels = completions.map((item) => item.label)
      assert.ok(labels.includes('item'), 'should include for-each variable')
      assert.ok(labels.includes('name'), 'should include ViewModel property')
      assert.ok(labels.includes('fullName'), 'should include getter as property')
      assert.ok(labels.includes('items'), 'should include array property')
    })

    it('should include index variable when present in for-each', () => {
      const document = createMockDocument([
        '<div for-each="item of items" index="currentIndex">',
        '  <span bind-content="',
      ])
      const position = createMockPosition(1, 22)
      const completions = provideBasicViewModelCompletions(
        testVMPath,
        'bind-content',
        document,
        position
      )

      const labels = completions.map((item) => item.label)
      assert.ok(labels.includes('item'), 'should include for-each variable')
      assert.ok(labels.includes('currentIndex'), 'should include index variable')
    })

    it('should include only methods for event attributes', () => {
      const document = createMockDocument(['<div>', '  <button click="'])
      const position = createMockPosition(1, 17)
      const completions = provideBasicViewModelCompletions(testVMPath, 'click', document, position)

      const labels = completions.map((item) => item.label)
      assert.ok(labels.includes('handleClick'), 'should include method')
      assert.ok(labels.includes('helperMethod'), 'should include private method')
      assert.ok(!labels.includes('name'), 'should NOT include properties')
      assert.ok(!labels.includes('fullName'), 'should NOT include getters')
    })

    it('should include only properties for binding attributes', () => {
      const document = createMockDocument(['<div>', '  <span bind-content="'])
      const position = createMockPosition(1, 22)
      const completions = provideBasicViewModelCompletions(
        testVMPath,
        'bind-content',
        document,
        position
      )

      const labels = completions.map((item) => item.label)
      assert.ok(labels.includes('name'), 'should include property')
      assert.ok(labels.includes('fullName'), 'should include getter as property')
      assert.ok(!labels.includes('handleClick'), 'should NOT include methods')
    })
  })
})
