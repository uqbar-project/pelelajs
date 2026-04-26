import { beforeEach, describe, expect, it } from 'vitest'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { clearComponentRegistry, defineComponent } from '../registry/componentRegistry'
import type { PelelaElement } from '../types'
import { renderComponentBindings, setupComponentBindings } from './bindComponent'
import { setupBindings } from './setupBindings'
import type { ComponentBinding } from './types'

describe('bindComponent', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
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

    container.innerHTML = '<child-comp message="parentMessage"></child-comp>'

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

    container.innerHTML = '<counter-child count="parentCount"></counter-child>'

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

  describe('reserved HTML attributes filtering', () => {
    it('should filter out standard HTML attributes', () => {
      class ChildVM {
        message = ''
      }
      defineComponent(
        'test-comp',
        ChildVM,
        '<component view-model="ChildVM"><span bind-content="message"></span></component>',
      )

      container.innerHTML =
        '<test-comp class="my-class" id="my-id" style="color:red" message="parentMessage"></test-comp>'

      const parentVM = createReactiveViewModel(
        {
          parentMessage: 'Hello',
        },
        () => {},
      )

      const bindings = setupComponentBindings(container, parentVM)

      // Only 'message' should be mapped, not class, id, or style
      expect(bindings).toHaveLength(1)
      expect(bindings[0].mappings).toHaveLength(1)
      expect(bindings[0].mappings[0].childKey).toBe('message')
      expect(bindings[0].mappings[0].parentKey).toBe('parentMessage')
    })

    it('should filter out aria-* attributes', () => {
      class ChildVM {
        value = ''
      }
      defineComponent('aria-comp', ChildVM, '<component view-model="ChildVM"></component>')

      container.innerHTML =
        '<aria-comp aria-label="test" aria-hidden="true" value="parentValue"></aria-comp>'

      const parentVM = createReactiveViewModel(
        {
          parentValue: 'test',
        },
        () => {},
      )

      const bindings = setupComponentBindings(container, parentVM)

      // Only 'value' should be mapped, not aria-* attributes
      expect(bindings).toHaveLength(1)
      expect(bindings[0].mappings).toHaveLength(1)
      expect(bindings[0].mappings[0].childKey).toBe('value')
    })

    it('should filter out data-* attributes', () => {
      class ChildVM {
        count = 0
      }
      defineComponent('data-comp', ChildVM, '<component view-model="ChildVM"></component>')

      container.innerHTML =
        '<data-comp data-id="123" data-name="test" count="parentCount"></data-comp>'

      const parentVM = createReactiveViewModel(
        {
          parentCount: 10,
        },
        () => {},
      )

      const bindings = setupComponentBindings(container, parentVM)

      // Only 'count' should be mapped, not data-* attributes
      expect(bindings).toHaveLength(1)
      expect(bindings[0].mappings).toHaveLength(1)
      expect(bindings[0].mappings[0].childKey).toBe('count')
    })

    it('should filter out slot, is, and role attributes', () => {
      class ChildVM {
        title = ''
      }
      defineComponent('slot-comp', ChildVM, '<component view-model="ChildVM"></component>')

      container.innerHTML =
        '<slot-comp slot="header" is="custom" role="button" title="parentTitle"></slot-comp>'

      const parentVM = createReactiveViewModel(
        {
          parentTitle: 'Test',
        },
        () => {},
      )

      const bindings = setupComponentBindings(container, parentVM)

      // Only 'title' should be mapped, not slot, is, or role
      expect(bindings).toHaveLength(1)
      expect(bindings[0].mappings).toHaveLength(1)
      expect(bindings[0].mappings[0].childKey).toBe('title')
    })

    it('should map custom attributes that are not reserved', () => {
      class ChildVM {
        customProp = ''
        anotherProp = ''
      }
      defineComponent('custom-comp', ChildVM, '<component view-model="ChildVM"></component>')

      container.innerHTML =
        '<custom-comp custom-prop="parentCustom" another-prop="parentAnother" class="ignored"></custom-comp>'

      const parentVM = createReactiveViewModel(
        {
          parentCustom: 'value1',
          parentAnother: 'value2',
        },
        () => {},
      )

      const bindings = setupComponentBindings(container, parentVM)

      // customProp and anotherProp should be mapped, class should be filtered
      expect(bindings).toHaveLength(1)
      expect(bindings[0].mappings).toHaveLength(2)
      const mappingKeys = bindings[0].mappings.map((m) => m.childKey)
      expect(mappingKeys).toContain('customProp')
      expect(mappingKeys).toContain('anotherProp')
      expect(mappingKeys).not.toContain('class')
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
          childViewModel: childViewModel as never,
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
