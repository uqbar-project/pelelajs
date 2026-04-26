import { beforeEach, describe, expect, it } from 'vitest'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { clearComponentRegistry, defineComponent } from '../registry/componentRegistry'
import type { PelelaElement } from '../types'
import { setupBindings } from './setupBindings'

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

  it('should be reactive from parent to child (one-way)', async () => {
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
})
