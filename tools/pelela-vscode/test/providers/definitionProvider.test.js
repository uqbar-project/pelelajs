const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const vscode = require('vscode')
const { createDefinitionProvider } = require('../../src/providers/definitionProvider')

describe('definitionProvider', () => {
  const testFilesDir = path.join(__dirname, '../fixtures')
  const pelelaPath = path.join(testFilesDir, 'definitionSample.pelela')
  const viewModelPath = path.join(testFilesDir, 'definitionSample.ts')

  before(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }

    fs.writeFileSync(
      viewModelPath,
      `export class DefinitionSample {
  items: Item[] = [];
  index: number = 123;
}

interface Item {
  text: string;
}
`
    )

    fs.writeFileSync(pelelaPath, '<pelela view-model="DefinitionSample"></pelela>\n')
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

  async function getDefinition(document, line, character) {
    createDefinitionProvider()
    const provider = vscode.languages._lastDefinitionProvider
    return await provider.provideDefinition(document, new vscode.Position(line, character), undefined)
  }

  it('debería resolver colección en for-each con espacios alrededor de "="', async () => {
    const lines = ['<div for-each = "(item, index) of items"></div>']
    const document = createFakeDocument(lines)
    const cursorPos = lines[0].indexOf('items') + 1
    const location = await getDefinition(document, 0, cursorPos)

    assert.ok(location)
    assert.strictEqual(location.uri.fsPath, viewModelPath)
  })

  it('debería resolver alias index en bind-value con comillas simples y espacios alrededor de "="', async () => {
    const lines = [
      "<div for-each = '(item, index) of items'>",
      "  <span bind-value = 'index'></span>",
      '</div>',
    ]
    const document = createFakeDocument(lines)
    const cursorPos = lines[1].indexOf('index') + 1
    const location = await getDefinition(document, 1, cursorPos)

    assert.ok(location)
    assert.strictEqual(location.uri.fsPath, pelelaPath)
    assert.strictEqual(location.range.start.line, 0)
  })

  it('fuera del scope del loop debería resolver index como propiedad del view-model', async () => {
    const lines = [
      '<div for-each="(item, index) of items">',
      '  <span bind-value="item.text"></span>',
      '</div>',
      '<span bind-value="index"></span>',
    ]
    const document = createFakeDocument(lines)
    const cursorPos = lines[3].indexOf('index') + 1
    const location = await getDefinition(document, 3, cursorPos)

    assert.ok(location)
    assert.strictEqual(location.uri.fsPath, viewModelPath)
  })
})
