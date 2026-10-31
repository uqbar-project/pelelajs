import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '../commons/i18n'
import { PropertyValidationError, WrongElementForBindingError } from '../errors/index'
import { testHelpers } from '../test/helpers'
import { renderAltBindings, setupAltBindings } from './bindAlt'
import type { ViewModel } from './types'

describe('bindAlt', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = testHelpers.createTestContainer()
  })

  afterEach(() => {
    testHelpers.cleanupTestContainer(container)
  })

  describe('setupAltBindings', () => {
    it('should collect img elements with bind-alt', () => {
      container.innerHTML = '<img bind-alt="altText" />'

      const viewModel = { altText: 'A description' }
      const bindings = setupAltBindings(container, viewModel)

      expect(bindings).toHaveLength(1)
      expect(bindings[0].propertyName).toBe('altText')
      expect(bindings[0].element).toBeInstanceOf(HTMLImageElement)
    })

    it('should throw error if element is not an img', () => {
      container.innerHTML = '<div bind-alt="altText"></div>'
      const viewModel = { altText: 'A description' }

      const error = testHelpers.catchError<WrongElementForBindingError>(() =>
        setupAltBindings(container, viewModel),
      )

      expect(error).toBeInstanceOf(WrongElementForBindingError)
      expect(error.attributeName).toBe('bind-alt')
      expect(error.tagName).toBe('div')
      expect(error.message).toBe(
        t('errors.bindings.altOnlyForImg', {
          attributeName: 'bind-alt',
          tagName: 'div',
          snippet: '<div bind-alt="altText"></div>',
        }),
      )
    })

    it('should throw error if property does not exist in viewModel', () => {
      container.innerHTML = '<img bind-alt="missing" />'
      const viewModel = {}

      expect(() => {
        setupAltBindings(container, viewModel)
      }).toThrow(PropertyValidationError)
    })

    it('should ignore empty bind-alt attributes', () => {
      container.innerHTML = '<img bind-alt="" />'
      const viewModel = { altText: 'A description' }

      const bindings = setupAltBindings(container, viewModel)
      expect(bindings).toHaveLength(0)
    })
  })

  describe('renderAltBindings', () => {
    it('should update the alt attribute of img elements', () => {
      container.innerHTML = '<img bind-alt="altText" />'
      const viewModel = { altText: 'Old description' }
      const bindings = setupAltBindings(container, viewModel)

      viewModel.altText = 'New description'
      renderAltBindings(bindings, viewModel)

      const img = container.querySelector('img')!
      expect(img.getAttribute('alt')).toBe('New description')
    })

    it('should handle null and undefined values by removing the alt attribute', () => {
      container.innerHTML = '<img bind-alt="altText" />'
      const viewModel: ViewModel<{ altText: unknown }> = { altText: 'Initial' }
      const bindings = setupAltBindings(container, viewModel)

      viewModel.altText = null
      renderAltBindings(bindings, viewModel)
      expect(container.querySelector('img')!.getAttribute('alt')).toBeNull()

      viewModel.altText = undefined
      renderAltBindings(bindings, viewModel)
      expect(container.querySelector('img')!.getAttribute('alt')).toBeNull()
    })

    it('should not update if value has not changed', () => {
      container.innerHTML = '<img bind-alt="altText" alt="Same" />'
      const viewModel = { altText: 'Same' }
      const bindings = setupAltBindings(container, viewModel)

      const img = container.querySelector('img')!
      const spy = vi.spyOn(img, 'setAttribute')

      renderAltBindings(bindings, viewModel)
      expect(spy).not.toHaveBeenCalled()
    })
  })
})
