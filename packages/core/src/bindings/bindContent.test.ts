import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PropertyValidationError } from '../errors/index'
import { testHelpers } from '../test/helpers'
import { renderContentBindings, setupContentBindings } from './bindContent'
import type { ViewModel } from './types'

describe('bindContent', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = testHelpers.createTestContainer()
  })

  afterEach(() => {
    testHelpers.cleanupTestContainer(container)
  })

  describe('setupContentBindings', () => {
    it('should collect elements with bind-content', () => {
      container.innerHTML = `
        <span bind-content="message"></span>
        <div bind-content="title"></div>
      `

      const viewModel = { message: '', title: '' }
      const bindings = setupContentBindings(container, viewModel)

      expect(bindings).toHaveLength(2)
    })

    it('should store property name in binding', () => {
      container.innerHTML = '<span bind-content="text"></span>'

      const viewModel = { text: '' }
      const bindings = setupContentBindings(container, viewModel)

      expect(bindings[0].propertyName).toBe('text')
    })

    it('should throw error if property does not exist', () => {
      container.innerHTML = '<span bind-content="missing"></span>'
      const viewModel = {}

      expect(() => {
        setupContentBindings(container, viewModel)
      }).toThrow(PropertyValidationError)
    })

    it('should ignore elements with empty bind-content', () => {
      container.innerHTML = '<span bind-content=""></span>'
      const viewModel = { prop: 'value' }

      const bindings = setupContentBindings(container, viewModel)

      expect(bindings).toHaveLength(0)
    })

    it('should ignore elements with whitespace-only bind-content', () => {
      container.innerHTML = '<span bind-content="   "></span>'
      const viewModel = { prop: 'value' }

      const bindings = setupContentBindings(container, viewModel)

      expect(bindings).toHaveLength(0)
    })

    it('should work with different element types', () => {
      container.innerHTML = `
        <span bind-content="text"></span>
        <div bind-content="text"></div>
        <p bind-content="text"></p>
        <h1 bind-content="text"></h1>
        <button bind-content="text"></button>
      `

      const viewModel = { text: 'content' }
      const bindings = setupContentBindings(container, viewModel)

      expect(bindings).toHaveLength(5)
    })
  })

  describe('renderContentBindings', () => {
    it('should update innerHTML of elements', () => {
      container.innerHTML = '<span bind-content="message"></span>'
      const viewModel = { message: 'Hello' }
      const bindings = setupContentBindings(container, viewModel)

      viewModel.message = 'World'
      renderContentBindings(bindings, viewModel)

      const span = container.querySelector('span')!
      expect(span.innerHTML).toBe('World')
    })

    it('should handle null values', () => {
      container.innerHTML = '<span bind-content="text"></span>'
      const viewModel: ViewModel<{ text: unknown }> = { text: 'initial' }
      const bindings = setupContentBindings(container, viewModel)

      viewModel.text = null
      renderContentBindings(bindings, viewModel)
      expect(container.querySelector('span')!.innerHTML).toBe('')
    })

    it('should handle undefined values', () => {
      container.innerHTML = '<span bind-content="text"></span>'
      const viewModel: ViewModel<{ text: unknown }> = { text: 'initial' }
      const bindings = setupContentBindings(container, viewModel)

      viewModel.text = undefined
      renderContentBindings(bindings, viewModel)
      expect(container.querySelector('span')!.innerHTML).toBe('')
    })

    it('should convert numbers to strings', () => {
      container.innerHTML = '<span bind-content="count"></span>'
      const viewModel = { count: 42 }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      expect(container.querySelector('span')!.innerHTML).toBe('42')
    })

    it('should convert booleans to strings', () => {
      container.innerHTML = '<span bind-content="active"></span>'
      const viewModel = { active: true }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      expect(container.querySelector('span')!.innerHTML).toBe('true')
    })

    it('should handle nested properties', () => {
      container.innerHTML = '<span bind-content="user.name"></span>'
      const viewModel = { user: { name: 'John' } }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      expect(container.querySelector('span')!.innerHTML).toBe('John')
    })

    it('should update deeply nested properties', () => {
      container.innerHTML = '<span bind-content="data.user.profile.name"></span>'
      const viewModel = { data: { user: { profile: { name: 'Alice' } } } }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      expect(container.querySelector('span')!.innerHTML).toBe('Alice')
    })

    it('should handle empty strings', () => {
      container.innerHTML = '<span bind-content="text"></span>'
      const viewModel = { text: '' }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      expect(container.querySelector('span')!.innerHTML).toBe('')
    })

    it('should render multiple bindings', () => {
      container.innerHTML = `
        <span bind-content="first"></span>
        <div bind-content="second"></div>
      `
      const viewModel = { first: 'First', second: 'Second' }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      expect(container.querySelector('span')!.innerHTML).toBe('First')
      expect(container.querySelector('div')!.innerHTML).toBe('Second')
    })
  })
})
