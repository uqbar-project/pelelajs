import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import { scanDocument } from '../../src/diagnostics/scanDocument'
import { createMockDocument } from './testHelpers'

// Multi-line tags use an array of strings (one element per line) instead of
// backtick template literals because createMockDocument maps lineAt(i) to
// each array element. A single multi-line string would set lineCount=1,
// breaking mock consumers that iterate by line (e.g. findForEachInElement).

describe('scanDocument', () => {
  it('finds a single-line tag', () => {
    const document = createMockDocument(['<div class="foo">'])
    const tags = scanDocument(document)
    assert.strictEqual(tags.length, 1)
    assert.strictEqual(tags[0].tagName, 'div')
    assert.strictEqual(tags[0].lineIndex, 0)
    assert.strictEqual(tags[0].attributes.length, 1)
    assert.strictEqual(tags[0].attributes[0].name, 'class')
    assert.strictEqual(tags[0].attributes[0].value, 'foo')
  })

  it('finds a multi-line tag with attributes on separate lines', () => {
    const document = createMockDocument(['<div', '  class="foo"', '  id="bar">'])
    const tags = scanDocument(document)
    assert.strictEqual(tags.length, 1)
    assert.strictEqual(tags[0].tagName, 'div')
    assert.strictEqual(tags[0].lineIndex, 0)
    assert.strictEqual(tags[0].attributes.length, 2)

    const [classAttr, idAttr] = tags[0].attributes
    assert.strictEqual(classAttr.name, 'class')
    assert.strictEqual(classAttr.value, 'foo')
    assert.strictEqual(classAttr.nameRange.start.line, 1)
    assert.strictEqual(classAttr.nameRange.start.character, 2)

    assert.strictEqual(idAttr.name, 'id')
    assert.strictEqual(idAttr.value, 'bar')
    assert.strictEqual(idAttr.nameRange.start.line, 2)
    assert.strictEqual(idAttr.nameRange.start.character, 2)
  })

  it('finds a multi-line self-closing tag', () => {
    const document = createMockDocument(['<input', '  type="text"', '  value="hello"/>'])
    const tags = scanDocument(document)
    assert.strictEqual(tags.length, 1)
    assert.strictEqual(tags[0].tagName, 'input')
    assert.strictEqual(tags[0].attributes.length, 2)
  })

  it('finds a multi-line tag with no attributes', () => {
    const document = createMockDocument(['<div', '>'])
    const tags = scanDocument(document)
    assert.strictEqual(tags.length, 1)
    assert.strictEqual(tags[0].tagName, 'div')
    assert.strictEqual(tags[0].attributes.length, 0)
  })

  it('finds multiple tags across multi-line content', () => {
    const document = createMockDocument([
      '<div',
      '  class="container">',
      '  <span',
      '    id="inner">content</span>',
      '</div>',
    ])
    const tags = scanDocument(document)
    assert.strictEqual(tags.length, 2)

    const [divTag, spanTag] = tags
    assert.strictEqual(divTag.tagName, 'div')
    assert.strictEqual(divTag.lineIndex, 0)
    assert.strictEqual(divTag.attributes.length, 1)
    assert.strictEqual(divTag.attributes[0].name, 'class')
    assert.strictEqual(divTag.attributes[0].nameRange.start.line, 1)

    assert.strictEqual(spanTag.tagName, 'span')
    assert.strictEqual(spanTag.lineIndex, 2)
    assert.strictEqual(spanTag.attributes.length, 1)
    assert.strictEqual(spanTag.attributes[0].name, 'id')
    assert.strictEqual(spanTag.attributes[0].nameRange.start.line, 3)
  })
})
