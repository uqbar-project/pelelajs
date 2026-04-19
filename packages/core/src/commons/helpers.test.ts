import { describe, expect, it } from 'vitest'
import { extractElementSnippet, isObject } from './helpers'

describe('helpers', () => {
  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true)
      expect(isObject({ key: 'value' })).toBe(true)
    })

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false)
    })

    it('should return false for primitives', () => {
      expect(isObject(42)).toBe(false)
      expect(isObject('string')).toBe(false)
      expect(isObject(true)).toBe(false)
      expect(isObject(undefined)).toBe(false)
    })
  })

  describe('extractElementSnippet', () => {
    it('should extract the outer HTML of an element', () => {
      const element = document.createElement('div')
      element.className = 'test-class'
      element.innerHTML = '<span>content</span>'

      const snippet = extractElementSnippet(element)
      expect(snippet).toBe('<div class="test-class"><span>content</span></div>')
    })

    it('should normalize whitespace in the HTML', () => {
      const element = document.createElement('div')
      element.innerHTML = `
        <ul>
          <li>item</li>
        </ul>
      `
      const snippet = extractElementSnippet(element)
      expect(snippet).toBe('<div> <ul> <li>item</li> </ul> </div>')
    })

    it('should truncate the snippet to 100 characters by default', () => {
      const element = document.createElement('div')
      element.innerHTML = 'a'.repeat(200)

      const snippet = extractElementSnippet(element)
      expect(snippet.length).toBe(100)
    })

    it('should truncate the snippet to a custom maximum length', () => {
      const element = document.createElement('div')
      element.innerHTML = 'a'.repeat(200)

      const snippet = extractElementSnippet(element, 50)
      expect(snippet.length).toBe(50)
    })
  })
})
