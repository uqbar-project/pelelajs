import { describe, expect, it } from 'vitest'
import { ELEMENT_SNIPPET_MAX_LENGTH, extractElementSnippet } from '../commons/helpers'
import { t } from '../commons/i18n'
import {
  ArrowFunctionAsPropertyError,
  FunctionAsPropertyError,
  MethodAsPropertyError,
  PropertyCaseMismatchError,
  PropertyValidationError,
} from '../errors/index'
import { testHelpers } from '../test/helpers'
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

const { catchError } = testHelpers

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

    const error = catchError<PropertyValidationError>(() =>
      assertViewModelProperty(viewModel, 'missingProperty', 'bind-content', element),
    )

    expect(error).toBeInstanceOf(PropertyValidationError)
    expect(error.elementSnippet).toContain('<button click="missingAction">')
  })

  it('should truncate snippet if too long', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('div')
    element.innerHTML = 'a'.repeat(200)

    const error = catchError<PropertyValidationError>(() =>
      assertViewModelProperty(viewModel, 'missing', 'bind-value', element),
    )

    expect(error).toBeInstanceOf(PropertyValidationError)
    expect(error.elementSnippet).toBe(extractElementSnippet(element))
    expect(error.elementSnippet.length).toBeLessThanOrEqual(ELEMENT_SNIPPET_MAX_LENGTH)
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

    const error = catchError<PropertyValidationError>(() =>
      assertViewModelProperty(viewModel, 'user.missing', 'bind-value', element),
    )

    expect(error).toBeInstanceOf(PropertyValidationError)
    expect(error.propertyName).toBe('user.missing')
  })

  /**
   * Pelela is resilient and allows partial data/async loading.
   * If an intermediate property is null, we don't throw a validation error,
   * as the data might be populated later (e.g. from an API).
   */
  it('should allow partial data (null intermediate properties) to support async loading states', () => {
    const viewModel = { user: null as unknown as object }
    const element = document.createElement('div')

    expect(() => {
      assertViewModelProperty(viewModel, 'user.name', 'bind-value', element)
    }).not.toThrow()
  })

  it('should allow null at level 2 (user.profile = null) to support async loading states', () => {
    const viewModel = { user: { profile: null as unknown as object } }
    const element = document.createElement('div')

    expect(() => {
      assertViewModelProperty(viewModel, 'user.profile.bio', 'bind-value', element)
    }).not.toThrow()
  })

  it('should not use fast path for dotted properties that exist as literal keys: eg. "user.name" when user does not exist', () => {
    const viewModel = { 'user.name': 'literal value' }
    const element = document.createElement('div')

    const error = catchError<PropertyValidationError>(() =>
      assertViewModelProperty(viewModel, 'user.name', 'bind-value', element),
    )

    expect(error).toBeInstanceOf(PropertyValidationError)
    expect(error.propertyName).toBe('user.name')
  })

  it('should throw MethodAsPropertyError when the referenced member is a method, not a bindable property', () => {
    class ViewModelWithMethod {
      handleEvent(): void {}
    }
    const viewModel = new ViewModelWithMethod()
    const element = document.createElement('div')
    element.setAttribute('bind-content', 'handleEvent')

    const error = catchError<MethodAsPropertyError>(() =>
      assertViewModelProperty(viewModel, 'handleEvent', 'bind-content', element),
    )

    expect(error).toBeInstanceOf(MethodAsPropertyError)
    expect(error.propertyName).toBe('handleEvent')
    expect(error.bindingKind).toBe('bind-content')
    expect(error.viewModelName).toBe('ViewModelWithMethod')
  })

  it('should throw MethodAsPropertyError when the method is inherited from a base class', () => {
    class BaseViewModel {
      handleClick(): void {}
    }
    class DerivedViewModel extends BaseViewModel {}
    const viewModel = new DerivedViewModel()
    const element = document.createElement('div')
    element.setAttribute('bind-content', 'handleClick')

    const error = catchError<MethodAsPropertyError>(() =>
      assertViewModelProperty(viewModel, 'handleClick', 'bind-content', element),
    )

    expect(error).toBeInstanceOf(MethodAsPropertyError)
    expect(error.propertyName).toBe('handleClick')
    expect(error.bindingKind).toBe('bind-content')
    expect(error.viewModelName).toBe('DerivedViewModel')
  })

  it('should throw FunctionAsPropertyError for a function reachable only through a proxy member without a resolved descriptor', () => {
    const viewModel = new Proxy(
      {},
      {
        has: (_target, key) => key === 'phantomHandler',
        get: (target, key) =>
          key === 'phantomHandler' ? function phantomHandler() {} : Reflect.get(target, key),
      },
    ) as object
    const element = document.createElement('div')
    element.setAttribute('bind-content', 'phantomHandler')

    const error = catchError<FunctionAsPropertyError>(() =>
      assertViewModelProperty(viewModel, 'phantomHandler', 'bind-content', element),
    )

    expect(error).toBeInstanceOf(FunctionAsPropertyError)
    expect(error.propertyName).toBe('phantomHandler')
  })

  it('should throw ArrowFunctionAsPropertyError when the referenced member is an arrow function field of the view model class', () => {
    class ViewModelWithArrow {
      handleEvent = () => {}
    }
    const viewModel = new ViewModelWithArrow()
    const element = document.createElement('div')
    element.setAttribute('bind-content', 'handleEvent')

    const error = catchError<ArrowFunctionAsPropertyError>(() =>
      assertViewModelProperty(viewModel, 'handleEvent', 'bind-content', element),
    )

    expect(error).toBeInstanceOf(ArrowFunctionAsPropertyError)
    expect(error.propertyName).toBe('handleEvent')
    expect(error.bindingKind).toBe('bind-content')
    expect(error.viewModelName).toBe('ViewModelWithArrow')
  })

  it('should throw FunctionAsPropertyError when the referenced member is a getter that returns a function', () => {
    class ViewModelWithGetterReturningFunction {
      get callback() {
        return () => {}
      }
    }
    const viewModel = new ViewModelWithGetterReturningFunction()
    const element = document.createElement('div')
    element.setAttribute('bind-content', 'callback')

    const error = catchError<FunctionAsPropertyError>(() =>
      assertViewModelProperty(viewModel, 'callback', 'bind-content', element),
    )

    expect(error).toBeInstanceOf(FunctionAsPropertyError)
    expect(error.propertyName).toBe('callback')
    expect(error.bindingKind).toBe('bind-content')
    expect(error.viewModelName).toBe('ViewModelWithGetterReturningFunction')
  })

  it('should throw FunctionAsPropertyError when the referenced member is an instance function field', () => {
    class ViewModelWithFunctionField {
      handleValue = function handleValue() {}
    }
    const viewModel = new ViewModelWithFunctionField()
    const element = document.createElement('div')
    element.setAttribute('bind-content', 'handleValue')

    const error = catchError<FunctionAsPropertyError>(() =>
      assertViewModelProperty(viewModel, 'handleValue', 'bind-content', element),
    )

    expect(error).toBeInstanceOf(FunctionAsPropertyError)
    expect(error.propertyName).toBe('handleValue')
    expect(error.bindingKind).toBe('bind-content')
    expect(error.viewModelName).toBe('ViewModelWithFunctionField')
  })

  it('should throw FunctionAsPropertyError when the referenced property is a nested function value', () => {
    class ViewModelWithNestedFunction {
      user = { callback: function callback() {} }
    }
    const viewModel = new ViewModelWithNestedFunction()
    const element = document.createElement('div')
    element.setAttribute('bind-content', 'user.callback')

    const error = catchError<FunctionAsPropertyError>(() =>
      assertViewModelProperty(viewModel, 'user.callback', 'bind-content', element),
    )

    expect(error).toBeInstanceOf(FunctionAsPropertyError)
    expect(error.propertyName).toBe('user.callback')
    expect(error.bindingKind).toBe('bind-content')
    expect(error.viewModelName).toBe('ViewModelWithNestedFunction')
  })

  it('should throw ArrowFunctionAsPropertyError when the referenced member is an async arrow function field', () => {
    class ViewModelWithAsyncArrowField {
      loadData = async () => {}
    }
    const viewModel = new ViewModelWithAsyncArrowField()
    const element = document.createElement('div')
    element.setAttribute('bind-content', 'loadData')

    const error = catchError<ArrowFunctionAsPropertyError>(() =>
      assertViewModelProperty(viewModel, 'loadData', 'bind-content', element),
    )

    expect(error).toBeInstanceOf(ArrowFunctionAsPropertyError)
    expect(error.propertyName).toBe('loadData')
    expect(error.bindingKind).toBe('bind-content')
    expect(error.viewModelName).toBe('ViewModelWithAsyncArrowField')
  })

  it('should throw FunctionAsPropertyError when the referenced member is an async function field', () => {
    class ViewModelWithAsyncFunctionField {
      loadData = async function loadData() {}
    }
    const viewModel = new ViewModelWithAsyncFunctionField()
    const element = document.createElement('div')
    element.setAttribute('bind-content', 'loadData')

    const error = catchError<FunctionAsPropertyError>(() =>
      assertViewModelProperty(viewModel, 'loadData', 'bind-content', element),
    )

    expect(error).toBeInstanceOf(FunctionAsPropertyError)
    expect(error.propertyName).toBe('loadData')
    expect(error.viewModelName).toBe('ViewModelWithAsyncFunctionField')
  })

  it('should throw FunctionAsPropertyError when the referenced member is a function created with bind()', () => {
    class ViewModelWithBoundFunctionField {
      bound = function handleValue() {}.bind(this)
    }
    const viewModel = new ViewModelWithBoundFunctionField()
    const element = document.createElement('div')
    element.setAttribute('bind-content', 'bound')

    const error = catchError<FunctionAsPropertyError>(() =>
      assertViewModelProperty(viewModel, 'bound', 'bind-content', element),
    )

    expect(error).toBeInstanceOf(FunctionAsPropertyError)
    expect(error.propertyName).toBe('bound')
    expect(error.viewModelName).toBe('ViewModelWithBoundFunctionField')
  })

  it('should throw PropertyCaseMismatchError when only the case differs from an existing property', () => {
    const viewModel = new TestViewModel()
    const element = document.createElement('div')
    element.setAttribute('bind-content', 'ExistingProperty')
    element.innerHTML = '<span>Content</span>'

    const error = catchError<PropertyCaseMismatchError>(() =>
      assertViewModelProperty(viewModel, 'ExistingProperty', 'bind-content', element),
    )

    expect(error).toBeInstanceOf(PropertyCaseMismatchError)
    expect(error.suggestedName).toBe('existingProperty')
    expect(error.bindingKind).toBe('bind-content')
    expect(error.elementSnippet).toContain('<div bind-content="ExistingProperty">')
    expect(error.message).toBe(
      t('errors.properties.caseMismatch', {
        name: 'ExistingProperty',
        kind: 'bind-content',
        snippet: error.elementSnippet,
        viewModel: 'TestViewModel',
        suggestedName: 'existingProperty',
      }),
    )
  })
})
