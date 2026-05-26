import { afterEach, describe, expect, it } from 'vitest'
import { clearComponentRegistry, defineComponent } from '../registry/componentRegistry'
import {
  extractElementSnippet,
  filterOwnElements,
  findAllElements,
  isObject,
  isPropertyOrNestedPath,
  isValidIdentifier,
  toCamelCase,
  toKebabCase,
  unwrapTemplate,
} from './helpers'

describe('helpers', () => {
  afterEach(() => {
    clearComponentRegistry()
  })

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

    it('should throw error for mismatched opening and closing tags', () => {
      const template = '<pelela view-model="Test">Content</component>'
      expect(() => unwrapTemplate(template)).toThrow('Malformed template')
    })

    it('should throw error for malformed template without closing tag', () => {
      const template = '<pelela view-model="Test">Content'
      expect(() => unwrapTemplate(template)).toThrow('Malformed template')
    })

    it('should throw error for template with wrong tag name', () => {
      const template = '<div>Content</div>'
      expect(() => unwrapTemplate(template)).toThrow('Malformed template')
    })

    it('should handle whitespace and newlines', () => {
      const template = `
        <component view-model="Test">
          <div>Content</div>
        </component>
      `
      expect(unwrapTemplate(template)).toBe('<div>Content</div>')
    })

    it('should preserve inner nested wrapper tag when same tag is nested', () => {
      const nestedTemplate = '<pelela view-model="X"><pelela>inner</pelela></pelela>'
      expect(unwrapTemplate(nestedTemplate)).toBe('<pelela>inner</pelela>')
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
    })
  })

  describe('toCamelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(toCamelCase('my-component')).toBe('myComponent')
      expect(toCamelCase('foo-bar')).toBe('fooBar')
      expect(toCamelCase('test-case')).toBe('testCase')
    })

    it('should handle single word', () => {
      expect(toCamelCase('hello')).toBe('hello')
    })

    it('should handle multiple hyphens', () => {
      expect(toCamelCase('my-long-component-name')).toBe('myLongComponentName')
    })
  })

  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('myComponent')).toBe('my-component')
      expect(toKebabCase('fooBar')).toBe('foo-bar')
      expect(toKebabCase('testCase')).toBe('test-case')
    })

    it('should handle single word', () => {
      expect(toKebabCase('hello')).toBe('hello')
    })

    it('should handle multiple words', () => {
      expect(toKebabCase('myLongComponentName')).toBe('my-long-component-name')
    })
  })

  describe('isPropertyOrNestedPath', () => {
    it('should return true for property matching root', () => {
      expect(isPropertyOrNestedPath('item', 'item')).toBe(true)
    })

    it('should return true for property starting with root and dot', () => {
      expect(isPropertyOrNestedPath('item.name', 'item')).toBe(true)
      expect(isPropertyOrNestedPath('item.value', 'item')).toBe(true)
    })

    it('should return false for different property', () => {
      expect(isPropertyOrNestedPath('other', 'item')).toBe(false)
    })

    it('should return false for property without dot separator', () => {
      expect(isPropertyOrNestedPath('itemname', 'item')).toBe(false)
    })

    it('should return false for symbol properties', () => {
      expect(isPropertyOrNestedPath(Symbol('test'), 'item')).toBe(false)
    })
  })

  describe('findAllElements', () => {
    it('should find elements with the selector inside the root', () => {
      const root = document.createElement('div')
      root.innerHTML = '<span bind-class="test"></span>'
      const span = root.querySelector('span') as HTMLElement

      const result = findAllElements(root, '[bind-class]')
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(span)
    })

    it('should include the root element if it matches the selector', () => {
      const root = document.createElement('div')
      root.setAttribute('bind-class', 'test')
      root.innerHTML = '<span></span>'

      const result = findAllElements(root, '[bind-class]')
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(root)
    })

    it('should include both root and descendants if they match', () => {
      const root = document.createElement('div')
      root.setAttribute('bind-class', 'root-class')
      root.innerHTML = '<span bind-class="child-class"></span>'
      const span = root.querySelector('span') as HTMLElement

      const result = findAllElements(root, '[bind-class]')
      expect(result).toHaveLength(2)
      expect(result).toContain(root)
      expect(result).toContain(span)
    })

    it('should return an empty array if no elements match', () => {
      const root = document.createElement('div')
      root.innerHTML = '<span></span>'

      const result = findAllElements(root, '[bind-class]')
      expect(result).toHaveLength(0)
    })
  })

  describe('isValidIdentifier', () => {
    it('should return true for valid identifiers starting with letters', () => {
      expect(isValidIdentifier('item')).toBe(true)
      expect(isValidIdentifier('myVar')).toBe(true)
    })

    it('should return true for valid identifiers starting with underscore', () => {
      expect(isValidIdentifier('_private')).toBe(true)
    })

    it('should return true for valid identifiers starting with dollar sign', () => {
      expect(isValidIdentifier('$jquery')).toBe(true)
    })

    it('should return true for valid identifiers with numbers after first character', () => {
      expect(isValidIdentifier('item1')).toBe(true)
    })

    it('should return false for identifiers starting with numbers', () => {
      expect(isValidIdentifier('0foo')).toBe(false)
      expect(isValidIdentifier('123')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isValidIdentifier('')).toBe(false)
    })

    it('should return false for identifiers with hyphens', () => {
      expect(isValidIdentifier('my-var')).toBe(false)
    })

    it('should return false for identifiers with spaces', () => {
      expect(isValidIdentifier('my var')).toBe(false)
    })

    it('should return false for identifiers with special characters', () => {
      expect(isValidIdentifier('my@var')).toBe(false)
    })

    it('should return false for unsafe prototype pollution keys', () => {
      expect(isValidIdentifier('__proto__')).toBe(false)
      expect(isValidIdentifier('constructor')).toBe(false)
      expect(isValidIdentifier('prototype')).toBe(false)
    })
  })
})
