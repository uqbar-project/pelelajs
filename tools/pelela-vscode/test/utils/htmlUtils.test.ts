import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import {
  getHtmlAttributes,
  getHtmlElements,
  getPelelaAttributes,
  getPelelaAttributesForTag,
} from '../../src/utils/htmlUtils'

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

    it('should include textarea-specific attributes', () => {
      const attributes = getHtmlAttributes()

      assert.ok(attributes.includes('rows'))
      assert.ok(attributes.includes('cols'))
    })

    it('should include table attributes', () => {
      const attributes = getHtmlAttributes()

      assert.ok(attributes.includes('colspan'))
      assert.ok(attributes.includes('rowspan'))
      assert.ok(attributes.includes('headers'))
      assert.ok(attributes.includes('scope'))
    })

    it('should include form attributes', () => {
      const attributes = getHtmlAttributes()

      assert.ok(attributes.includes('method'))
      assert.ok(attributes.includes('action'))
      assert.ok(attributes.includes('enctype'))
      assert.ok(attributes.includes('novalidate'))
    })

    it('should include media attributes', () => {
      const attributes = getHtmlAttributes()

      assert.ok(attributes.includes('controls'))
      assert.ok(attributes.includes('autoplay'))
      assert.ok(attributes.includes('loop'))
      assert.ok(attributes.includes('muted'))
      assert.ok(attributes.includes('poster'))
    })

    it('should include global attributes', () => {
      const attributes = getHtmlAttributes()

      assert.ok(attributes.includes('autofocus'))
      assert.ok(attributes.includes('contenteditable'))
      assert.ok(attributes.includes('draggable'))
      assert.ok(attributes.includes('inert'))
      assert.ok(attributes.includes('popover'))
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
      assert.ok(attributes.includes('bind-alt'))
      assert.ok(attributes.includes('bind-class'))
      assert.ok(attributes.includes('bind-content'))
      assert.ok(attributes.includes('bind-enabled'))
      assert.ok(attributes.includes('bind-src'))
      assert.ok(attributes.includes('bind-style'))
      assert.ok(attributes.includes('bind-value'))
      assert.ok(attributes.includes('const-'))
      assert.ok(attributes.includes('click'))
      assert.ok(attributes.includes('enter'))
      assert.ok(attributes.includes('for-each'))
      assert.ok(attributes.includes('if'))
    })

    it('should return exactly 16 attributes', () => {
      const attributes = getPelelaAttributes()
      assert.strictEqual(attributes.length, 16)
    })
  })

  describe('getPelelaAttributesForTag', () => {
    it('should return all attributes for a tag without restrictions', () => {
      const attributes = getPelelaAttributesForTag('div')

      assert.ok(attributes.includes('bind-class'))
      assert.ok(attributes.includes('bind-content'))
      assert.ok(attributes.includes('click'))
      assert.ok(attributes.includes('if'))
    })

    it('should include bind-alt for img tags', () => {
      const attributes = getPelelaAttributesForTag('img')

      assert.ok(attributes.includes('bind-alt'))
      assert.ok(attributes.includes('bind-src'))
    })

    it('should exclude bind-alt for non-img tags', () => {
      const attributes = getPelelaAttributesForTag('input')

      assert.ok(!attributes.includes('bind-alt'))
      assert.ok(!attributes.includes('bind-src'))
    })

    it('should include bind-enabled for form control tags', () => {
      const attributes = getPelelaAttributesForTag('input')

      assert.ok(attributes.includes('bind-enabled'))
    })

    it('should exclude bind-enabled for non-form tags', () => {
      const attributes = getPelelaAttributesForTag('div')

      assert.ok(!attributes.includes('bind-enabled'))
    })

    it('should include enter only for input tags', () => {
      const inputAttrs = getPelelaAttributesForTag('input')
      const divAttrs = getPelelaAttributesForTag('div')

      assert.ok(inputAttrs.includes('enter'))
      assert.ok(!divAttrs.includes('enter'))
    })

    it('should include view-model only for pelela and component tags', () => {
      const pelelaAttrs = getPelelaAttributesForTag('pelela')
      const componentAttrs = getPelelaAttributesForTag('component')
      const divAttrs = getPelelaAttributesForTag('div')

      assert.ok(pelelaAttrs.includes('view-model'))
      assert.ok(componentAttrs.includes('view-model'))
      assert.ok(!divAttrs.includes('view-model'))
    })

    it('should return all attributes when tagName is null', () => {
      const attributes = getPelelaAttributesForTag(null)

      assert.ok(attributes.includes('bind-alt'))
      assert.ok(attributes.includes('bind-enabled'))
      assert.ok(attributes.includes('enter'))
      assert.ok(attributes.includes('view-model'))
      assert.strictEqual(attributes.length, 16)
    })
  })
})
