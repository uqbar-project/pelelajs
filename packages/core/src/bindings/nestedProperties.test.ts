import { describe, expect, it } from 'vitest'
import { getNestedProperty, setNestedProperty } from './nestedProperties'

describe('nestedProperties', () => {
  describe('getNestedProperty', () => {
    it('should return the value at the specified path', () => {
      const obj = { a: { b: { c: 42 } } }
      expect(getNestedProperty(obj, 'a.b.c')).toBe(42)
    })

    it('should return undefined for blacklisted keys', () => {
      const obj = {}
      expect(getNestedProperty(obj, '__proto__')).toBeUndefined()
      expect(getNestedProperty(obj, 'constructor')).toBeUndefined()
      expect(getNestedProperty(obj, 'prototype')).toBeUndefined()
    })

    it('should return undefined if path does not exist', () => {
      const obj = { a: { b: {} } }
      expect(getNestedProperty(obj, 'a.b.c')).toBeUndefined()
    })

    it('should return undefined if intermediate node is null or undefined', () => {
      const obj = { a: { b: null } }
      expect(getNestedProperty(obj, 'a.b.c')).toBeUndefined()
    })

    it('should allow accessing properties of primitives (by default JS behavior)', () => {
      const obj = { a: 'hello' }
      expect(getNestedProperty(obj, 'a.length')).toBe(5)
    })
  })

  describe('setNestedProperty', () => {
    it('should set the value at the specified path', () => {
      const obj = { a: { b: { c: 0 } } }
      const success = setNestedProperty(obj, 'a.b.c', 42)
      expect(success).toBe(true)
      expect(obj.a.b.c).toBe(42)
    })

    it('should return false for blacklisted keys', () => {
      const obj = {}
      expect(setNestedProperty(obj, '__proto__', { polluted: 'yes' })).toBe(false)
      expect(setNestedProperty(obj, 'constructor', { polluted: 'yes' })).toBe(false)
      expect(setNestedProperty(obj, 'prototype', { polluted: 'yes' })).toBe(false)
    })

    it('should return false for paths containing blacklisted keys', () => {
      const obj = { a: {} }
      expect(setNestedProperty(obj, 'a.__proto__.polluted', 'yes')).toBe(false)
      expect(setNestedProperty(obj, 'a.constructor.polluted', 'yes')).toBe(false)
    })

    it('should not allow prototype pollution', () => {
      const obj: any = {}
      expect(setNestedProperty(obj, '__proto__.polluted', 'yes')).toBe(false)
      expect((Object.prototype as any).polluted).toBeUndefined()

      expect(setNestedProperty(obj, '__proto__.polluted', 'yes')).toBe(false)
      expect((Object.prototype as any).polluted).toBeUndefined()
    })

    it('should return false if intermediate node is null', () => {
      const obj = { a: { b: null } }
      const success = setNestedProperty(obj, 'a.b.c', 42)
      expect(success).toBe(false)
    })

    it('should return false if intermediate node is undefined', () => {
      const obj: { a: Record<string, unknown> } = { a: {} }
      const success = setNestedProperty(obj, 'a.b.c', 42)
      expect(success).toBe(false)
    })

    it('should return false and not throw if intermediate node is a primitive', () => {
      const obj = { a: { b: 'soy un string' } }
      const success = setNestedProperty(obj, 'a.b.c', 42)
      expect(success).toBe(false)
      expect(obj.a.b).toBe('soy un string')
    })

    it('should return false and not throw if target node is a primitive', () => {
      const obj = { a: 42 }
      const success = setNestedProperty(obj, 'a.b', 10)
      expect(success).toBe(false)
      expect(obj.a).toBe(42)
    })

    it('should return false for empty path', () => {
      const obj = {}
      expect(setNestedProperty(obj, '', 42)).toBe(false)
    })

    it('should set property on top-level object', () => {
      const obj: { id?: number } = {}
      const success = setNestedProperty(obj, 'id', 1)
      expect(success).toBe(true)
      expect(obj.id).toBe(1)
    })
  })
})
