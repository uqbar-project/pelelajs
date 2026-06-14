import { describe, expect, it } from 'vitest'
import { DOMEnvironmentError } from '../errors'
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

        expect(() => sanitizeHTML('<div></div>')).toThrow(new DOMEnvironmentError())
      } finally {
        global.document = originalDocument
        global.DOMParser = originalDOMParser
      }
    })

    describe('self-closing tag validation', () => {
      it('should throw error for self-closing textarea', () => {
        expect(() => sanitizeHTML('<textarea bind-value="message" />')).toThrow(
          /Malformed HTML5.*textarea.*cannot be self-closed/,
        )
      })

      it('should throw error for self-closing div', () => {
        expect(() => sanitizeHTML('<div class="container" />')).toThrow(
          /Malformed HTML5.*div.*cannot be self-closed/,
        )
      })

      it('should throw error for self-closing span', () => {
        expect(() => sanitizeHTML('<span bind-content="text" />')).toThrow(
          /Malformed HTML5.*span.*cannot be self-closed/,
        )
      })

      it('should allow valid void elements like br', () => {
        expect(() => sanitizeHTML('<br />')).not.toThrow()
      })

      it('should allow valid void elements like img', () => {
        expect(() => sanitizeHTML('<img src="test.jpg" />')).not.toThrow()
      })

      it('should allow valid void elements like input', () => {
        expect(() => sanitizeHTML('<input type="text" />')).not.toThrow()
      })

      it('should allow valid void elements like hr', () => {
        expect(() => sanitizeHTML('<hr />')).not.toThrow()
      })

      it('should allow valid void elements like link', () => {
        expect(() => sanitizeHTML('<link rel="stylesheet" href="style.css" />')).not.toThrow()
      })

      it('should allow valid void elements like meta', () => {
        expect(() => sanitizeHTML('<meta charset="utf-8" />')).not.toThrow()
      })

      it('should throw error for custom tag self-closing', () => {
        expect(() => sanitizeHTML('<custom-component />')).toThrow(
          /Malformed HTML5.*custom-component.*cannot be self-closed/,
        )
      })
    })
  })
})
