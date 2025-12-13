import { describe, expect, it } from 'vitest'
import { PropertyValidationError } from '../errors/index'
import { assertViewModelProperty } from './assertViewModelProperty'

class TestViewModel {
  existingProperty = 'value'
  user = {
    name: 'John',
    profile: {
      bio: 'Hello',
    },
  }
}

describe('assertViewModelProperty', () => {
  it('should not throw error if property exists', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('div')
    element.setAttribute('bind-value', 'existingProperty')

    expect(() => {
      assertViewModelProperty(viewModel, 'existingProperty', 'bind-value', element)
    }).not.toThrow()
  })

  it('should throw error if property does not exist', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('div')
    element.setAttribute('bind-value', 'nonExistent')

    expect(() => {
      assertViewModelProperty(viewModel, 'nonExistent', 'bind-value', element)
    }).toThrow(PropertyValidationError)
  })

  it('should include view model name in error', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('div')

    expect(() => {
      assertViewModelProperty(viewModel, 'missing', 'if', element)
    }).toThrow(PropertyValidationError)
  })

  it('should include binding type in error', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('div')

    expect(() => {
      assertViewModelProperty(viewModel, 'missing', 'bind-class', element)
    }).toThrow(PropertyValidationError)
  })

  it('should include element snippet in error', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('div')
    element.className = 'test-class'
    element.id = 'test-id'

    expect(() => {
      assertViewModelProperty(viewModel, 'missing', 'bind-style', element)
    }).toThrow(PropertyValidationError)
  })

  it('should truncate snippet if too long', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('div')
    element.innerHTML = 'a'.repeat(200)

    expect(() => {
      assertViewModelProperty(viewModel, 'missing', 'bind-value', element)
    }).toThrow()

    try {
      assertViewModelProperty(viewModel, 'missing', 'bind-value', element)
    } catch (error: any) {
      expect(error.message.length).toBeLessThan(300)
    }
  })

  it('should allow inherited properties', () => {
    class Parent {
      parentProp = 'parent'
    }
    class Child extends Parent {
      childProp = 'child'
    }

    const viewModel = new Child()
    const element = document.createElement('div')

    expect(() => {
      assertViewModelProperty(viewModel, 'parentProp', 'bind-value', element)
    }).not.toThrow()

    expect(() => {
      assertViewModelProperty(viewModel, 'childProp', 'bind-value', element)
    }).not.toThrow()
  })

  it('should support nested properties with dot notation', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('div')

    expect(() => {
      assertViewModelProperty(viewModel, 'user.name', 'bind-value', element)
    }).not.toThrow()
  })

  it('should support deeply nested properties', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('div')

    expect(() => {
      assertViewModelProperty(viewModel, 'user.profile.bio', 'bind-value', element)
    }).not.toThrow()
  })

  it('should throw error if nested property path is invalid', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('div')

    expect(() => {
      assertViewModelProperty(viewModel, 'user.missing', 'bind-value', element)
    }).toThrow('[pelela] Unknown property "user.missing"')
  })

  it('should throw error if intermediate property is null', () => {
    const viewModel = { user: null as any }
    const element = document.createElement('div')

    expect(() => {
      assertViewModelProperty(viewModel, 'user.name', 'bind-value', element)
    }).toThrow('[pelela] Unknown property "user.name"')
  })
})
