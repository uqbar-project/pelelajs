import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import { getHtmlAttributes, getHtmlElements, getPelelaAttributes } from '../../src/utils/htmlUtils'

describe('htmlUtils', () => {
  describe('getHtmlElements', () => {
    it('should return an array of HTML elements', () => {
      const elements = getHtmlElements()

      assert.ok(Array.isArray(elements))
      assert.ok(elements.length > 0)
    })

    it('should include common elements', () => {
      const elements = getHtmlElements()

      assert.ok(elements.includes('div'))
      assert.ok(elements.includes('span'))
      assert.ok(elements.includes('button'))
      assert.ok(elements.includes('input'))
      assert.ok(elements.includes('section'))
    })

    it('should not include duplicate elements', () => {
      const elements = getHtmlElements()
      const uniqueElements = [...new Set(elements)]

      assert.strictEqual(elements.length, uniqueElements.length)
    })
  })

  describe('getHtmlAttributes', () => {
    it('should return an array of HTML attributes', () => {
      const attributes = getHtmlAttributes()

      assert.ok(Array.isArray(attributes))
      assert.ok(attributes.length > 0)
    })

    it('should include common attributes', () => {
      const attributes = getHtmlAttributes()

      assert.ok(attributes.includes('id'))
      assert.ok(attributes.includes('class'))
      assert.ok(attributes.includes('style'))
      assert.ok(attributes.includes('src'))
      assert.ok(attributes.includes('href'))
    })

    it('should include attributes with hyphens', () => {
      const attributes = getHtmlAttributes()

      assert.ok(attributes.includes('data-'))
      assert.ok(attributes.includes('aria-'))
    })
  })

  describe('getPelelaAttributes', () => {
    it('should return an array of Pelela attributes', () => {
      const attributes = getPelelaAttributes()

      assert.ok(Array.isArray(attributes))
      assert.ok(attributes.length > 0)
    })

    it('should include all Pelela attributes', () => {
      const attributes = getPelelaAttributes()

      assert.ok(attributes.includes('view-model'))
      assert.ok(attributes.includes('bind-value'))
      assert.ok(attributes.includes('if'))
      assert.ok(attributes.includes('bind-class'))
      assert.ok(attributes.includes('bind-style'))
      assert.ok(attributes.includes('click'))
      assert.ok(attributes.includes('for-each'))
    })

    it('should return exactly 8 attributes', () => {
      const attributes = getPelelaAttributes()
      assert.strictEqual(attributes.length, 8)
    })
  })
})
