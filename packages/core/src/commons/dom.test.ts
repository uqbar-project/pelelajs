import { describe, expect, it } from 'vitest'
import {
  isForeignElement,
  isNativeTag,
  isPelelaRootTag,
  isRouterHtmlTag,
  isStandardHtmlTag,
  isValidComponentAttribute,
} from './dom'

const HTML_DIV_TAG = 'div'
const SVG_CONTAINER_TAG = 'svg'
const SVG_PATH_TAG = 'path'
const SVG_GROUP_TAG = 'g'
const SVG_CIRCLE_TAG = 'circle'
const SVG_RECT_TAG = 'rect'
const MATH_CONTAINER_TAG = 'math'
const MATH_MI_TAG = 'mi'
const MATH_MROW_TAG = 'mrow'
const CUSTOM_TAG = 'my-component'
const UNKNOWN_TAG = 'unknown'

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

    it('returns false for SVG and MathML tags', () => {
      expect(isStandardHtmlTag(SVG_CONTAINER_TAG)).toBe(false)
      expect(isStandardHtmlTag(SVG_PATH_TAG)).toBe(false)
      expect(isStandardHtmlTag(MATH_CONTAINER_TAG)).toBe(false)
      expect(isStandardHtmlTag(MATH_MI_TAG)).toBe(false)
    })
  })

  describe('isForeignElement', () => {
    it('returns true for SVG tags', () => {
      expect(isForeignElement(SVG_CONTAINER_TAG)).toBe(true)
      expect(isForeignElement(SVG_PATH_TAG)).toBe(true)
      expect(isForeignElement(SVG_GROUP_TAG)).toBe(true)
      expect(isForeignElement(SVG_CIRCLE_TAG)).toBe(true)
      expect(isForeignElement(SVG_RECT_TAG)).toBe(true)
    })

    it('returns true for MathML tags', () => {
      expect(isForeignElement(MATH_CONTAINER_TAG)).toBe(true)
      expect(isForeignElement(MATH_MI_TAG)).toBe(true)
      expect(isForeignElement(MATH_MROW_TAG)).toBe(true)
    })

    it('is case-insensitive', () => {
      expect(isForeignElement(SVG_PATH_TAG.toUpperCase())).toBe(true)
      expect(isForeignElement(MATH_MI_TAG.toUpperCase())).toBe(true)
    })

    it('returns false for HTML and custom tags', () => {
      expect(isForeignElement(HTML_DIV_TAG)).toBe(false)
      expect(isForeignElement(CUSTOM_TAG)).toBe(false)
      expect(isForeignElement(UNKNOWN_TAG)).toBe(false)
    })
  })

  describe('isNativeTag', () => {
    it('returns true for HTML tags', () => {
      expect(isNativeTag(HTML_DIV_TAG)).toBe(true)
    })

    it('returns true for SVG and MathML tags', () => {
      expect(isNativeTag(SVG_PATH_TAG)).toBe(true)
      expect(isNativeTag(SVG_CIRCLE_TAG)).toBe(true)
      expect(isNativeTag(MATH_MI_TAG)).toBe(true)
    })

    it('returns false for custom or unknown tags', () => {
      expect(isNativeTag(CUSTOM_TAG)).toBe(false)
      expect(isNativeTag(UNKNOWN_TAG)).toBe(false)
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

  describe('isRouterHtmlTag', () => {
    it('returns true for outlet', () => {
      expect(isRouterHtmlTag('outlet')).toBe(true)
      expect(isRouterHtmlTag('OUTLET')).toBe(true)
    })

    it('returns false for other tags', () => {
      expect(isRouterHtmlTag('div')).toBe(false)
      expect(isRouterHtmlTag('pelela')).toBe(false)
      expect(isRouterHtmlTag('component')).toBe(false)
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

    it('returns true for const- prefix', () => {
      expect(isValidComponentAttribute('const-value')).toBe(true)
      expect(isValidComponentAttribute('const-field-name')).toBe(true)
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
