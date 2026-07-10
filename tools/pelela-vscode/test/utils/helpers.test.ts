import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import { findFirst } from '../../src/helpers'

describe('helpers', () => {
  describe('findFirst', () => {
    it('should return the first matching element from an array', () => {
      const result = findFirst([1, 2, 3, 4], (item) => item > 2)
      assert.strictEqual(result, 3)
    })

    it('should return the first matching element at index 0', () => {
      const result = findFirst([1, 2, 3], (item) => item > 0)
      assert.strictEqual(result, 1)
    })

    it('should return undefined when no element matches', () => {
      const result = findFirst([1, 2, 3], (item) => item > 10)
      assert.strictEqual(result, undefined)
    })

    it('should return undefined for an empty iterable', () => {
      const result = findFirst([] as number[], (_item) => true)
      assert.strictEqual(result, undefined)
    })

    it('should short-circuit and not evaluate remaining elements', () => {
      let evaluatedCount = 0
      const result = findFirst([1, 2, 3, 4, 5], (item) => {
        evaluatedCount++
        return item > 2
      })
      assert.strictEqual(result, 3)
      assert.strictEqual(evaluatedCount, 3)
    })

    it('should work with a Set', () => {
      const result = findFirst(new Set(['apple', 'banana', 'cherry']), (fruit) =>
        fruit.startsWith('b')
      )
      assert.strictEqual(result, 'banana')
    })

    it('should work with a generator', () => {
      function* evens(): Generator<number, void, unknown> {
        yield 2
        yield 4
        yield 6
        yield 8
      }
      const result = findFirst(evens(), (num) => num > 5)
      assert.strictEqual(result, 6)
    })
  })
})
