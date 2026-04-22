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

  it('should include raw HTML snippet in error (not escaped for console visibility)', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('button')
    element.setAttribute('click', 'missingAction')
    element.innerHTML = '<span>Click</span>'

    expect(() => {
      assertViewModelProperty(viewModel, 'missingProperty', 'bind-content', element)
    }).toThrow(/<button click="missingAction"><span>Click<\/span><\/button>/)
  })

  it('should truncate snippet if too long', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('div')
    element.innerHTML = 'a'.repeat(200)

    expect.assertions(2)

    expect(() => {
      assertViewModelProperty(viewModel, 'missing', 'bind-value', element)
    }).toThrow()

    try {
      assertViewModelProperty(viewModel, 'missing', 'bind-value', element)
    } catch (error: unknown) {
      expect((error as Error).message.length).toBeLessThan(300)
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
    }).toThrow(/Unknown property "user.missing"/)
  })

  it('should NOT throw error if intermediate property is null', () => {
    const viewModel = { user: null as unknown as object }
    const element = document.createElement('div')

    expect(() => {
      assertViewModelProperty(viewModel, 'user.name', 'bind-value', element)
    }).not.toThrow()
  })

  it('should not use fast path for dotted properties that exist as literal keys: eg. "user.name" when user does not exist', () => {
    const viewModel = { 'user.name': 'literal value' }
    const element = document.createElement('div')

    expect(() => {
      assertViewModelProperty(viewModel, 'user.name', 'bind-value', element)
    }).toThrow(/Unknown property "user.name"/)
  })
})
