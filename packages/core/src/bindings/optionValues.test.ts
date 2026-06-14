import { describe, expect, it } from 'vitest'
import { getOptionValue, hasOptionValue, setOptionValue } from './optionValues'

describe('optionValues', () => {
  it('should set and retrieve value for option element', () => {
    const option = document.createElement('option')
    const value = { name: 'test', count: 42 }

    setOptionValue(option, value)

    expect(hasOptionValue(option)).toBe(true)
    expect(getOptionValue(option)).toBe(value)
  })

  it('should return false when option has no value', () => {
    const option = document.createElement('option')

    expect(hasOptionValue(option)).toBe(false)
    expect(getOptionValue(option)).toBeUndefined()
  })

  it('should handle different value types', () => {
    const option1 = document.createElement('option')
    const option2 = document.createElement('option')
    const option3 = document.createElement('option')

    setOptionValue(option1, 'string value')
    setOptionValue(option2, 123)
    setOptionValue(option3, { key: 'value' })

    expect(getOptionValue(option1)).toBe('string value')
    expect(getOptionValue(option2)).toBe(123)
    expect(getOptionValue(option3)).toEqual({ key: 'value' })
  })

  it('should handle class instances', () => {
    class TestClass {
      constructor(public value: string) {}
    }

    const option = document.createElement('option')
    const instance = new TestClass('test')

    setOptionValue(option, instance)

    const retrieved = getOptionValue(option) as TestClass
    expect(retrieved).toBe(instance)
    expect(retrieved?.value).toBe('test')
  })

  it('should overwrite existing value', () => {
    const option = document.createElement('option')

    setOptionValue(option, 'first value')
    expect(getOptionValue(option)).toBe('first value')

    setOptionValue(option, 'second value')
    expect(getOptionValue(option)).toBe('second value')
  })

  it('should handle null and undefined values', () => {
    const option1 = document.createElement('option')
    const option2 = document.createElement('option')

    setOptionValue(option1, null)
    setOptionValue(option2, undefined)

    expect(hasOptionValue(option1)).toBe(true)
    expect(getOptionValue(option1)).toBeNull()

    expect(hasOptionValue(option2)).toBe(true)
    expect(getOptionValue(option2)).toBeUndefined()
  })
})
