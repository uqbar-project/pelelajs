import { describe, expect, it } from 'vitest'
import { createExtendedViewModel } from '../bindings/bindForEach'
import type { ViewModel } from '../bindings/types'
import { extractElementSnippet } from '../commons/helpers'
import { t } from '../commons/i18n'
import { ForEachMethodArityError, MethodAsPropertyError } from '../errors/index'
import { testHelpers } from '../test/helpers'
import {
  assertForEachMethodBinding,
  assertNoForEachMethodInTwoWayBinding,
  isForEachMethodBinding,
} from './assertForEachMethodBinding'

const METHOD_NAME = 'isSelected'
const TWO_PARAM_METHOD_NAME = 'compareProducts'
const NO_PARAM_METHOD_NAME = 'resetSelection'
const ARROW_NAME = 'isSelectedArrow'
const PLAIN_PROPERTY_NAME = 'selectedId'
const ITEM_NAME = 'product'
const INDEX_NAME = 'position'
const UNSAFE_KEY = '__proto__'
const VIEW_MODEL_NAME = 'ProductListViewModel'

interface Product {
  id: number
}

interface SelectionScope {
  product: Product
  position?: number
}

class ProductListViewModel {
  [key: string]: unknown
  products: Product[] = [{ id: 1 }, { id: 2 }]
  selectedId = 2;

  [METHOD_NAME]({ product }: SelectionScope): boolean {
    return product.id === this.selectedId
  }

  [TWO_PARAM_METHOD_NAME](first: SelectionScope, second: SelectionScope): boolean {
    return first.product.id === second.product.id
  }

  [NO_PARAM_METHOD_NAME](): void {}

  [ARROW_NAME] = (_scope: SelectionScope): boolean => true
}

function createScope(
  parentViewModel: ViewModel,
  item: unknown,
  itemName: string = ITEM_NAME,
  indexName: string | null = INDEX_NAME,
): ViewModel {
  return createExtendedViewModel({
    parentViewModel,
    itemName,
    itemRef: { current: item },
    indexName,
    indexRef: { current: 0 },
  })
}

function createElement(attribute: string, value: string): HTMLElement {
  const element = document.createElement('div')
  element.setAttribute(attribute, value)
  return element
}

const { catchError } = testHelpers

describe('isForEachMethodBinding', () => {
  it('returns true for a prototype method named by a binding inside a for-each', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1 })

    expect(isForEachMethodBinding(scope, METHOD_NAME)).toBe(true)
  })

  it('returns false outside a for-each scope', () => {
    expect(isForEachMethodBinding(new ProductListViewModel(), METHOD_NAME)).toBe(false)
  })

  it('returns false for the iteration variable even when it shadows nothing', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1 })

    expect(isForEachMethodBinding(scope, ITEM_NAME)).toBe(false)
  })

  it('returns false for the index variable', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1 })

    expect(isForEachMethodBinding(scope, INDEX_NAME)).toBe(false)
  })

  it('returns false for a plain property', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1 })

    expect(isForEachMethodBinding(scope, PLAIN_PROPERTY_NAME)).toBe(false)
  })

  it('returns false for an arrow function field', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1 })

    expect(isForEachMethodBinding(scope, ARROW_NAME)).toBe(false)
  })

  it('returns false for nested paths', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1 })

    expect(isForEachMethodBinding(scope, `${ITEM_NAME}.id`)).toBe(false)
  })

  it('returns false for unsafe keys', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1 })

    expect(isForEachMethodBinding(scope, UNSAFE_KEY)).toBe(false)
  })

  it('resolves methods through nested for-each scopes', () => {
    const outerScope = createScope(new ProductListViewModel(), { id: 1 })
    const innerScope = createScope(outerScope, { id: 2 }, 'row')

    expect(isForEachMethodBinding(innerScope, METHOD_NAME)).toBe(true)
  })

  it('prefers an outer iteration variable over a same-named root method', () => {
    class ShadowingViewModel {
      [key: string]: unknown

      [ITEM_NAME](): boolean {
        return true
      }
    }
    const outerScope = createScope(new ShadowingViewModel(), { id: 1 })
    const innerScope = createScope(outerScope, { id: 2 }, 'row')

    expect(isForEachMethodBinding(innerScope, ITEM_NAME)).toBe(false)
  })
})

describe('assertForEachMethodBinding', () => {
  it('does not throw for a method with exactly one parameter', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1 })
    const element = createElement('bind-content', METHOD_NAME)

    expect(() => {
      assertForEachMethodBinding(scope, METHOD_NAME, 'bind-content', element)
    }).not.toThrow()
  })

  it('throws ForEachMethodArityError for a method with two parameters', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1 })
    const element = createElement('bind-content', TWO_PARAM_METHOD_NAME)

    const error = catchError<ForEachMethodArityError>(() =>
      assertForEachMethodBinding(scope, TWO_PARAM_METHOD_NAME, 'bind-content', element),
    )

    expect(error).toBeInstanceOf(ForEachMethodArityError)
    expect(error.methodName).toBe(TWO_PARAM_METHOD_NAME)
    expect(error.bindingKind).toBe('bind-content')
    expect(error.viewModelName).toBe(VIEW_MODEL_NAME)
    expect(error.actualParams).toBe(2)
    expect(error.message).toBe(
      t('errors.properties.forEachMethodArity', {
        name: TWO_PARAM_METHOD_NAME,
        count: 2,
        viewModel: VIEW_MODEL_NAME,
        snippet: extractElementSnippet(element),
      }),
    )
  })

  it('throws ForEachMethodArityError for a method without parameters', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1 })
    const element = createElement('bind-content', NO_PARAM_METHOD_NAME)

    const error = catchError<ForEachMethodArityError>(() =>
      assertForEachMethodBinding(scope, NO_PARAM_METHOD_NAME, 'bind-content', element),
    )

    expect(error).toBeInstanceOf(ForEachMethodArityError)
    expect(error.actualParams).toBe(0)
  })
})

describe('assertNoForEachMethodInTwoWayBinding', () => {
  it('does not throw for a plain property', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1 })
    const element = createElement('link-selected', PLAIN_PROPERTY_NAME)

    expect(() => {
      assertNoForEachMethodInTwoWayBinding(scope, PLAIN_PROPERTY_NAME, 'link', element)
    }).not.toThrow()
  })

  it('throws MethodAsPropertyError for a method inside a for-each', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1 })
    const element = createElement('link-selected', METHOD_NAME)

    const error = catchError<MethodAsPropertyError>(() =>
      assertNoForEachMethodInTwoWayBinding(scope, METHOD_NAME, 'link', element),
    )

    expect(error).toBeInstanceOf(MethodAsPropertyError)
    expect(error.propertyName).toBe(METHOD_NAME)
    expect(error.bindingKind).toBe('link')
  })
})
