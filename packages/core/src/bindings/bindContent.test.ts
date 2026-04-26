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
    it('should update textContent of elements', () => {
      container.innerHTML = '<span bind-content="message"></span>'
      const viewModel = { message: 'Hello' }
      const bindings = setupContentBindings(container, viewModel)

      viewModel.message = 'World'
      renderContentBindings(bindings, viewModel)

      const span = container.querySelector('span')!
      expect(span.textContent).toBe('World')
    })

    it('should handle null values', () => {
      container.innerHTML = '<span bind-content="text"></span>'
      const viewModel: ViewModel<{ text: unknown }> = { text: 'initial' }
      const bindings = setupContentBindings(container, viewModel)

      viewModel.text = null
      renderContentBindings(bindings, viewModel)
      expect(container.querySelector('span')!.textContent).toBe('')
    })

    it('should handle undefined values', () => {
      container.innerHTML = '<span bind-content="text"></span>'
      const viewModel: ViewModel<{ text: unknown }> = { text: 'initial' }
      const bindings = setupContentBindings(container, viewModel)

      viewModel.text = undefined
      renderContentBindings(bindings, viewModel)
      expect(container.querySelector('span')!.textContent).toBe('')
    })

    it('should convert numbers to strings', () => {
      container.innerHTML = '<span bind-content="count"></span>'
      const viewModel = { count: 42 }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      expect(container.querySelector('span')!.textContent).toBe('42')
    })

    it('should convert booleans to strings', () => {
      container.innerHTML = '<span bind-content="active"></span>'
      const viewModel = { active: true }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      expect(container.querySelector('span')!.textContent).toBe('true')
    })

    it('should handle nested properties', () => {
      container.innerHTML = '<span bind-content="user.name"></span>'
      const viewModel = { user: { name: 'John' } }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      expect(container.querySelector('span')!.textContent).toBe('John')
    })

    it('should update deeply nested properties', () => {
      container.innerHTML = '<span bind-content="data.user.profile.name"></span>'
      const viewModel = { data: { user: { profile: { name: 'Alice' } } } }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      expect(container.querySelector('span')!.textContent).toBe('Alice')
    })

    it('should handle empty strings', () => {
      container.innerHTML = '<span bind-content="text"></span>'
      const viewModel = { text: '' }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      expect(container.querySelector('span')!.textContent).toBe('')
    })

    it('should render multiple bindings', () => {
      container.innerHTML = `
        <span bind-content="first"></span>
        <div bind-content="second"></div>
      `
      const viewModel = { first: 'First', second: 'Second' }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      expect(container.querySelector('span')!.textContent).toBe('First')
      expect(container.querySelector('div')!.textContent).toBe('Second')
    })

    it('should escape HTML to prevent XSS attacks', () => {
      container.innerHTML = '<span bind-content="message"></span>'

      const viewModel = { message: '<script>alert("XSS")</script>' }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      // textContent should contain the raw string (browser handles escaping)
      expect(container.querySelector('span')!.textContent).toBe('<script>alert("XSS")</script>')

      // Verify no script element was created
      expect(container.querySelector('script')).toBeNull()
    })

    it('should escape multiple XSS vectors', () => {
      container.innerHTML = '<div bind-content="content"></div>'

      const viewModel = {
        content: '<img src="x" onerror="alert(1)"><iframe src="javascript:alert(2)"></iframe>',
      }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      // textContent should contain the raw string
      const div = container.querySelector('div')!
      expect(div.textContent).toBe(
        '<img src="x" onerror="alert(1)"><iframe src="javascript:alert(2)"></iframe>',
      )

      // Verify no dangerous elements were created
      expect(div.querySelector('img')).toBeNull()
      expect(div.querySelector('iframe')).toBeNull()
    })

    it('should handle complex nested XSS attempts', () => {
      container.innerHTML = '<span bind-content="data"></span>'

      const viewModel = {
        data: '<div><script>fetch("/steal").then(r=>r.text().then(d=>eval(d)))</script></div>',
      }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      // textContent should contain the raw string
      expect(container.querySelector('span')!.textContent).toBe(
        '<div><script>fetch("/steal").then(r=>r.text().then(d=>eval(d)))</script></div>',
      )

      // Verify no script execution
      expect(container.querySelector('script')).toBeNull()
      expect(container.querySelector('div')).toBeNull()
    })

    it('should display special characters verbatim (no double-escape)', () => {
      container.innerHTML = '<span bind-content="text"></span>'

      const viewModel = { text: 'Tom & Jerry said "3/4 of the pie"' }
      const bindings = setupContentBindings(container, viewModel)

      renderContentBindings(bindings, viewModel)

      // Special characters should display as-is in textContent
      expect(container.querySelector('span')!.textContent).toBe('Tom & Jerry said "3/4 of the pie"')
    })
  })
})
