const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const vscode = require('vscode')
const { createCompletionProvider } = require('../../src/providers/completionProvider')

describe('completionProvider', () => {
  const testFilesDir = path.join(__dirname, '../fixtures')
  const pelelaPath = path.join(testFilesDir, 'completionSample.pelela')
  const viewModelPath = path.join(testFilesDir, 'completionSample.ts')

  before(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }

    fs.writeFileSync(
      viewModelPath,
      `export class CompletionSample {
  items: Item[] = [];
  title: string = "";
}

interface Item {
  text: string;
  visible: boolean;
}
`
    )

    fs.writeFileSync(pelelaPath, '<pelela view-model="CompletionSample"></pelela>\n')
  })

  after(() => {
    if (fs.existsSync(pelelaPath)) fs.unlinkSync(pelelaPath)
    if (fs.existsSync(viewModelPath)) fs.unlinkSync(viewModelPath)
  })

  function createFakeDocument(lines) {
    return {
      uri: vscode.Uri.file(pelelaPath),
      lineAt(index) {
        return { text: lines[index] }
      },
    }
  }

  async function getCompletionLabels(document, line, character) {
    const items = await getCompletionItems(document, line, character)
    return items.map((item) => item.label)
  }

  async function getCompletionItems(document, line, character) {
    createCompletionProvider()
    const provider = vscode.languages._lastCompletionProvider
    return await provider.provideCompletionItems(
      document,
      new vscode.Position(line, character),
      undefined,
      undefined
    )
  }

  it('debería sugerir aliases locales de for-each en bind-value vacío', async () => {
    const lines = ['<div for-each="(item, index) of items">', '  <span bind-value="', '</div>']
    const document = createFakeDocument(lines)
    const labels = await getCompletionLabels(document, 1, lines[1].length)

    assert.ok(labels.includes('item'))
    assert.ok(labels.includes('index'))
    assert.ok(labels.includes('items'))
  })

  it('no debería sugerir propiedades del view model al comenzar un atributo for-each', async () => {
    const lines = ['<div for-each="']
    const document = createFakeDocument(lines)
    const labels = await getCompletionLabels(document, 0, lines[0].length)

    assert.strictEqual(labels.length, 0)
    assert.ok(!labels.includes('index'))
    assert.ok(!labels.includes('item'))
  })

  it('debería sugerir propiedades del view model al completar la colección luego de "of"', async () => {
    const lines = ['<div for-each="(item, index) of ']
    const document = createFakeDocument(lines)
    const labels = await getCompletionLabels(document, 0, lines[0].length)

    assert.ok(labels.includes('items'))
    assert.ok(labels.includes('title'))
    assert.ok(!labels.includes('index'))
    assert.ok(!labels.includes('item'))
  })

  it('debería deduplicar sugerencias cuando un alias local coincide con una propiedad del view model', async () => {
    const lines = ['<div for-each="(items, index) of items">', '  <span bind-value="', '</div>']
    const document = createFakeDocument(lines)
    const labels = await getCompletionLabels(document, 1, lines[1].length)
    const itemsOccurrences = labels.filter((label) => label === 'items').length

    assert.strictEqual(itemsOccurrences, 1)
  })

  it('debería etiquetar correctamente alias local y propiedad del view model en detalles', async () => {
    const lines = ['<div for-each="(item, index) of items">', '  <span bind-value="', '</div>']
    const document = createFakeDocument(lines)
    const completions = await getCompletionItems(document, 1, lines[1].length)
    const localItem = completions.find((item) => item.label === 'item')
    const vmItems = completions.find((item) => item.label === 'items')

    assert.ok(localItem)
    assert.ok(vmItems)
    assert.strictEqual(localItem.detail, 'Pelela for-each local variable')
    assert.strictEqual(vmItems.detail, 'Pelela ViewModel property')
  })
})
