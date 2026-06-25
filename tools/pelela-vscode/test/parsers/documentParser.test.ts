import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import {
  getAttributeValueMatch,
  getCurrentAttributeName,
  getCurrentTagName,
  isInsideTag,
  isStartingTag,
  parseForEachExpression,
  parsePropertyPath,
} from '../../src/parsers/documentParser'

describe('documentParser', () => {
  describe('getCurrentAttributeName', () => {
    it('should extract the attribute name before the cursor in a quoted attribute', () => {
      const result = getCurrentAttributeName('<div bind-value="test', 21)
      assert.strictEqual(result, 'bind-value')
    })

    it('should return null if there is no attribute before the cursor', () => {
      const result = getCurrentAttributeName('<div ', 5)
      assert.strictEqual(result, null)
    })

    it('should extract attributes with hyphens', () => {
      const result = getCurrentAttributeName('<div bind-class="active', 23)
      assert.strictEqual(result, 'bind-class')
    })

    it('should handle spaces around the equals sign', () => {
      const result = getCurrentAttributeName('<div click = "handler', 21)
      assert.strictEqual(result, 'click')
    })
  })

  describe('isInsideTag', () => {
    it('should return true if inside a tag', () => {
      const result = isInsideTag('<div ')
      assert.strictEqual(result, true)
    })

    it('should return true if inside a tag with attributes', () => {
      const result = isInsideTag('<div class="test" ')
      assert.strictEqual(result, true)
    })

    it('should return false if not inside a tag', () => {
      const result = isInsideTag('some text')
      assert.strictEqual(result, false)
    })

    it('should return false if the tag is closed', () => {
      const result = isInsideTag('<div>some text')
      assert.strictEqual(result, false)
    })
  })

  describe('isStartingTag', () => {
    it('should return true when starting a tag', () => {
      const result = isStartingTag('<d')
      assert.strictEqual(result, true)
    })

    it('should return true with a complete unclosed tag', () => {
      const result = isStartingTag('<div')
      assert.strictEqual(result, true)
    })

    it('should return false if there is a space after the tag name', () => {
      const result = isStartingTag('<div ')
      assert.strictEqual(result, false)
    })

    it('should return false for plain text', () => {
      const result = isStartingTag('texto normal')
      assert.strictEqual(result, false)
    })
  })

  describe('getAttributeValueMatch', () => {
    it('should extract the attribute value before the cursor', () => {
      const result = getAttributeValueMatch('bind-value="test.prop')
      assert.strictEqual(result, 'test.prop')
    })

    it('should return null if there is no attribute value', () => {
      const result = getAttributeValueMatch('<div bind-value')
      assert.strictEqual(result, null)
    })

    it('should handle empty values', () => {
      const result = getAttributeValueMatch('bind-value="')
      assert.strictEqual(result, '')
    })

    it('should handle spaces around the equals sign', () => {
      const result = getAttributeValueMatch('bind-value = "test')
      assert.strictEqual(result, 'test')
    })
  })

  describe('getCurrentTagName', () => {
    it('should extract the tag name from an opening tag', () => {
      const result = getCurrentTagName('<div ')
      assert.strictEqual(result, 'div')
    })

    it('should extract the tag name with attributes present', () => {
      const result = getCurrentTagName('<img src="test" ')
      assert.strictEqual(result, 'img')
    })

    it('should extract the tag name from a Pelela root tag', () => {
      const result = getCurrentTagName('<pelela ')
      assert.strictEqual(result, 'pelela')
    })

    it('should extract the tag name from a component tag', () => {
      const result = getCurrentTagName('<component ')
      assert.strictEqual(result, 'component')
    })

    it('should return null for plain text', () => {
      const result = getCurrentTagName('some text')
      assert.strictEqual(result, null)
    })

    it('should handle whitespace after <', () => {
      const result = getCurrentTagName('< input ')
      assert.strictEqual(result, 'input')
    })

    it('should return the last tag when multiple tags are present', () => {
      const result = getCurrentTagName('<div><img ')
      assert.strictEqual(result, 'img')
    })
  })

  describe('parseForEachExpression', () => {
    it('should parse a valid for-each expression', () => {
      const result = parseForEachExpression('for-each="item of items"')
      assert.deepStrictEqual(result, {
        itemName: 'item',
        collectionName: 'items',
      })
    })

    it('should parse with single quotes', () => {
      const result = parseForEachExpression("for-each='product of products'")
      assert.deepStrictEqual(result, {
        itemName: 'product',
        collectionName: 'products',
      })
    })

    it('should return null if the expression is invalid', () => {
      const result = parseForEachExpression('for-each="invalid"')
      assert.strictEqual(result, null)
    })

    it('should handle extra spaces', () => {
      const result = parseForEachExpression('for-each="item of items"')
      assert.deepStrictEqual(result, {
        itemName: 'item',
        collectionName: 'items',
      })
    })
  })

  describe('parsePropertyPath', () => {
    it('should parse a simple path with a trailing dot', () => {
      const result = parsePropertyPath('user.')
      assert.deepStrictEqual(result, ['user'])
    })

    it('should parse a nested path', () => {
      const result = parsePropertyPath('user.address.')
      assert.deepStrictEqual(result, ['user', 'address'])
    })

    it('should parse a deeply nested path', () => {
      const result = parsePropertyPath('user.address.street.')
      assert.deepStrictEqual(result, ['user', 'address', 'street'])
    })

    it('should return null if it does not end with a dot', () => {
      const result = parsePropertyPath('user')
      assert.strictEqual(result, null)
    })

    it('should return null for an empty string', () => {
      const result = parsePropertyPath('')
      assert.strictEqual(result, null)
    })
  })
})
