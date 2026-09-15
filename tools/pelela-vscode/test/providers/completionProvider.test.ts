// biome-ignore-all lint/suspicious/noTemplateCurlyInString: VSCode snippet syntax
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import * as vscode from 'vscode'
import { t } from '../../src/i18n/index'
import {
  addPelelaAttributeCompletions,
  provideBasicViewModelCompletions,
  provideCompletionItems,
} from '../../src/providers/completionProvider'

const VIEWMODEL_FIXTURE = `
export class TestViewModel {
  name: string = "test"
  items: Item[] = []
  increment = () => { this.name = "incremented" }

  get fullName() {
    return this.name
  }

  handleClick(event: Event) {
    console.log("clicked", event)
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
  const FOR_EACH_ITEM_VARIABLE = 'item'
  const FOR_EACH_INDEX_VARIABLE = 'currentIndex'

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
        'const-${1:field-name}="${2:value}"'
      )

      // Verify detail
      assert.strictEqual(constItem.detail, t('completions.constDetail'))

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
        `<div for-each="${FOR_EACH_ITEM_VARIABLE} of items">`,
        '  <span bind-content="',
      ])
      const position = createMockPosition(1, 22)
      const completions = provideBasicViewModelCompletions({
        typescriptFilePath: testVMPath,
        attributeName: 'bind-content',
        document,
        position,
        viewModelName: 'TestViewModel',
      })

      const labels = completions.map((item) => item.label)
      assert.ok(labels.includes(FOR_EACH_ITEM_VARIABLE), 'should include for-each variable')
      assert.ok(labels.includes('name'), 'should include ViewModel property')
      assert.ok(labels.includes('fullName'), 'should include getter as property')
      assert.ok(labels.includes('items'), 'should include array property')

      const fullNameItem = completions.find((item) => item.label === 'fullName')
      assert.ok(fullNameItem, 'getter completion should exist')
      assert.strictEqual(fullNameItem.detail, t('completions.getterDetail'))
      assert.strictEqual(fullNameItem.kind, vscode.CompletionItemKind.Property)

      const itemVar = completions.find((item) => item.label === FOR_EACH_ITEM_VARIABLE)
      assert.strictEqual(itemVar?.detail, t('completions.iterationPropertyDetail'))
      assert.strictEqual(itemVar?.kind, vscode.CompletionItemKind.Variable)
    })

    it('should include index variable when present in for-each', () => {
      const document = createMockDocument([
        `<div for-each="${FOR_EACH_ITEM_VARIABLE} of items" index="${FOR_EACH_INDEX_VARIABLE}">`,
        '  <span bind-content="',
      ])
      const position = createMockPosition(1, 22)
      const completions = provideBasicViewModelCompletions({
        typescriptFilePath: testVMPath,
        attributeName: 'bind-content',
        document,
        position,
        viewModelName: 'TestViewModel',
      })

      const labels = completions.map((item) => item.label)
      assert.ok(labels.includes(FOR_EACH_ITEM_VARIABLE), 'should include for-each variable')
      assert.deepStrictEqual(
        labels.filter(
          (label) => label === FOR_EACH_ITEM_VARIABLE || label === FOR_EACH_INDEX_VARIABLE
        ),
        [FOR_EACH_ITEM_VARIABLE, FOR_EACH_INDEX_VARIABLE]
      )

      const indexVar = completions.find((item) => item.label === FOR_EACH_INDEX_VARIABLE)
      assert.strictEqual(indexVar?.detail, t('completions.iterationPropertyDetail'))
      assert.strictEqual(indexVar?.kind, vscode.CompletionItemKind.Variable)
    })

    it('should include only methods for event attributes', () => {
      const document = createMockDocument(['<div>', '  <button click="'])
      const position = createMockPosition(1, 17)
      const completions = provideBasicViewModelCompletions({
        typescriptFilePath: testVMPath,
        attributeName: 'click',
        document,
        position,
        viewModelName: 'TestViewModel',
      })

      const labels = completions.map((item) => item.label)
      assert.ok(labels.includes('handleClick'), 'should include method')
      assert.ok(labels.includes('helperMethod'), 'should include private method')
      assert.ok(!labels.includes('name'), 'should NOT include properties')
      assert.ok(!labels.includes('fullName'), 'should NOT include getters')
      assert.ok(!labels.includes('increment'), 'should NOT include arrow function fields')
    })

    it('should exclude for-each variables from event attribute completions', () => {
      const document = createMockDocument([
        '<div for-each="product of products">',
        '  <button click="',
      ])
      const position = createMockPosition(1, 17)
      const completions = provideBasicViewModelCompletions({
        typescriptFilePath: testVMPath,
        attributeName: 'click',
        document,
        position,
        viewModelName: 'TestViewModel',
      })

      const labels = completions.map((item) => item.label)
      assert.ok(labels.includes('handleClick'), 'should include method')
      assert.ok(!labels.includes('product'), 'should NOT include for-each variable')
    })

    it('should include only properties for binding attributes', () => {
      const document = createMockDocument(['<div>', '  <span bind-content="'])
      const position = createMockPosition(1, 22)
      const completions = provideBasicViewModelCompletions({
        typescriptFilePath: testVMPath,
        attributeName: 'bind-content',
        document,
        position,
        viewModelName: 'TestViewModel',
      })

      const labels = completions.map((item) => item.label)
      assert.ok(labels.includes('name'), 'should include property')
      assert.ok(labels.includes('fullName'), 'should include getter as property')
      assert.ok(!labels.includes('handleClick'), 'should NOT include methods')
      assert.ok(!labels.includes('increment'), 'should NOT include arrow function fields')

      const fullNameItem = completions.find((item) => item.label === 'fullName')
      assert.ok(fullNameItem, 'getter completion should exist')
      assert.strictEqual(fullNameItem.detail, t('completions.getterDetail'))
      assert.strictEqual(fullNameItem.kind, vscode.CompletionItemKind.Property)
    })
  })

  describe('provideBasicViewModelCompletions in binding vs event contexts', () => {
    it('should never offer getters with completion items in click events', () => {
      const document = createMockDocument(['<div>', '  <button click="'])
      const position = createMockPosition(1, 17)
      const completions = provideBasicViewModelCompletions({
        typescriptFilePath: testVMPath,
        attributeName: 'click',
        document,
        position,
        viewModelName: 'TestViewModel',
      })

      const fullNameItem = completions.find((item) => item.label === 'fullName')
      assert.ok(!fullNameItem, 'should NOT include getter in click events')
    })
  })

  describe('child component property completions', () => {
    const COUNTER_VIEW_MODEL = `export class CounterViewModel {
  lastNumber = 0
  isLucky = false

  get total() {
    return this.lastNumber + 1
  }
}`

    const COUNTER_TEMPLATE = `<component view-model="CounterViewModel"></component>`

    const APP_VIEW_MODEL = `export class AppViewModel {
  count = 0
}`

    let fixtureDir: string
    let documentPath: string

    before(() => {
      fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-child-completions-'))
      fs.writeFileSync(path.join(fixtureDir, 'counter.ts'), COUNTER_VIEW_MODEL)
      fs.writeFileSync(path.join(fixtureDir, 'counter.pelela'), COUNTER_TEMPLATE)
      fs.writeFileSync(path.join(fixtureDir, 'app.ts'), APP_VIEW_MODEL)
      documentPath = path.join(fixtureDir, 'app.pelela')
    })

    after(() => {
      fs.rmSync(fixtureDir, { recursive: true, force: true })
    })

    function createDocumentWithUri(lines: string[]): vscode.TextDocument {
      return {
        lineCount: lines.length,
        lineAt: (lineIndex: number) => ({ text: lines[lineIndex] }),
        uri: vscode.Uri.file(documentPath),
      } as unknown as vscode.TextDocument
    }

    async function provideCompletions(
      lines: string[],
      position: vscode.Position
    ): Promise<vscode.CompletionItem[]> {
      return provideCompletionItems(
        createDocumentWithUri(lines),
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      )
    }

    it('adds child ViewModel properties for a resolvable component tag', () => {
      const items: vscode.CompletionItem[] = []
      addPelelaAttributeCompletions(items, 'counter', createDocumentWithUri(['<counter ']))

      const labels = items.map((item) => item.label)
      assert.ok(labels.includes('prop-last-number'), 'should offer prop-last-number')
      assert.ok(labels.includes('link-last-number'), 'should offer link-last-number')
      assert.ok(labels.includes('const-is-lucky'), 'should offer const-is-lucky')
      assert.ok(!labels.includes('prop-total'), 'should NOT offer getters')

      const childItem = items.find((item) => item.label === 'prop-last-number')
      assert.ok(childItem, 'child property completion should exist')
      assert.strictEqual(childItem.detail, t('completions.childPropertyDetail'))
      assert.strictEqual(childItem.kind, vscode.CompletionItemKind.Field)
    })

    it('does not add child properties for HTML tags', () => {
      const items: vscode.CompletionItem[] = []
      addPelelaAttributeCompletions(items, 'div', createDocumentWithUri(['<div ']))

      const labels = items.map((item) => item.label)
      assert.ok(!labels.includes('prop-last-number'), 'should NOT offer child properties')
    })

    it('offers child properties when typing a binding prefix on a component', async () => {
      const line = '  <counter prop-'
      const position = createMockPosition(1, line.length)
      const completions = await provideCompletions(['<pelela>', line], position)

      const childItem = completions.find((item) => item.label === 'prop-last-number')
      assert.ok(childItem, 'should offer prop-last-number when typing prop-')
      assert.strictEqual(childItem.detail, t('completions.childPropertyDetail'))

      const snippet = childItem.insertText as vscode.SnippetString
      assert.ok(snippet instanceof vscode.SnippetString)
      assert.strictEqual(snippet.value, 'prop-last-number="${1:value}"')

      const range = childItem.range as vscode.Range
      assert.deepStrictEqual(range.start, createMockPosition(1, '  <counter '.length))
      assert.deepStrictEqual(range.end, position)

      assert.strictEqual(
        completions.filter((item) => item.label === 'prop-last-number').length,
        1,
        'the child property should appear exactly once'
      )
      assert.ok(
        !completions.some((item) => item.label === 'prop-total'),
        'should NOT offer getters'
      )
    })

    it('does not offer parent properties as const- values', async () => {
      const line = '  <counter const-count="'
      const position = createMockPosition(1, line.length)
      const completions = await provideCompletions(
        ['<pelela view-model="AppViewModel">', line],
        position
      )

      assert.strictEqual(completions.length, 0)
    })

    it('still offers parent properties as prop- values', async () => {
      const line = '  <counter prop-count="'
      const position = createMockPosition(1, line.length)
      const completions = await provideCompletions(
        ['<pelela view-model="AppViewModel">', line],
        position
      )

      const labels = completions.map((item) => item.label)
      assert.ok(labels.includes('count'), 'should offer the parent ViewModel property')
    })
  })
})
