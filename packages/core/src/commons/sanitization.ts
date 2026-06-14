import { DOMEnvironmentError } from '../errors'
import { isObject } from './helpers'
import { t } from './i18n'

const BLACKLISTED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function isUnsafeKey(key: string): boolean {
  return BLACKLISTED_KEYS.has(key)
}

export function hasProperty(obj: object, key: string): boolean {
  if (isUnsafeKey(key)) return false
  return Reflect.has(obj, key)
}

/**
 * Utilities for sanitizing and escaping untrusted content
 * before injecting it into the DOM or other sensitive contexts
 */

/**
 * Escapes HTML special characters in a string.
 */
export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }

  return text.replace(/[&<>"'/]/g, (character) => map[character])
}

/**
 * Sanitizes any value. If it's a string, it's escaped.
 * If it's an object/array, it recurses (safely).
 * Note: For objects, returns a plain object without preserving the prototype.
 * Class instances will lose their methods.
 */
export function sanitize<T>(value: T): T {
  return sanitizeInternal(value, new WeakSet()) as T
}

function sanitizeInternal(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return escapeHTML(value)
  if (!isObject(value)) return value

  if (seen.has(value)) {
    throw new TypeError('Cannot sanitize circular references')
  }
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeInternal(item, seen))
  }

  const result = {} as Record<string, unknown>
  Object.entries(value).forEach(([key, val]) => {
    result[key] = sanitizeInternal(val, seen)
  })
  return result
}

/**
 * XSS Security Rules
 */
const DANGEROUS_TAGS = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'BASE', 'STYLE'])

type TagRule = (tagName: string) => boolean
type AttributeRule = (name: string, value: string) => boolean

const TAG_RULES: TagRule[] = [(tagName) => DANGEROUS_TAGS.has(tagName)]

const ATTRIBUTE_RULES: AttributeRule[] = [
  (name) => name.startsWith('on'),
  (name, value) =>
    (name === 'href' || name === 'src') && value.toLowerCase().startsWith('javascript:'),
]

function isUnsafeTag(tagName: string): boolean {
  return TAG_RULES.some((rule) => rule(tagName))
}

function isUnsafeAttribute(name: string, value: string): boolean {
  return ATTRIBUTE_RULES.some((rule) => rule(name, value))
}

/**
 * HTML5 Valid Void Elements (The only tags allowed to be self-closed)
 */
const VALID_VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

/**
 * Ensures that normal elements or custom tags are not incorrectly self-closed.
 */
function validateNoInvalidSelfClosingTags(htmlContent: string): void {
  const selfClosingTagPattern = /<([a-zA-Z0-9_-]+)([^>]*)\/>/g
  const matches = Array.from(htmlContent.matchAll(selfClosingTagPattern))

  const invalidMatch = matches.find((match) => !VALID_VOID_ELEMENTS.has(match[1].toLowerCase()))

  if (invalidMatch) {
    const matchIndex = invalidMatch.index ?? 0
    const contextSnippet = htmlContent.substring(
      Math.max(0, matchIndex - 20),
      Math.min(htmlContent.length, matchIndex + 40),
    )

    throw new Error(
      t('errors.security.selfClosingError', '', {
        element: invalidMatch[1],
        context: contextSnippet.trim(),
      }),
    )
  }
}

/**
 * Sanitizes an HTML string by removing dangerous elements and attributes
 * (like <script> and onclick) while preserving the overall structure.
 * Useful for templates.
 */
export function sanitizeHTML(html: string): string {
  if (typeof document === 'undefined' || typeof DOMParser === 'undefined') {
    throw new DOMEnvironmentError()
  }

  validateNoInvalidSelfClosingTags(html)

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const body = doc.body

  function walk(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement

      if (isUnsafeTag(element.tagName)) {
        element.remove()
        return
      }

      Array.from(element.attributes).forEach((attr) => {
        if (isUnsafeAttribute(attr.name, attr.value)) {
          element.removeAttribute(attr.name)
        }
      })
    }

    Array.from(node.childNodes).forEach((child) => {
      walk(child)
    })
  }

  walk(body)

  return body.innerHTML
}
