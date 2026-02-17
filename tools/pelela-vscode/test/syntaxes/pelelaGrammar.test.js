const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

describe('pelela grammar', () => {
  const grammarPath = path.join(__dirname, '../../syntaxes/pelela.tmLanguage.json')
  const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf-8'))
  const forEachPatterns = grammar.repository['pelela-attributes'].patterns[0].patterns

  it('debería matchear la sintaxis for-each con índice entre paréntesis', () => {
    const indexedRegex = new RegExp(forEachPatterns[0].match)
    const result = indexedRegex.exec('(item, index) of items')

    assert.ok(result)
    assert.strictEqual(result[1], 'item')
    assert.strictEqual(result[2], 'index')
    assert.strictEqual(result[3], 'of')
    assert.strictEqual(result[4], 'items')
  })

  it('debería matchear la sintaxis for-each clásica', () => {
    const defaultRegex = new RegExp(forEachPatterns[1].match)
    const result = defaultRegex.exec('item of items')

    assert.ok(result)
    assert.strictEqual(result[1], 'item')
    assert.strictEqual(result[2], 'of')
    assert.strictEqual(result[3], 'items')
  })
})
