import { describe, expect, it } from 'vitest'
import { unwrapReactive } from './proxyIdentity'
import { createReactiveViewModel } from './reactiveProxy'

describe('unwrapReactive', () => {
  it('should return the raw target for a reactive proxy', () => {
    const target = { users: [] }
    const reactive = createReactiveViewModel(target, () => {})

    expect(unwrapReactive(reactive)).toBe(target)
  })

  it('should return the same value for a plain object', () => {
    const target = { users: [] }

    expect(unwrapReactive(target)).toBe(target)
  })

  it('should not unwrap a plain object with an own $raw property', () => {
    const target = { $raw: { unrelated: true }, count: 1 }

    expect(unwrapReactive(target)).toBe(target)
  })

  it('should pass through null and primitives', () => {
    expect(unwrapReactive(null)).toBeNull()
    expect(unwrapReactive(42)).toBe(42)
    expect(unwrapReactive('value')).toBe('value')
  })
})
