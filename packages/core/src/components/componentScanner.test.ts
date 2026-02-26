import { beforeEach, describe, expect, it } from 'vitest'
import { hasComponentElements, scanComponents } from './componentScanner'
import { clearComponentRegistry, registerComponent } from '../registry/componentRegistry'
import type { ComponentConfig } from '../types'

describe('componentScanner', () => {
  beforeEach(() => {
    clearComponentRegistry()
  })

  describe('scanComponents', () => {
    it('should find registered components in HTML', () => {
      class TestComponent {}
      const config: ComponentConfig = {
        viewModelName: 'TestComponent',
        viewModelConstructor: TestComponent,
        template: '<div>Test</div>',
      }
      registerComponent('TestComponent', config)

      const root = document.createElement('div')
      root.innerHTML = '<TestComponent></TestComponent>'

      const components = scanComponents(root)

      expect(components).toHaveLength(1)
      expect(components[0].componentName).toBe('Testcomponent')
    })

    it('should extract unidirectional props', () => {
      class TestComponent {}
      const config: ComponentConfig = {
        viewModelName: 'TestComponent',
        viewModelConstructor: TestComponent,
        template: '<div>Test</div>',
      }
      registerComponent('TestComponent', config)

      const root = document.createElement('div')
      root.innerHTML = '<TestComponent name="value" age="25"></TestComponent>'

      const components = scanComponents(root)

      expect(components[0].props.unidirectional).toEqual({
        name: 'value',
        age: '25',
      })
    })

    it('should extract bidirectional props with link- prefix', () => {
      class TestComponent {}
      const config: ComponentConfig = {
        viewModelName: 'TestComponent',
        viewModelConstructor: TestComponent,
        template: '<div>Test</div>',
      }
      registerComponent('TestComponent', config)

      const root = document.createElement('div')
      root.innerHTML = '<TestComponent link-value="counter" link-name="userName"></TestComponent>'

      const components = scanComponents(root)

      expect(components[0].props.bidirectional).toEqual({
        value: 'counter',
        name: 'userName',
      })
    })

    it('should ignore non-PascalCase elements', () => {
      const root = document.createElement('div')
      root.innerHTML = '<div></div><span></span><lowercase></lowercase>'

      const components = scanComponents(root)

      expect(components).toHaveLength(0)
    })

    it('should find multiple component instances', () => {
      class ComponentA {}
      class ComponentB {}

      registerComponent('ComponentA', {
        viewModelName: 'ComponentA',
        viewModelConstructor: ComponentA,
        template: '<div>A</div>',
      })

      registerComponent('ComponentB', {
        viewModelName: 'ComponentB',
        viewModelConstructor: ComponentB,
        template: '<div>B</div>',
      })

      const root = document.createElement('div')
      root.innerHTML = '<ComponentA></ComponentA><ComponentB></ComponentB><ComponentA></ComponentA>'

      const components = scanComponents(root)

      expect(components).toHaveLength(3)
    })

    it('should skip unregistered PascalCase elements', () => {
      const root = document.createElement('div')
      root.innerHTML = '<UnregisteredComponent></UnregisteredComponent>'

      const components = scanComponents(root)
      expect(components).toHaveLength(0)
    })
  })

  describe('hasComponentElements', () => {
    it('should return true if components exist', () => {
      class TestComponent {}
      registerComponent('TestComponent', {
        viewModelName: 'TestComponent',
        viewModelConstructor: TestComponent,
        template: '<div>Test</div>',
      })

      const root = document.createElement('div')
      root.innerHTML = '<div><TestComponent></TestComponent></div>'

      expect(hasComponentElements(root)).toBe(true)
    })

    it('should return false if no components exist', () => {
      const root = document.createElement('div')
      root.innerHTML = '<div><span>No components</span></div>'

      expect(hasComponentElements(root)).toBe(false)
    })
  })
})

