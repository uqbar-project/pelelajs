import { describe, expect, it } from 'vitest'
import { isPelelaRootTag, isStandardHtmlTag, isValidComponentAttribute } from './dom'

describe('dom utilities', () => {
  describe('isStandardHtmlTag', () => {
    it('returns true for common HTML tags', () => {
      expect(isStandardHtmlTag('div')).toBe(true)
      expect(isStandardHtmlTag('SPAN')).toBe(true)
      expect(isStandardHtmlTag('h1')).toBe(true)
      expect(isStandardHtmlTag('section')).toBe(true)
    })

    it('returns true for new HTML5 tags', () => {
      expect(isStandardHtmlTag('main')).toBe(true)
      expect(isStandardHtmlTag('nav')).toBe(true)
      expect(isStandardHtmlTag('search')).toBe(true)
    })

    it('returns false for custom or unknown tags', () => {
      expect(isStandardHtmlTag('my-component')).toBe(false)
      expect(isStandardHtmlTag('unknown')).toBe(false)
      expect(isStandardHtmlTag('pelela')).toBe(false)
    })
  })

  describe('isPelelaRootTag', () => {
    it('returns true for pelela and component tags', () => {
      expect(isPelelaRootTag('pelela')).toBe(true)
      expect(isPelelaRootTag('COMPONENT')).toBe(true)
      expect(isPelelaRootTag('Pelela')).toBe(true)
    })

    it('returns false for other tags', () => {
      expect(isPelelaRootTag('div')).toBe(false)
      expect(isPelelaRootTag('span')).toBe(false)
      expect(isPelelaRootTag('my-component')).toBe(false)
    })
  })

  describe('isValidComponentAttribute', () => {
    it('returns true for link- prefix', () => {
      expect(isValidComponentAttribute('link-value')).toBe(true)
      expect(isValidComponentAttribute('link-any-property')).toBe(true)
    })

    it('returns true for prop- prefix', () => {
      expect(isValidComponentAttribute('prop-value')).toBe(true)
      expect(isValidComponentAttribute('prop-data')).toBe(true)
    })

    it('returns true for "if" attribute', () => {
      expect(isValidComponentAttribute('if')).toBe(true)
    })

    it('returns false for standard HTML attributes or unknown prefixes', () => {
      expect(isValidComponentAttribute('class')).toBe(false)
      expect(isValidComponentAttribute('id')).toBe(false)
      expect(isValidComponentAttribute('value')).toBe(false)
      expect(isValidComponentAttribute('bind-content')).toBe(false)
      expect(isValidComponentAttribute('on-click')).toBe(false)
    })
  })
})
