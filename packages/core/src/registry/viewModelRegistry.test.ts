import { beforeEach, describe, expect, it } from 'vitest'
import { ViewModelRegistrationError } from '../errors'
import {
  clearRegistry,
  getViewModel,
  hasViewModel,
  registerViewModel,
  replaceViewModel,
} from './viewModelRegistry'

class TestViewModel {
  value = 0
}

class AnotherViewModel {
  text = ''
}

describe('viewModelRegistry', () => {
  beforeEach(() => {
    clearRegistry()
  })

  describe('registerViewModel', () => {
    it('should register a new view model', () => {
      registerViewModel('Test', TestViewModel)

      expect(hasViewModel('Test')).toBe(true)
    })

    it('should throw error if trying to register a duplicate name', () => {
      registerViewModel('Duplicate', TestViewModel)

      expect(() => {
        registerViewModel('Duplicate', AnotherViewModel)
      }).toThrow(ViewModelRegistrationError)
    })

    it('should allow registering multiple view models with different names', () => {
      registerViewModel('First', TestViewModel)
      registerViewModel('Second', AnotherViewModel)

      expect(hasViewModel('First')).toBe(true)
      expect(hasViewModel('Second')).toBe(true)
    })
  })

  describe('replaceViewModel', () => {
    it('should replace an existing view model without throwing', () => {
      registerViewModel('ReplaceMe', TestViewModel)
      replaceViewModel('ReplaceMe', AnotherViewModel)

      expect(getViewModel('ReplaceMe')).toBe(AnotherViewModel)
    })

    it('should work even if the view model was not previously registered', () => {
      replaceViewModel('NewOne', TestViewModel)

      expect(getViewModel('NewOne')).toBe(TestViewModel)
    })
  })

  describe('getViewModel', () => {
    it('should return the registered constructor', () => {
      registerViewModel('GetTest', TestViewModel)
      const creator = getViewModel('GetTest')
      expect(creator).toBe(TestViewModel)
    })

    it('should return undefined for unregistered names', () => {
      const creator = getViewModel('NonExistent')
      expect(creator).toBeUndefined()
    })

    it('should allow instantiating the returned constructor', () => {
      registerViewModel('Instantiable', TestViewModel)
      const creator = getViewModel('Instantiable')
      const instance = creator ? new creator() : null
      expect(instance).toBeInstanceOf(TestViewModel)
      expect(instance).toHaveProperty('value', 0)
    })
  })

  describe('hasViewModel', () => {
    it('should return true for registered view models', () => {
      registerViewModel('Exists', TestViewModel)

      expect(hasViewModel('Exists')).toBe(true)
    })

    it('should return false for unregistered view models', () => {
      expect(hasViewModel('DoesNotExist')).toBe(false)
    })
  })
})
