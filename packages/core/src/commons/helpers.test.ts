import { describe, expect, it } from 'vitest'
import { clearComponentRegistry, defineComponent } from '../registry/componentRegistry'
import { extractElementSnippet, filterOwnElements, isObject, unwrapTemplate } from './helpers'

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

  describe('unwrapTemplate', () => {
    it('should unwrap a simple <pelela> tag', () => {
      const template = '<pelela view-model="Test"><div>Content</div></pelela>'
      expect(unwrapTemplate(template)).toBe('<div>Content</div>')
    })

    it('should unwrap a simple <component> tag', () => {
      const template = '<component view-model="Test"><span>Content</span></component>'
      expect(unwrapTemplate(template)).toBe('<span>Content</span>')
    })

    it('should be case-insensitive for tags', () => {
      const template = '<PELELA view-model="Test">Content</PELELA>'
      expect(unwrapTemplate(template)).toBe('Content')
    })

    it('should handle whitespace and newlines', () => {
      const template = `
        <component view-model="Test">
          <div>Content</div>
        </component>
      `
      expect(unwrapTemplate(template)).toBe('<div>Content</div>')
    })

    it('should return original string if no match found', () => {
      const template = '<div>No Root</div>'
      expect(unwrapTemplate(template)).toBe('<div>No Root</div>')
    })
  })

  describe('filterOwnElements', () => {
    it('should include direct children', () => {
      const root = document.createElement('div')
      root.innerHTML = '<span id="child"></span>'
      const child = root.querySelector('#child') as HTMLElement

      const filtered = filterOwnElements([child], root)
      expect(filtered).toContain(child)
    })

    it('should exclude elements inside a nested component with view-model', () => {
      const root = document.createElement('div')
      root.innerHTML = `
        <div id="direct"></div>
        <div view-model="Other">
          <span id="nested"></span>
        </div>
      `
      const direct = root.querySelector('#direct') as HTMLElement
      const nested = root.querySelector('#nested') as HTMLElement

      const filtered = filterOwnElements([direct, nested], root)
      expect(filtered).toContain(direct)
      expect(filtered).not.toContain(nested)
    })

    it('should exclude elements inside a registered custom tag', () => {
      class MockVM {}
      defineComponent('CustomTag', MockVM, '<component view-model="CustomTag"></component>')

      const root = document.createElement('div')
      root.innerHTML = `
        <custom-tag>
          <span id="nested"></span>
        </custom-tag>
      `
      const nested = root.querySelector('#nested') as HTMLElement

      const filtered = filterOwnElements([nested], root)
      expect(filtered).not.toContain(nested)

      clearComponentRegistry()
    })
  })
})
