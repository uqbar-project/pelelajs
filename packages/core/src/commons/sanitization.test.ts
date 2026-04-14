import { describe, expect, it } from 'vitest'
import { escapeHTML, sanitize } from './sanitization'

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
  })
})
