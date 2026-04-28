import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initializeI18n } from '../commons/i18n'
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
      initializeI18n('en')

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
      }).toThrow(Error)
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
      initializeI18n('en')

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
      }).toThrow(Error)
    })
  })

  describe('renderComponentBindings', () => {
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
  })
})
