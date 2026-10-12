import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { extractElementSnippet } from '../commons/helpers'
import { initializeI18n, t } from '../commons/i18n'
import { ForEachMethodArityError, FunctionAsPropertyError, MethodAsPropertyError } from '../errors'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { clearComponentRegistry, defineComponent } from '../registry/componentRegistry'
import { testHelpers } from '../test/helpers'
import type { PelelaElement } from '../types'
import { renderClassBindings, setupClassBindings } from './bindClass'
import { renderComponentBindings, setupComponentBindings } from './bindComponent'
import { renderContentBindings, setupContentBindings } from './bindContent'
import { createExtendedViewModel, setupSingleForEachBinding } from './bindForEach'
import { renderIfBindings, setupIfBindings } from './bindIf'
import { setupValueBindings } from './bindValue'
import { setupBindings } from './setupBindings'
import type { ViewModel } from './types'

const METHOD_NAME = 'isSelected'
const ROW_CLASS_METHOD_NAME = 'rowClass'
const VISIBILITY_METHOD_NAME = 'isVisible'
const TWO_PARAM_METHOD_NAME = 'compareProducts'
const ITEM_NAME = 'product'
const INDEX_NAME = 'position'

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

  [ROW_CLASS_METHOD_NAME]({ product }: SelectionScope): string {
    return product.id === this.selectedId ? 'selected' : ''
  }

  [VISIBILITY_METHOD_NAME]({ product }: SelectionScope): boolean {
    return product.id === this.selectedId
  }

  [TWO_PARAM_METHOD_NAME](first: SelectionScope, second: SelectionScope): boolean {
    return first.product.id === second.product.id
  }
}

class ProductRowViewModel {
  product: Product | null = null
  isSelected = false
}

function createScope(parentViewModel: ViewModel, item: Product): ViewModel {
  return createExtendedViewModel({
    parentViewModel,
    itemName: ITEM_NAME,
    itemRef: { current: item },
    indexName: INDEX_NAME,
    indexRef: { current: 0 },
  })
}

const { catchError } = testHelpers

