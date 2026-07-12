import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import { interpolate } from '../../src/i18n/index'

describe('interpolate', () => {
  it('replaces a single placeholder', () => {
    assert.strictEqual(interpolate('Hello {{name}}', { name: 'World' }), 'Hello World')
  })

  it('replaces multiple different placeholders', () => {
    assert.strictEqual(interpolate('{{a}} and {{b}}', { a: 'foo', b: 'bar' }), 'foo and bar')
  })

  it('replaces the same placeholder multiple times', () => {
    assert.strictEqual(interpolate('{{a}} and {{a}}', { a: 'x' }), 'x and x')
  })

  it('returns the template unchanged when no params match', () => {
    assert.strictEqual(interpolate('Hello {{name}}', { other: 'value' }), 'Hello {{name}}')
  })

  it('handles empty params', () => {
    assert.strictEqual(interpolate('no placeholders', {}), 'no placeholders')
  })
})
