import { describe, expect, it } from 'vitest'
import { t } from '../commons/i18n'
import { ForEachMethodScopeError } from '../errors/ForEachMethodScopeError'
import { testHelpers } from '../test/helpers'
import { createExtendedViewModel } from './bindForEach'
import { resolveForEachMethodValue } from './forEachMethodBinding'
import type { ViewModel } from './types'

const METHOD_NAME = 'isSelected'
const ITEM_NAME = 'product'
const INDEX_NAME = 'position'
const UNSAFE_KEY = '__proto__'
const PLAIN_PROPERTY_NAME = 'selectedId'

interface Product {
  id: number
  name: string
}

interface SelectionScope {
  product: Product
  position?: number
}

class ProductListViewModel {
  [key: string]: unknown
  products: Product[] = [
    { id: 1, name: 'Apple' },
    { id: 2, name: 'Banana' },
  ]
  selectedId = 2;

  [METHOD_NAME]({ product }: SelectionScope): boolean {
    return product.id === this.selectedId
  }
}

function createScope(
  parentViewModel: ViewModel,
  item: unknown,
  indexName: string | null = INDEX_NAME,
): ViewModel {
  return createExtendedViewModel({
    parentViewModel,
    itemName: ITEM_NAME,
    itemRef: { current: item },
    indexName,
    indexRef: { current: 3 },
  })
}

const { catchError } = testHelpers

describe('resolveForEachMethodValue', () => {
  it('passes the iteration item and index using the for-each names as keys', () => {
    let receivedArgument: unknown
    class CaptureViewModel {
      [key: string]: unknown

      [METHOD_NAME](selection: SelectionScope): boolean {
        receivedArgument = selection
        return true
      }
    }
    const product = { id: 1, name: 'Apple' }
    const scope = createScope(new CaptureViewModel(), product)

    resolveForEachMethodValue(scope, METHOD_NAME)

    expect(receivedArgument).toEqual({ [ITEM_NAME]: product, [INDEX_NAME]: 3 })
  })

  it('omits the index key when the for-each declares no index', () => {
    let receivedArgument: unknown
    class CaptureViewModel {
      [key: string]: unknown

      [METHOD_NAME](selection: SelectionScope): boolean {
        receivedArgument = selection
        return true
      }
    }
    const product = { id: 1, name: 'Apple' }
    const scope = createScope(new CaptureViewModel(), product, null)

    resolveForEachMethodValue(scope, METHOD_NAME)

    expect(receivedArgument).toEqual({ [ITEM_NAME]: product })
  })

  it('evaluates the method against the current iteration item', () => {
    const parentViewModel = new ProductListViewModel()
    const scope = createScope(parentViewModel, parentViewModel.products[1])

    expect(resolveForEachMethodValue(scope, METHOD_NAME)).toBe(true)
  })

  it('reads view model state through the scope proxy', () => {
    const parentViewModel = new ProductListViewModel()
    parentViewModel.selectedId = 99
    const scope = createScope(parentViewModel, parentViewModel.products[1])

    expect(resolveForEachMethodValue(scope, METHOD_NAME)).toBe(false)
  })

  it('invokes the method with the extended view model as this', () => {
    let receivedContext: unknown
    class ContextViewModel {
      [key: string]: unknown

      [METHOD_NAME](this: ContextViewModel): boolean {
        receivedContext = this
        return true
      }
    }
    const scope = createScope(new ContextViewModel(), { id: 1, name: 'Apple' })

    resolveForEachMethodValue(scope, METHOD_NAME)

    expect(receivedContext).toBe(scope)
  })

  it('throws ForEachMethodScopeError when the view model is not a for-each scope', () => {
    const viewModel = new ProductListViewModel()

    const error = catchError<ForEachMethodScopeError>(() =>
      resolveForEachMethodValue(viewModel, METHOD_NAME),
    )

    expect(error).toBeInstanceOf(ForEachMethodScopeError)
    expect(error.methodName).toBe(METHOD_NAME)
    expect(error.viewModelName).toBe('ProductListViewModel')
    expect(error.message).toBe(
      t('errors.properties.forEachMethodScope', {
        name: METHOD_NAME,
        viewModel: 'ProductListViewModel',
      }),
    )
  })

  it('throws ForEachMethodScopeError when the member is a plain property instead of a method', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1, name: 'Apple' })

    const error = catchError<ForEachMethodScopeError>(() =>
      resolveForEachMethodValue(scope, PLAIN_PROPERTY_NAME),
    )

    expect(error).toBeInstanceOf(ForEachMethodScopeError)
    expect(error.methodName).toBe(PLAIN_PROPERTY_NAME)
  })

  it('throws ForEachMethodScopeError for an unsafe method name', () => {
    const scope = createScope(new ProductListViewModel(), { id: 1, name: 'Apple' })

    const error = catchError<ForEachMethodScopeError>(() =>
      resolveForEachMethodValue(scope, UNSAFE_KEY),
    )

    expect(error).toBeInstanceOf(ForEachMethodScopeError)
  })

  it('throws ForEachMethodScopeError when the iteration variable name is unsafe', () => {
    const parentViewModel = new ProductListViewModel()
    const scope = createExtendedViewModel({
      parentViewModel,
      itemName: UNSAFE_KEY,
      itemRef: { current: parentViewModel.products[0] },
      indexName: null,
      indexRef: { current: 0 },
    })

    const error = catchError<ForEachMethodScopeError>(() =>
      resolveForEachMethodValue(scope, METHOD_NAME),
    )

    expect(error).toBeInstanceOf(ForEachMethodScopeError)
  })
})