describe('for-each method bindings', () => {
  let container: HTMLElement

  beforeEach(() => {
    initializeI18n('en')
    container = document.createElement('div')
    document.body.appendChild(container)
    clearComponentRegistry()
  })

  afterEach(() => {
    container.remove()
    clearComponentRegistry()
  })

  it('renders bind-content from a method evaluated with the iteration scope', () => {
    const parentViewModel = new ProductListViewModel()
    container.innerHTML = `<span bind-content="${METHOD_NAME}"></span>`
    const scope = createScope(parentViewModel, parentViewModel.products[1])

    const bindings = setupContentBindings(container, scope)
    renderContentBindings(bindings, scope)

    expect(bindings).toHaveLength(1)
    expect(bindings[0].isMethodBinding).toBe(true)
    expect(container.querySelector('span')?.textContent).toBe('true')
  })

  it('renders bind-class from a method evaluated with the iteration scope', () => {
    const parentViewModel = new ProductListViewModel()
    container.innerHTML = `<span class="row" bind-class="${ROW_CLASS_METHOD_NAME}"></span>`
    const scope = createScope(parentViewModel, parentViewModel.products[0])

    const bindings = setupClassBindings(container, scope)
    renderClassBindings(bindings, scope)

    expect(container.querySelector('span')?.className).toBe('row')
  })

  it('toggles visibility from a method evaluated with the iteration scope', () => {
    const parentViewModel = new ProductListViewModel()
    container.innerHTML = `<span if="${VISIBILITY_METHOD_NAME}">visible</span>`
    const scope = createScope(parentViewModel, parentViewModel.products[0])

    const bindings = setupIfBindings(container, scope)
    renderIfBindings(bindings, scope)

    expect(container.querySelector('span')?.style.display).toBe('none')
  })

  it('passes the evaluated method result to a child component per iteration (issue #201)', () => {
    defineComponent(
      'product-row',
      ProductRowViewModel,
      '<component view-model="ProductRowViewModel"><span bind-content="isSelected"></span></component>',
    )
    container.innerHTML = `
      <div for-each="${ITEM_NAME} of products" index="${INDEX_NAME}">
        <product-row prop-product="${ITEM_NAME}" prop-is-selected="${METHOD_NAME}"></product-row>
      </div>
    `
    const parentViewModel = createReactiveViewModel(new ProductListViewModel(), () => {})

    setupBindings(container, parentViewModel)

    const rows = Array.from(container.querySelectorAll('product-row'))
    expect(rows).toHaveLength(2)
    const childViewModels = rows.map(
      (row) =>
        (row as PelelaElement<Record<string, unknown>>).__pelelaViewModel.isSelected as boolean,
    )
    expect(childViewModels).toEqual([false, true])
  })

  it('re-evaluates the child prop when the for-each re-renders', () => {
    defineComponent(
      'product-row',
      ProductRowViewModel,
      '<component view-model="ProductRowViewModel"><span bind-content="isSelected"></span></component>',
    )
    container.innerHTML = `
      <div for-each="${ITEM_NAME} of products" index="${INDEX_NAME}">
        <product-row prop-product="${ITEM_NAME}" prop-is-selected="${METHOD_NAME}"></product-row>
      </div>
    `
    const rootViewModel = new ProductListViewModel()
    const parentViewModel = createReactiveViewModel(rootViewModel, () => {})

    const render = setupBindings(container, parentViewModel)
    rootViewModel.selectedId = 1
    render('selectedId')

    const rows = Array.from(container.querySelectorAll('product-row'))
    const childViewModels = rows.map(
      (row) =>
        (row as PelelaElement<Record<string, unknown>>).__pelelaViewModel.isSelected as boolean,
    )
    expect(childViewModels).toEqual([true, false])
  })

  it('throws ForEachMethodArityError when the method declares two parameters', () => {
    const parentViewModel = new ProductListViewModel()
    container.innerHTML = `<span bind-content="${TWO_PARAM_METHOD_NAME}"></span>`
    const span = container.querySelector('span') as HTMLSpanElement
    const scope = createScope(parentViewModel, parentViewModel.products[0])

    const error = catchError<ForEachMethodArityError>(() => setupContentBindings(container, scope))

    expect(error).toBeInstanceOf(ForEachMethodArityError)
    expect(error.message).toBe(
      t('errors.properties.forEachMethodArity', {
        name: TWO_PARAM_METHOD_NAME,
        count: 2,
        viewModel: 'ProductListViewModel',
        snippet: extractElementSnippet(span),
      }),
    )
  })

  it('keeps throwing MethodAsPropertyError for methods outside a for-each', () => {
    const parentViewModel = new ProductListViewModel()
    container.innerHTML = `<span bind-content="${METHOD_NAME}"></span>`

    const error = catchError<MethodAsPropertyError>(() =>
      setupContentBindings(container, parentViewModel),
    )

    expect(error).toBeInstanceOf(MethodAsPropertyError)
  })

  it('keeps rejecting methods in bind-value even inside a for-each', () => {
    const parentViewModel = new ProductListViewModel()
    container.innerHTML = `<input type="text" bind-value="${METHOD_NAME}">`
    const scope = createScope(parentViewModel, parentViewModel.products[0])

    const error = catchError<FunctionAsPropertyError>(() => setupValueBindings(container, scope))

    expect(error).toBeInstanceOf(FunctionAsPropertyError)
  })

  it('rejects methods in link-* inside a for-each instead of copying the reference', () => {
    defineComponent(
      'linked-row',
      ProductRowViewModel,
      '<component view-model="ProductRowViewModel"></component>',
    )
    container.innerHTML = `
      <div for-each="${ITEM_NAME} of products">
        <linked-row link-is-selected="${METHOD_NAME}"></linked-row>
      </div>
    `
    const parentViewModel = createReactiveViewModel(new ProductListViewModel(), () => {})

    const error = catchError<MethodAsPropertyError>(() => setupBindings(container, parentViewModel))

    expect(error).toBeInstanceOf(MethodAsPropertyError)
    expect(error.bindingKind).toBe('link')
  })

  it('marks component mappings so render re-resolves the method value', () => {
    defineComponent(
      'product-row',
      ProductRowViewModel,
      '<component view-model="ProductRowViewModel"></component>',
    )
    container.innerHTML = `<product-row prop-is-selected="${METHOD_NAME}"></product-row>`
    const parentViewModel = new ProductListViewModel()
    const scope = createScope(parentViewModel, parentViewModel.products[1])

    const bindings = setupComponentBindings(container, scope)

    expect(bindings).toHaveLength(1)
    expect(bindings[0].mappings).toEqual([
      { parentKey: METHOD_NAME, childKey: 'isSelected', isMethodBinding: true },
    ])
    renderComponentBindings(bindings, scope)
    const childViewModel = bindings[0].childViewModel as unknown as ProductRowViewModel
    expect(childViewModel.isSelected).toBe(true)
  })

  describe('for-each template scan', () => {
    function scanTemplate(innerHtml: string): boolean | undefined {
      container.innerHTML = innerHtml
      const element = container.querySelector('[for-each]') as HTMLElement
      return setupSingleForEachBinding(element, new ProductListViewModel())?.hasMethodBindings
    }

    it('marks the loop when its template invokes a method', () => {
      const hasMethodBindings = scanTemplate(`
        <div for-each="${ITEM_NAME} of products" index="${INDEX_NAME}">
          <span bind-content="${METHOD_NAME}"></span>
        </div>
      `)

      expect(hasMethodBindings).toBe(true)
    })

    it('does not mark the loop for plain item paths', () => {
      const hasMethodBindings = scanTemplate(`
        <div for-each="${ITEM_NAME} of products" index="${INDEX_NAME}">
          <span bind-content="${ITEM_NAME}.id"></span>
        </div>
      `)

      expect(hasMethodBindings).toBe(false)
    })

    it('does not mark the loop for event handlers alone', () => {
      const hasMethodBindings = scanTemplate(`
        <div for-each="${ITEM_NAME} of products" index="${INDEX_NAME}">
          <button click="${METHOD_NAME}">save</button>
        </div>
      `)

      expect(hasMethodBindings).toBe(false)
    })
  })
})
