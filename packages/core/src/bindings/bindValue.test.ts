import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PropertyValidationError } from '../errors/index'
import { testHelpers } from '../test/helpers'
import { renderValueBindings, setupValueBindings } from './bindValue'

describe('bindValue', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = testHelpers.createTestContainer()
  })

  afterEach(() => {
    testHelpers.cleanupTestContainer(container)
  })

  describe('setupValueBindings', () => {
    it('should collect input elements with bind-value', () => {
      container.innerHTML = `
        <input bind-value="name" />
        <textarea bind-value="description"></textarea>
      `

      const viewModel = { name: '', description: '' }
      const bindings = setupValueBindings(container, viewModel)

      expect(bindings).toHaveLength(2)
    })

    it('should throw error for non-input elements', () => {
      container.innerHTML = '<span bind-value="text"></span>'
      const viewModel = { text: '' }

      expect(() => {
        setupValueBindings(container, viewModel)
      }).toThrow('bind-value can only be used on input, textarea, or select elements')
    })

    it('should throw error for div elements', () => {
      container.innerHTML = '<div bind-value="text"></div>'
      const viewModel = { text: '' }

      expect(() => {
        setupValueBindings(container, viewModel)
      }).toThrow('Use bind-content for display elements')
    })

    it('should throw error for p elements', () => {
      container.innerHTML = '<p bind-value="text"></p>'
      const viewModel = { text: '' }

      expect(() => {
        setupValueBindings(container, viewModel)
      }).toThrow('bind-value can only be used on input, textarea, or select elements')
    })

    it('should setup event listeners on inputs', () => {
      container.innerHTML = '<input bind-value="name" />'
      const viewModel = { name: 'initial' }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = 'updated'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.name).toBe('updated')
    })

    it('should convert numeric values in inputs', () => {
      container.innerHTML = '<input bind-value="count" />'
      const viewModel = { count: 0 }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = '42'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.count).toBe(42)
    })

    it('should handle invalid numeric values', () => {
      container.innerHTML = '<input bind-value="count" />'
      const viewModel = { count: 0 }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = 'invalid'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.count).toBe(0)
    })

    it('should accept commas as decimal separator', () => {
      container.innerHTML = '<input bind-value="price" />'
      const viewModel = { price: 0 }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = '10,5'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.price).toBe(10.5)
    })

    it('should throw error if property does not exist', () => {
      container.innerHTML = '<span bind-value="missing"></span>'
      const viewModel = {}

      expect(() => {
        setupValueBindings(container, viewModel)
      }).toThrow(PropertyValidationError)
    })

    it('should ignore elements with empty bind-value', () => {
      container.innerHTML = '<span bind-value=""></span>'
      const viewModel = { prop: 'value' }

      const bindings = setupValueBindings(container, viewModel)

      expect(bindings).toHaveLength(0)
    })

    it('should ignore elements with whitespace-only bind-value', () => {
      container.innerHTML = '<span bind-value="   "></span>'
      const viewModel = { prop: 'value' }

      const bindings = setupValueBindings(container, viewModel)

      expect(bindings).toHaveLength(0)
    })
  })

  describe('renderValueBindings', () => {
    it('should update value of inputs', () => {
      container.innerHTML = '<input bind-value="name" />'
      const viewModel = { name: 'John' }
      const bindings = setupValueBindings(container, viewModel)

      viewModel.name = 'Jane'
      renderValueBindings(bindings, viewModel)

      const input = container.querySelector('input')!
      expect(input.value).toBe('Jane')
    })

    it('should handle null and undefined values', () => {
      container.innerHTML = '<input bind-value="text" />'
      const viewModel: { text: unknown } = { text: 'initial' }
      const bindings = setupValueBindings(container, viewModel)

      viewModel.text = null
      renderValueBindings(bindings, viewModel)
      expect(container.querySelector('input')!.value).toBe('')

      viewModel.text = undefined
      renderValueBindings(bindings, viewModel)
      expect(container.querySelector('input')!.value).toBe('')
    })

    it('should convert numbers to strings', () => {
      container.innerHTML = '<input bind-value="count" />'
      const viewModel = { count: 42 }
      const bindings = setupValueBindings(container, viewModel)

      renderValueBindings(bindings, viewModel)

      expect(container.querySelector('input')!.value).toBe('42')
    })

    it('should not update input if value has not changed', () => {
      container.innerHTML = '<input bind-value="name" />'
      const viewModel = { name: 'John' }
      const bindings = setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = 'John'

      renderValueBindings(bindings, viewModel)

      expect(input.value).toBe('John')
    })
  })
})
