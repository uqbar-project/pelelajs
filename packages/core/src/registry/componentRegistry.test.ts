import { beforeEach, describe, expect, it } from 'vitest'
import type { ComponentConfig } from '../types'
import {
  clearComponentRegistry,
  getComponent,
  hasComponent,
  registerComponent,
} from './componentRegistry'

describe('componentRegistry', () => {
  beforeEach(() => {
    clearComponentRegistry()
  })

  describe('registerComponent', () => {
    it('should register a component successfully', () => {
      class TestViewModel {}
      const config: ComponentConfig = {
        viewModelName: 'TestComponent',
        viewModelConstructor: TestViewModel,
        template: '<div>Test</div>',
      }

      registerComponent('TestComponent', config)

      expect(hasComponent('TestComponent')).toBe(true)
      expect(getComponent('TestComponent')).toEqual(config)
    })

    it('should allow overwriting existing component with warning', () => {
      class TestViewModel1 {}
      class TestViewModel2 {}

      const config1: ComponentConfig = {
        viewModelName: 'TestComponent',
        viewModelConstructor: TestViewModel1,
        template: '<div>Test 1</div>',
      }

      const config2: ComponentConfig = {
        viewModelName: 'TestComponent',
        viewModelConstructor: TestViewModel2,
        template: '<div>Test 2</div>',
      }

      registerComponent('TestComponent', config1)
      registerComponent('TestComponent', config2)

      expect(getComponent('TestComponent')).toEqual(config2)
    })

    it('should register multiple components', () => {
      class ViewModel1 {}
      class ViewModel2 {}

      const config1: ComponentConfig = {
        viewModelName: 'Component1',
        viewModelConstructor: ViewModel1,
        template: '<div>1</div>',
      }

      const config2: ComponentConfig = {
        viewModelName: 'Component2',
        viewModelConstructor: ViewModel2,
        template: '<div>2</div>',
      }

      registerComponent('Component1', config1)
      registerComponent('Component2', config2)

      expect(hasComponent('Component1')).toBe(true)
      expect(hasComponent('Component2')).toBe(true)
    })
  })

  describe('getComponent', () => {
    it('should return undefined for non-existent component', () => {
      expect(getComponent('NonExistent')).toBeUndefined()
    })

    it('should return correct component config', () => {
      class TestViewModel {}
      const config: ComponentConfig = {
        viewModelName: 'TestComponent',
        viewModelConstructor: TestViewModel,
        template: '<div>Test</div>',
      }

      registerComponent('TestComponent', config)

      expect(getComponent('TestComponent')).toEqual(config)
    })
  })

  describe('hasComponent', () => {
    it('should return false for non-existent component', () => {
      expect(hasComponent('NonExistent')).toBe(false)
    })

    it('should return true for registered component', () => {
      class TestViewModel {}
      const config: ComponentConfig = {
        viewModelName: 'TestComponent',
        viewModelConstructor: TestViewModel,
        template: '<div>Test</div>',
      }

      registerComponent('TestComponent', config)

      expect(hasComponent('TestComponent')).toBe(true)
    })
  })

  describe('clearComponentRegistry', () => {
    it('should clear all registered components', () => {
      class ViewModel1 {}
      class ViewModel2 {}

      const config1: ComponentConfig = {
        viewModelName: 'Component1',
        viewModelConstructor: ViewModel1,
        template: '<div>1</div>',
      }

      const config2: ComponentConfig = {
        viewModelName: 'Component2',
        viewModelConstructor: ViewModel2,
        template: '<div>2</div>',
      }

      registerComponent('Component1', config1)
      registerComponent('Component2', config2)

      clearComponentRegistry()

      expect(hasComponent('Component1')).toBe(false)
      expect(hasComponent('Component2')).toBe(false)
    })
  })
})
