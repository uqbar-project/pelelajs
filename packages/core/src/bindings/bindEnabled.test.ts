import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { InvalidPropertyTypeError, PropertyValidationError } from '../errors/index'
import { testHelpers } from '../test/helpers'
import { renderEnabledBindings, setupEnabledBindings, VALID_TAGS } from './bindEnabled'
import type { ViewModel } from './types'

describe('bindEnabled', () => {
  let container: HTMLElement
  const PropertyName = 'isActive'
  const _ExpectedType = 'a boolean'

  beforeEach(() => {
    container = testHelpers.createTestContainer()
  })

  afterEach(() => {
    testHelpers.cleanupTestContainer(container)
  })

  describe('setupEnabledBindings', () => {
    it('should collect elements with bind-enabled', () => {
      container.innerHTML = '<input bind-enabled="isActive" />'

      const viewModel = { isActive: true }
      const bindings = setupEnabledBindings(container, viewModel)

      expect(bindings).toHaveLength(1)
      expect(bindings[0].propertyName).toBe(PropertyName)
      expect(bindings[0].element).toBeInstanceOf(HTMLInputElement)
    })

    it('should throw error on unsupported elements', () => {
      const UnsupportedTag = 'div'
      container.innerHTML = `<${UnsupportedTag} bind-enabled="isActive"></${UnsupportedTag}>`
      const viewModel = { isActive: true }

      expect(() => {
        setupEnabledBindings(container, viewModel)
      }).toThrow(
        /bind-enabled solo puede usarse en controles de formulario|bind-enabled can only be used on form controls/,
      )
    })

    it('should throw error if property does not exist in viewModel', () => {
      container.innerHTML = '<input bind-enabled="missing" />'
      const viewModel = {}

      expect(() => {
        setupEnabledBindings(container, viewModel)
      }).toThrow(PropertyValidationError)
    })

    it('should ignore empty bind-enabled attributes', () => {
      container.innerHTML = '<input bind-enabled="" />'
      const viewModel = { isActive: true }

      const bindings = setupEnabledBindings(container, viewModel)
      expect(bindings).toHaveLength(0)
    })

    it('should accept all valid tags', () => {
      const html = VALID_TAGS.map(
        (tag) => `<${tag.toLowerCase()} bind-enabled="isActive"></${tag.toLowerCase()}>`,
      ).join('')
      container.innerHTML = html
      const viewModel = { isActive: true }

      const bindings = setupEnabledBindings(container, viewModel)
      expect(bindings).toHaveLength(VALID_TAGS.length)
    })
  })

  describe('renderEnabledBindings', () => {
    it('should enable element when value is true', () => {
      container.innerHTML = '<input bind-enabled="isActive" />'
      const viewModel = { isActive: false }
      const bindings = setupEnabledBindings(container, viewModel)

      viewModel.isActive = true
      renderEnabledBindings(bindings, viewModel)

      const input = container.querySelector('input')!
      expect(input.disabled).toBe(false)
    })

    it('should disable element when value is false', () => {
      container.innerHTML = '<input bind-enabled="isActive" />'
      const viewModel = { isActive: true }
      const bindings = setupEnabledBindings(container, viewModel)

      viewModel.isActive = false
      renderEnabledBindings(bindings, viewModel)

      const input = container.querySelector('input')!
      expect(input.disabled).toBe(true)
    })

    it('should disable element when value is null or undefined', () => {
      container.innerHTML = '<input bind-enabled="isActive" />'
      const viewModel: ViewModel<{ isActive: unknown }> = { isActive: null }
      const bindings = setupEnabledBindings(container, viewModel)

      renderEnabledBindings(bindings, viewModel)
      expect(container.querySelector('input')!.disabled).toBe(true)

      viewModel.isActive = undefined
      renderEnabledBindings(bindings, viewModel)
      expect(container.querySelector('input')!.disabled).toBe(true)
    })

    it('should throw InvalidPropertyTypeError when value is not boolean', () => {
      container.innerHTML = '<input bind-enabled="isActive" />'
      const viewModel: ViewModel<{ isActive: unknown }> = { isActive: 42 }
      const bindings = setupEnabledBindings(container, viewModel)

      expect(() => {
        renderEnabledBindings(bindings, viewModel)
      }).toThrow(InvalidPropertyTypeError)
    })

    it('should work with nested property path', () => {
      container.innerHTML = '<input bind-enabled="form.enabled" />'
      const viewModel = { form: { enabled: false } }
      const bindings = setupEnabledBindings(container, viewModel)

      viewModel.form.enabled = true
      renderEnabledBindings(bindings, viewModel)

      const input = container.querySelector('input')!
      expect(input.disabled).toBe(false)
    })

    it('should not update if value has not changed', () => {
      container.innerHTML = '<input bind-enabled="isActive" />'
      const viewModel = { isActive: true }
      const bindings = setupEnabledBindings(container, viewModel)

      const input = container.querySelector('input')!
      expect(input.disabled).toBe(false)

      renderEnabledBindings(bindings, viewModel)
      expect(input.disabled).toBe(false)
    })
  })
})
