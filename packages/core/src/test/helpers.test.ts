import { afterEach, describe, expect, it } from 'vitest'
import { testHelpers } from './helpers'

const { catchError } = testHelpers

describe('test helpers', () => {
  describe('catchError', () => {
    it('should return the error thrown synchronously by the wrapped function', () => {
      const boom = new Error('boom')

      const result = catchError(() => {
        throw boom
      })

      expect(result).toBe(boom)
    })

    it('should throw an Error when the wrapped function completes without throwing', () => {
      expect(() => catchError(() => 'value')).toThrow(Error)
    })

    it('should throw a TypeError when the wrapped function is async and the promise is not awaited', () => {
      expect(() => catchError(async () => {})).toThrow(TypeError)
    })
  })

  describe('container helpers', () => {
    afterEach(() => {
      testHelpers.cleanupAllContainers()
    })

    it('should create a container attached to the document body', () => {
      const container = testHelpers.createTestContainer()

      expect(container.parentElement).toBe(document.body)
    })

    it('should detach the container from the DOM when cleaned up', () => {
      const container = testHelpers.createTestContainer()

      testHelpers.cleanupTestContainer(container)

      expect(container.parentElement).toBeNull()
    })

    it('should tolerate cleaning up an already detached container', () => {
      const container = document.createElement('div')

      expect(() => testHelpers.cleanupTestContainer(container)).not.toThrow()
    })

    it('should remove every created container from the DOM', () => {
      const first = testHelpers.createTestContainer()
      const second = testHelpers.createTestContainer()

      testHelpers.cleanupAllContainers()

      expect(first.parentElement).toBeNull()
      expect(second.parentElement).toBeNull()
      expect(document.body.querySelectorAll('div')).toHaveLength(0)
    })
  })
})
