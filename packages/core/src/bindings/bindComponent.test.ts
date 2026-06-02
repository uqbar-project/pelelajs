import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initializeI18n, t } from '../commons/i18n'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { clearComponentRegistry, defineComponent } from '../registry/componentRegistry'
import type { PelelaElement } from '../types'
import { renderComponentBindings, setupComponentBindings } from './bindComponent'
import { setupBindings } from './setupBindings'
import type { ComponentBinding, ViewModel } from './types'

describe('bindComponent', () => {
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

  describe('nested properties reactivity', () => {
    it('should initialize child component with a nested parent property path (prop-errors="bet.errors")', () => {
      class ChildVM {
        errors: string[] = []
      }
      defineComponent(
        'error-list',
        ChildVM,
        '<component view-model="ChildVM"><span bind-content="errors"></span></component>',
      )

      container.innerHTML = '<error-list prop-errors="bet.errors"></error-list>'

      const parentVM = createReactiveViewModel(
        {
          bet: {
            errors: ['error1'],
          },
        },
        () => {},
      )

      const bindings = setupComponentBindings(container, parentVM)

      expect(bindings).toHaveLength(1)
      const childVM = bindings[0].childViewModel as unknown as ChildVM
      expect(childVM.errors).toEqual(['error1'])
    })

    it('should re-render child component when nested array prop is mutated via push()', () => {
      class ChildVM {
        errors: string[] = []
      }
      defineComponent('error-list', ChildVM, '<component view-model="ChildVM"></component>')

      container.innerHTML = '<error-list prop-errors="bet.errors"></error-list>'

      const parentVM = createReactiveViewModel(
        {
          bet: {
            errors: [] as string[],
          },
        },
        (path) => {
          render(path)
        },
      )

      const render = setupBindings(container, parentVM)

      const childEl = container.querySelector('error-list') as PelelaElement<ChildVM>
      const childVM = childEl.__pelelaViewModel

      expect(childVM.errors).toEqual([])

      parentVM.bet.errors.push('Debe ingresar monto')

      expect(childVM.errors).toEqual(['Debe ingresar monto'])
    })

    it('should re-render child component when nested array prop is cleared via length = 0', () => {
      class ChildVM {
        errors: string[] = []
      }
      defineComponent('error-list', ChildVM, '<component view-model="ChildVM"></component>')

      container.innerHTML = '<error-list prop-errors="bet.errors"></error-list>'

      const parentVM = createReactiveViewModel(
        {
          bet: {
            errors: ['Error 1', 'Error 2'] as string[],
          },
        },
        (path) => {
          render(path)
        },
      )

      const render = setupBindings(container, parentVM)

      const childEl = container.querySelector('error-list') as PelelaElement<ChildVM>
      const childVM = childEl.__pelelaViewModel

      expect(childVM.errors).toEqual(['Error 1', 'Error 2'])

      parentVM.bet.errors.length = 0

      expect(childVM.errors).toEqual([])
    })

    it('should re-render child DOM when nested array prop is mutated via push()', () => {
      class ChildVM {
        errors: string[] = []
      }
      defineComponent(
        'error-list',
        ChildVM,
        '<component view-model="ChildVM"><ul><li for-each="error of errors"><span bind-content="error"></span></li></ul></component>',
      )

      container.innerHTML = '<error-list prop-errors="bet.errors"></error-list>'

      const parentVM = createReactiveViewModel(
        {
          bet: {
            errors: [] as string[],
          },
        },
        (path) => {
          render(path)
        },
      )

      const render = setupBindings(container, parentVM)

      const childEl = container.querySelector('error-list') as PelelaElement<ChildVM>
      const listItems = childEl.querySelectorAll('li')

      expect(listItems.length).toBe(0)

      parentVM.bet.errors.push('Error 1')

      const updatedListItems = childEl.querySelectorAll('li')
      expect(updatedListItems.length).toBe(1)
      expect(updatedListItems[0].textContent).toBe('Error 1')
    })

    it('should propagate child changes to a nested parent property path with link-*', () => {
      class ChildVM {
        amount = ''
      }
      defineComponent('error-list', ChildVM, '<component view-model="ChildVM"></component>')

      container.innerHTML = '<error-list link-amount="bet.amount"></error-list>'

      const parentVM = createReactiveViewModel(
        {
          bet: {
            amount: '10',
          },
        },
        (path) => {
          render(path)
        },
      )

      const render = setupBindings(container, parentVM)

      const childEl = container.querySelector('error-list') as PelelaElement<ChildVM>
      const childVM = childEl.__pelelaViewModel

      expect(childVM.amount).toBe('10')

      childVM.amount = '20'

      expect(parentVM.bet.amount).toBe('20')
    })
  })

  it('should initialize component with parent properties', () => {
    class ChildVM {
      message = ''
    }
    defineComponent(
      'child-comp',
      ChildVM,
      '<component view-model="ChildVM"><span bind-content="message"></span></component>',
    )

    container.innerHTML = '<child-comp prop-message="parentMessage"></child-comp>'

    const parentVM = createReactiveViewModel(
      {
        parentMessage: 'Hello from parent',
      },
      () => {},
    )

    setupBindings(container, parentVM)

    const span = container.querySelector('span')
    expect(span?.innerHTML).toBe('Hello from parent')
  })

  it('should be reactive from parent to child (one-way)', () => {
    class ChildVM {
      count = 0
    }
    defineComponent(
      'counter-child',
      ChildVM,
      '<component view-model="ChildVM"><span bind-content="count"></span></component>',
    )

    container.innerHTML = '<counter-child prop-count="parentCount"></counter-child>'

    const parentVM = createReactiveViewModel(
      {
        parentCount: 10,
      },
      (path) => {
        render(path)
      },
    )

    const render = setupBindings(container, parentVM)

    const span = container.querySelector('span')
    expect(span?.innerHTML).toBe('10')

    parentVM.parentCount = 20

    expect(span?.innerHTML).toBe('20')
  })

  it('should be reactive from child to parent (bidirectional with link-)', () => {
    class ChildVM {
      val = ''
      update(newVal: string) {
        this.val = newVal
      }
    }
    defineComponent('input-child', ChildVM, '<component view-model="ChildVM"></component>')

    container.innerHTML = '<input-child link-val="parentVal"></input-child>'

    const parentVM = createReactiveViewModel(
      {
        parentVal: 'initial',
      },
      (path) => {
        render(path)
      },
    )

    const render = setupBindings(container, parentVM)

    const childEl = container.querySelector('input-child') as PelelaElement<ChildVM>
    const childVM = childEl.__pelelaViewModel

    childVM.val = 'changed'

    expect(parentVM.parentVal).toBe('changed')
  })

  it('should process the root element if it is a component itself', () => {
    class RootChildVM {
      val = ''
    }
    defineComponent(
      'root-child',
      RootChildVM,
      '<component view-model="RootChildVM"><span bind-content="val"></span></component>',
    )

    const rootElement = document.createElement('root-child')
    rootElement.setAttribute('prop-val', 'parentVal')

    const parentVM = createReactiveViewModel(
      {
        parentVal: 'root matched',
      },
      () => {},
    )

    const bindings = setupComponentBindings(rootElement, parentVM)

    expect(bindings).toHaveLength(1)
    expect(bindings[0].mappings).toHaveLength(1)
    expect(bindings[0].mappings[0].childKey).toBe('val')
    expect(bindings[0].mappings[0].parentKey).toBe('parentVal')
  })

  describe('prop-* prefix validation', () => {
    it('should throw error when component attribute lacks prop-* or link-* prefix', () => {
      class ChildVM {
        message = ''
      }
      defineComponent(
        'test-comp',
        ChildVM,
        '<component view-model="ChildVM"><span bind-content="message"></span></component>',
      )

      container.innerHTML = '<test-comp message="parentMessage"></test-comp>'

      const parentVM = createReactiveViewModel(
        {
          parentMessage: 'Hello',
        },
        () => {},
      )

      expect(() => {
        setupComponentBindings(container, parentVM)
      }).toThrow(
        t('errors.compiler.invalidComponentAttribute', {
          tag: 'test-comp',
          attr: 'message',
        }),
      )
    })

    it('should accept prop-* prefix for one-way binding', () => {
      class ChildVM {
        message = ''
      }
      defineComponent(
        'test-comp',
        ChildVM,
        '<component view-model="ChildVM"><span bind-content="message"></span></component>',
      )

      container.innerHTML = '<test-comp prop-message="parentMessage"></test-comp>'

      const parentVM = createReactiveViewModel(
        {
          parentMessage: 'Hello',
        },
        () => {},
      )

      const bindings = setupComponentBindings(container, parentVM)

      expect(bindings).toHaveLength(1)
      expect(bindings[0].mappings).toHaveLength(1)
      expect(bindings[0].mappings[0].childKey).toBe('message')
      expect(bindings[0].mappings[0].parentKey).toBe('parentMessage')
    })

    it('should accept link-* prefix for two-way binding', () => {
      class ChildVM {
        value = ''
      }
      defineComponent('test-comp', ChildVM, '<component view-model="ChildVM"></component>')

      container.innerHTML = '<test-comp link-value="parentValue"></test-comp>'

      const parentVM = createReactiveViewModel(
        {
          parentValue: 'test',
        },
        () => {},
      )

      const bindings = setupComponentBindings(container, parentVM)

      expect(bindings).toHaveLength(1)
      expect(bindings[0].mappings).toHaveLength(1)
      expect(bindings[0].mappings[0].childKey).toBe('value')
      expect(bindings[0].mappings[0].parentKey).toBe('parentValue')
    })

    it('should accept mix of prop-* and link-* prefixes', () => {
      class ChildVM {
        oneWay = ''
        twoWay = ''
      }
      defineComponent('test-comp', ChildVM, '<component view-model="ChildVM"></component>')

      container.innerHTML =
        '<test-comp prop-one-way="parentOne" link-two-way="parentTwo"></test-comp>'

      const parentVM = createReactiveViewModel(
        {
          parentOne: 'value1',
          parentTwo: 'value2',
        },
        () => {},
      )

      const bindings = setupComponentBindings(container, parentVM)

      expect(bindings).toHaveLength(1)
      expect(bindings[0].mappings).toHaveLength(2)
      const mappingKeys = bindings[0].mappings.map((mapping) => mapping.childKey)
      expect(mappingKeys).toContain('oneWay')
      expect(mappingKeys).toContain('twoWay')
    })

    it('should throw error when parent property does not exist', () => {
      class ChildVM {
        message = ''
      }
      defineComponent(
        'test-comp',
        ChildVM,
        '<component view-model="ChildVM"><span bind-content="message"></span></component>',
      )

      container.innerHTML = '<test-comp prop-message="nonExistentProperty"></test-comp>'

      const parentVM = createReactiveViewModel({}, () => {})

      expect(() => {
        setupComponentBindings(container, parentVM)
      }).toThrow(
        t('errors.compiler.missingParentProperty', {
          tag: 'test-comp',
          parentKey: 'nonExistentProperty',
        }),
      )
    })

    it('should throw error when a nested parent property segment does not exist (bet.errors)', () => {
      class ChildVM {
        errors = []
      }
      defineComponent('test-comp', ChildVM, '<component view-model="ChildVM"></component>')

      container.innerHTML = '<test-comp prop-errors="bet.errors"></error-list>'

      const parentVM = createReactiveViewModel(
        {
          bet: {},
        },
        () => {},
      )

      expect(() => {
        setupComponentBindings(container, parentVM)
      }).toThrow(
        t('errors.compiler.missingParentProperty', {
          tag: 'test-comp',
          parentKey: 'bet.errors',
        }),
      )
    })

    it('should throw error when an intermediate nested property segment does not exist (bet.profile.name)', () => {
      class ChildVM {
        name = ''
      }
      defineComponent('test-comp', ChildVM, '<component view-model="ChildVM"></component>')

      container.innerHTML = '<test-comp prop-name="bet.profile.name"></test-comp>'

      const parentVM = createReactiveViewModel(
        {
          bet: {},
        },
        () => {},
      )

      expect(() => {
        setupComponentBindings(container, parentVM)
      }).toThrow(
        t('errors.compiler.missingParentProperty', {
          tag: 'test-comp',
          parentKey: 'bet.profile',
        }),
      )
    })
  })

  describe('const-* bindings', () => {
    it('should accept const-* prefix for string constants without reactive mappings', () => {
      class ChildVM {
        message = ''
      }
      defineComponent(
        'test-comp',
        ChildVM,
        '<component view-model="ChildVM"><span bind-content="message"></span></component>',
      )

      container.innerHTML = '<test-comp const-message="Hello"></test-comp>'

      const parentVM = createReactiveViewModel({}, () => {})
      const bindings = setupComponentBindings(container, parentVM)

      const childVM = bindings[0].childViewModel as unknown as ChildVM

      expect(childVM.message).toBe('Hello')
      expect(bindings).toHaveLength(1)
      expect(bindings[0].mappings).toEqual([])
    })

    it('should accept const-* prefix for number constants without reactive mappings', () => {
      class ChildVM {
        count = 0
      }
      defineComponent(
        'test-comp',
        ChildVM,
        '<component view-model="ChildVM"><span bind-content="count"></span></component>',
      )

      container.innerHTML = '<test-comp const-count="42"></test-comp>'

      const parentVM = createReactiveViewModel({}, () => {})
      const bindings = setupComponentBindings(container, parentVM)

      const childVM = bindings[0].childViewModel as unknown as ChildVM

      expect(childVM.count).toBe(42)
      expect(bindings).toHaveLength(1)
      expect(bindings[0].mappings).toEqual([])
    })
  })

  describe('renderComponentBindings', () => {
    it('should skip child render for object props on initial render when references match', () => {
      const boundParentKey = 'parentConfig'
      const boundChildKey = 'config'

      class ChildVM {
        config: Record<string, unknown> = {}
      }

      const parentViewModel = {
        parentConfig: { value: 'test' } as Record<string, unknown>,
      }
      const childViewModel = new ChildVM()
      childViewModel.config = parentViewModel.parentConfig
      const renderChild = vi.fn()

      const bindings: ComponentBinding[] = [
        {
          childViewModel: childViewModel as unknown as ViewModel<ChildVM>,
          mappings: [{ parentKey: boundParentKey, childKey: boundChildKey }],
          renderChild,
        },
      ]

      renderComponentBindings(bindings, parentViewModel)

      expect(renderChild).not.toHaveBeenCalled()
    })

    it('should skip child render for object props when changedPath does not affect the bound parent path', () => {
      const boundParentKey = 'parentConfig'
      const boundChildKey = 'config'
      const unrelatedChangedPath = 'otherValue'

      class ChildVM {
        config: Record<string, unknown> = {}
      }

      const parentViewModel = {
        parentConfig: { value: 'test' } as Record<string, unknown>,
        otherValue: 'changed',
      }
      const childViewModel = new ChildVM()
      childViewModel.config = parentViewModel.parentConfig
      const renderChild = vi.fn()

      const bindings: ComponentBinding[] = [
        {
          childViewModel: childViewModel as unknown as ViewModel<ChildVM>,
          mappings: [{ parentKey: boundParentKey, childKey: boundChildKey }],
          renderChild,
        },
      ]

      renderComponentBindings(bindings, parentViewModel, unrelatedChangedPath)

      expect(renderChild).not.toHaveBeenCalled()
    })

    it('should share object and array props by reference', () => {
      class ChildVM {
        items: string[] = []
        config: Record<string, unknown> = {}
      }

      const parentViewModel = {
        parentItems: ['item1', 'item2'],
        parentConfig: { value: 'test' } as Record<string, unknown>,
      }

      const childViewModel = new ChildVM()
      const bindings: ComponentBinding[] = [
        {
          childViewModel: childViewModel as unknown as ViewModel<ChildVM>,
          mappings: [
            { parentKey: 'parentItems', childKey: 'items' },
            { parentKey: 'parentConfig', childKey: 'config' },
          ],
        },
      ]

      renderComponentBindings(bindings, parentViewModel)

      // Verify references are strictly equal before mutation
      expect(childViewModel.items).toBe(parentViewModel.parentItems)
      expect(childViewModel.config).toBe(parentViewModel.parentConfig)

      // Perform in-place mutations on parent
      parentViewModel.parentItems.push('item3')
      parentViewModel.parentConfig.newProp = 'newValue'

      // Verify child sees the mutations without re-assignment
      expect(childViewModel.items).toEqual(['item1', 'item2', 'item3'])
      expect(childViewModel.config).toEqual({ value: 'test', newProp: 'newValue' })

      // Verify references are still equal after mutation
      expect(childViewModel.items).toBe(parentViewModel.parentItems)
      expect(childViewModel.config).toBe(parentViewModel.parentConfig)
    })

    it('should skip propagation for unsafe keys (prototype pollution protection)', () => {
      class ChildVM {
        value: string = ''
      }

      const parentViewModel = { __proto__: 'unsafe' }
      const childViewModel = new ChildVM()
      const renderChild = vi.fn()

      const bindings: ComponentBinding[] = [
        {
          childViewModel: childViewModel as unknown as ViewModel<ChildVM>,
          mappings: [{ parentKey: '__proto__', childKey: 'value' }],
          renderChild,
        },
      ]

      renderComponentBindings(bindings, parentViewModel, 'value')

      expect(renderChild).not.toHaveBeenCalled()
    })

    it('should skip rendering child for unsafe keys in mappings', () => {
      class ChildVM {
        value: string = ''
      }

      const parentViewModel = { constructor: 'unsafe' }
      const childViewModel = new ChildVM()
      const renderChild = vi.fn()

      const bindings: ComponentBinding[] = [
        {
          childViewModel: childViewModel as unknown as ViewModel<ChildVM>,
          mappings: [{ parentKey: 'constructor', childKey: 'value' }],
          renderChild,
        },
      ]

      renderComponentBindings(bindings, parentViewModel, 'value')

      expect(renderChild).not.toHaveBeenCalled()
    })

    it('should propagate changes from child to parent with link bindings', () => {
      class ChildVM {
        name: string = ''
      }

      const parentViewModel = { childName: '' }
      const childViewModel = new ChildVM()
      const renderChild = vi.fn()

      const bindings: ComponentBinding[] = [
        {
          childViewModel: childViewModel as unknown as ViewModel<ChildVM>,
          mappings: [{ parentKey: 'childName', childKey: 'name' }],
          renderChild,
        },
      ]

      renderComponentBindings(bindings, parentViewModel, 'name')

      expect(parentViewModel.childName).toBe('')
    })

    it('should render buffered paths after setupBindings assigns renderChild', () => {
      class ChildVM {
        value: string = ''
      }

      const parentViewModel = { value: 'test' }
      const childViewModel = new ChildVM()
      const renderChild = vi.fn()

      const bindings: ComponentBinding[] = [
        {
          childViewModel: childViewModel as unknown as ViewModel<ChildVM>,
          mappings: [{ parentKey: 'value', childKey: 'value' }],
          renderChild,
        },
      ]

      renderComponentBindings(bindings, parentViewModel, 'value')

      expect(renderChild).toHaveBeenCalled()
    })
  })
})
