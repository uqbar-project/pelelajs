import { describe, expect, it } from 'vitest'
import { escapeHTML, sanitize, sanitizeHTML } from './sanitization'

describe('sanitization', () => {
  describe('escapeHTML', () => {
    it('should escape special characters', () => {
      expect(escapeHTML('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;',
      )
      expect(escapeHTML('& " \' /')).toBe('&amp; &quot; &#39; &#x2F;')
    })

    it('should return empty string for empty input', () => {
      expect(escapeHTML('')).toBe('')
    })
  })

  describe('sanitize', () => {
    it('should sanitize strings', () => {
      expect(sanitize('<b>Bold</b>')).toBe('&lt;b&gt;Bold&lt;&#x2F;b&gt;')
    })

    it('should sanitize arrays', () => {
      const input = ['<script>', 'safe']
      const expected = ['&lt;script&gt;', 'safe']
      expect(sanitize(input)).toEqual(expected)
    })

    it('should preserve non-string values in arrays', () => {
      const input = ['<script>', 42, true, null]
      const expected = ['&lt;script&gt;', 42, true, null]
      expect(sanitize(input)).toEqual(expected)
    })

    it('should sanitize nested objects', () => {
      const input = {
        name: '<script>',
        info: {
          bio: '<b>',
        },
      }
      const expected = {
        name: '&lt;script&gt;',
        info: {
          bio: '&lt;b&gt;',
        },
      }
      expect(sanitize(input)).toEqual(expected)
    })

    it('should preserve numbers and booleans', () => {
      expect(sanitize(123)).toBe(123)
      expect(sanitize(true)).toBe(true)
      expect(sanitize(false)).toBe(false)
    })

    it('should handle null and undefined', () => {
      expect(sanitize(null)).toBe(null)
      expect(sanitize(undefined)).toBe(undefined)
    })

    it('should fail fast on circular references', () => {
      const input: Record<string, unknown> = {}
      input.self = input
      expect(() => sanitize(input)).toThrow(/circular/i)
    })
  })

  describe('sanitizeHTML', () => {
    it('should strip malicious tags and attributes', () => {
      const input =
        '<div>Safe</div><script>alert(1)</script><button onclick="alert(2)">Click</button>'
      const output = sanitizeHTML(input)
      expect(output).toContain('<div>Safe</div>')
      expect(output).not.toContain('<script>')
      expect(output).not.toContain('onclick')
    })

    it('should throw error when DOM environment is missing', () => {
      const originalDocument = global.document
      const originalDOMParser = global.DOMParser

      try {
        // @ts-expect-error - simulating environment without DOM
        global.document = undefined
        // @ts-expect-error - simulating environment without DOM
        global.DOMParser = undefined

        expect(() => sanitizeHTML('<div></div>')).toThrow(/DOM environment/i)
      } finally {
        global.document = originalDocument
        global.DOMParser = originalDOMParser
      }
    })
  })
})
