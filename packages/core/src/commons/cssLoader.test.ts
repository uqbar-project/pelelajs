import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createStylesheetLink,
  findExistingStylesheetLink,
  removeStylesheetLinks,
} from './cssLoader'

describe('cssLoader', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  afterEach(() => {
    document.head.innerHTML = ''
  })

  describe('createStylesheetLink', () => {
    it('should create a link element with correct attributes', () => {
      const cssUrl = 'http://example.com/style.css'
      const link = createStylesheetLink(cssUrl)

      expect(link.tagName).toBe('LINK')
      expect(link.rel).toBe('stylesheet')
      expect(link.href).toBe(cssUrl)
      expect(link.getAttribute('data-pelela-css-url')).toBe(cssUrl)
    })

    it('should create link with different CSS URLs', () => {
      const cssUrl1 = '/styles/main.css'
      const cssUrl2 = '/styles/theme.css'
      const link1 = createStylesheetLink(cssUrl1)
      const link2 = createStylesheetLink(cssUrl2)

      expect(link1.getAttribute('data-pelela-css-url')).toBe(cssUrl1)
      expect(link2.getAttribute('data-pelela-css-url')).toBe(cssUrl2)
    })
  })

  describe('findExistingStylesheetLink', () => {
    it('should return null when no matching link exists', () => {
      const cssUrl = 'http://example.com/style.css'
      const link = findExistingStylesheetLink(cssUrl)

      expect(link).toBeNull()
    })

    it('should return null when link exists but without data-pelela-css-url attribute', () => {
      const cssUrl = 'http://example.com/style.css'
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = cssUrl
      document.head.appendChild(link)

      const found = findExistingStylesheetLink(cssUrl)

      expect(found).toBeNull()
    })

    it('should return the link when it exists with correct attributes', () => {
      const cssUrl = 'http://example.com/style.css'
      const link = createStylesheetLink(cssUrl)
      document.head.appendChild(link)

      const found = findExistingStylesheetLink(cssUrl)

      expect(found).toBe(link)
    })

    it('should return null when link exists with different data-pelela-css-url', () => {
      const cssUrl = 'http://example.com/style.css'
      const link = createStylesheetLink('http://example.com/other.css')
      document.head.appendChild(link)

      const found = findExistingStylesheetLink(cssUrl)

      expect(found).toBeNull()
    })
  })

  describe('removeStylesheetLinks', () => {
    it('should do nothing when no matching links exist', () => {
      const cssUrl = 'http://example.com/style.css'
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      document.head.appendChild(link)

      removeStylesheetLinks(cssUrl)

      expect(document.head.children.length).toBe(1)
    })

    it('should remove a single matching link', () => {
      const cssUrl = 'http://example.com/style.css'
      const link = createStylesheetLink(cssUrl)
      document.head.appendChild(link)

      removeStylesheetLinks(cssUrl)

      expect(document.head.children.length).toBe(0)
    })

    it('should remove multiple matching links', () => {
      const cssUrl = 'http://example.com/style.css'
      const link1 = createStylesheetLink(cssUrl)
      const link2 = createStylesheetLink(cssUrl)
      document.head.appendChild(link1)
      document.head.appendChild(link2)

      removeStylesheetLinks(cssUrl)

      expect(document.head.children.length).toBe(0)
    })

    it('should not remove links with different data-pelela-css-url', () => {
      const cssUrl = 'http://example.com/style.css'
      const link1 = createStylesheetLink(cssUrl)
      const link2 = createStylesheetLink('http://example.com/other.css')
      document.head.appendChild(link1)
      document.head.appendChild(link2)

      removeStylesheetLinks(cssUrl)

      expect(document.head.children.length).toBe(1)
      expect(document.head.children[0]).toBe(link2)
    })

    it('should not remove links without data-pelela-css-url attribute', () => {
      const cssUrl = 'http://example.com/style.css'
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = cssUrl
      document.head.appendChild(link)

      removeStylesheetLinks(cssUrl)

      expect(document.head.children.length).toBe(1)
    })
  })
})
