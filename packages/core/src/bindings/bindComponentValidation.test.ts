import { beforeEach, describe, expect, it } from 'vitest'
import { initializeI18n, t } from '../commons/i18n'
import { UnknownComponentPropertyError } from '../errors'
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

  it('should suggest the registered kebab-case tag when the DOM contains the collapsed tag', () => {
    class PersonRow {}
    defineComponent('PersonRow', PersonRow, '<component view-model="PersonRow"></component>')

    container.innerHTML =
      '<personrow prop-person="person" prop-index="index" prop-selected-index="selectedIndex"></personrow>'
    const vm = createReactiveViewModel({}, () => {})

    expect(() => setupComponentBindings(container, vm)).toThrow(
      t('errors.compiler.invalidComponentTagCase', {
        tag: 'personrow',
        suggestedTag: 'person-row',
      }),
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

  it('should throw UnknownComponentPropertyError if prop-* property is not in child VM', () => {
    class ChildVM {}
    defineComponent('child-comp', ChildVM, '<component view-model="ChildVM"></component>')

    container.innerHTML = '<child-comp prop-missing="parentProp"></child-comp>'
    const vm = createReactiveViewModel({ parentProp: 'value' }, () => {})

    expect(() => setupComponentBindings(container, vm)).toThrow(UnknownComponentPropertyError)
  })

  it('should throw UnknownComponentPropertyError if link-* property is not in child VM', () => {
    class ChildVM {}
    defineComponent('child-comp', ChildVM, '<component view-model="ChildVM"></component>')

    container.innerHTML = '<child-comp link-missing="parentProp"></child-comp>'
    const vm = createReactiveViewModel({ parentProp: 'value' }, () => {})

    expect(() => setupComponentBindings(container, vm)).toThrow(UnknownComponentPropertyError)
  })

  it('should throw UnknownComponentPropertyError if const-* property is not in child VM', () => {
    class ChildVM {}
    defineComponent('child-comp', ChildVM, '<component view-model="ChildVM"></component>')

    container.innerHTML = '<child-comp const-missing="42"></child-comp>'
    const vm = createReactiveViewModel({}, () => {})

    expect(() => setupComponentBindings(container, vm)).toThrow(UnknownComponentPropertyError)
  })

  it('should NOT throw if property exists in child VM', () => {
    class ChildVM {
      existing = ''
    }
    defineComponent('child-comp', ChildVM, '<component view-model="ChildVM"></component>')

    container.innerHTML = `
      <child-comp 
        prop-existing="parentProp" 
        link-existing="parentProp" 
        const-existing="value"
      ></child-comp>
    `
    const vm = createReactiveViewModel({ parentProp: 'value' }, () => {})

    expect(() => setupComponentBindings(container, vm)).not.toThrow()
  })
})
