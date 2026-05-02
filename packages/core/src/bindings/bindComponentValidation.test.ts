import { beforeEach, describe, expect, it } from 'vitest'
import { initializeI18n } from '../commons/i18n'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { clearComponentRegistry, defineComponent } from '../registry/componentRegistry'
import { setupComponentBindings } from './bindComponent'

describe('bindComponent validation', () => {
  let container: HTMLElement

  beforeEach(() => {
    initializeI18n('en')
    container = document.createElement('div')
    clearComponentRegistry()
  })

  it('should throw UnknownComponentError for unrecognized non-standard tags', () => {
    container.innerHTML = '<contado>Hola</contado>'
    const vm = createReactiveViewModel({}, () => {})

    expect(() => setupComponentBindings(container, vm)).toThrow(/Unknown component: <contado>/)
  })

  it('should throw UnknownComponentError for unrecognized hyphenated tags', () => {
    container.innerHTML = '<my-unknown-comp></my-unknown-comp>'
    const vm = createReactiveViewModel({}, () => {})

    expect(() => setupComponentBindings(container, vm)).toThrow(
      /Unknown component: <my-unknown-comp>/,
    )
  })

  it('should NOT throw for standard HTML tags', () => {
    container.innerHTML = '<div><span></span><p></p><section></section></div>'
    const vm = createReactiveViewModel({}, () => {})

    expect(() => setupComponentBindings(container, vm)).not.toThrow()
  })

  it('should NOT throw for registered components', () => {
    class MyComp {}
    defineComponent('my-comp', MyComp, '<component view-model="MyComp"></component>')

    container.innerHTML = '<my-comp></my-comp>'
    const vm = createReactiveViewModel({}, () => {})

    expect(() => setupComponentBindings(container, vm)).not.toThrow()
  })

  it('should NOT throw for registered components without hyphens', () => {
    class Counter {}
    defineComponent('Counter', Counter, '<component view-model="Counter"></component>')

    container.innerHTML = '<counter></counter>'
    const vm = createReactiveViewModel({}, () => {})

    expect(() => setupComponentBindings(container, vm)).not.toThrow()
  })

  it('should allow "if" attribute on registered components', () => {
    class MyComp {}
    defineComponent('my-comp', MyComp, '<component view-model="MyComp"></component>')

    container.innerHTML = '<my-comp if="show"></my-comp>'
    const vm = createReactiveViewModel({ show: true }, () => {})

    expect(() => setupComponentBindings(container, vm)).not.toThrow()
  })

  it('should throw Error for invalid attributes on registered components', () => {
    class MyComp {}
    defineComponent('my-comp', MyComp, '<component view-model="MyComp"></component>')

    container.innerHTML = '<my-comp invalid-attr="value"></my-comp>'
    const vm = createReactiveViewModel({}, () => {})

    expect(() => setupComponentBindings(container, vm)).toThrow(
      /attribute "invalid-attr" must use "prop-"/,
    )
  })
})
