import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '../commons/i18n'
import { PropertyValidationError, WrongElementForBindingError } from '../errors/index'
import { testHelpers } from '../test/helpers'
import { renderSrcBindings, setupSrcBindings } from './bindSrc'
import type { ViewModel } from './types'

describe('bindSrc', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = testHelpers.createTestContainer()
  })

  afterEach(() => {
    testHelpers.cleanupTestContainer(container)
  })

  describe('setupSrcBindings', () => {
    it('should collect img elements with bind-src', () => {
      container.innerHTML = '<img bind-src="imageUrl" />'

      const viewModel = { imageUrl: 'test.png' }
      const bindings = setupSrcBindings(container, viewModel)

      expect(bindings).toHaveLength(1)
      expect(bindings[0].propertyName).toBe('imageUrl')
      expect(bindings[0].element).toBeInstanceOf(HTMLImageElement)
    })

    it('should throw error if element is not an img', () => {
      container.innerHTML = '<div bind-src="imageUrl"></div>'
      const viewModel = { imageUrl: 'test.png' }

      const error = testHelpers.catchError<WrongElementForBindingError>(() =>
        setupSrcBindings(container, viewModel),
      )

      expect(error).toBeInstanceOf(WrongElementForBindingError)
      expect(error.attributeName).toBe('bind-src')
      expect(error.tagName).toBe('div')
      expect(error.message).toBe(
        t('errors.bindings.srcOnlyForImg', {
          attributeName: 'bind-src',
          tagName: 'div',
          snippet: '<div bind-src="imageUrl"></div>',
        }),
      )
    })

    it('should throw error if property does not exist in viewModel', () => {
      container.innerHTML = '<img bind-src="missing" />'
      const viewModel = {}

      expect(() => {
        setupSrcBindings(container, viewModel)
      }).toThrow(PropertyValidationError)
    })

    it('should ignore empty bind-src attributes', () => {
      container.innerHTML = '<img bind-src="" />'
      const viewModel = { imageUrl: 'test.png' }

      const bindings = setupSrcBindings(container, viewModel)
      expect(bindings).toHaveLength(0)
    })
  })

  describe('renderSrcBindings', () => {
    it('should update the src attribute of img elements', () => {
      container.innerHTML = '<img bind-src="imageUrl" />'
      const viewModel = { imageUrl: 'old.png' }
      const bindings = setupSrcBindings(container, viewModel)

      viewModel.imageUrl = 'new.png'
      renderSrcBindings(bindings, viewModel)

      const img = container.querySelector('img')!
      expect(img.getAttribute('src')).toBe('new.png')
    })

    it('should handle null and undefined values by removing the src attribute', () => {
      container.innerHTML = '<img bind-src="imageUrl" />'
      const viewModel: ViewModel<{ imageUrl: unknown }> = { imageUrl: 'initial.png' }
      const bindings = setupSrcBindings(container, viewModel)

      viewModel.imageUrl = null
      renderSrcBindings(bindings, viewModel)
      expect(container.querySelector('img')!.getAttribute('src')).toBeNull()

      viewModel.imageUrl = undefined
      renderSrcBindings(bindings, viewModel)
      expect(container.querySelector('img')!.getAttribute('src')).toBeNull()
    })

    it('should not update if value has not changed', () => {
      container.innerHTML = '<img bind-src="imageUrl" src="test.png" />'
      const viewModel = { imageUrl: 'test.png' }
      const bindings = setupSrcBindings(container, viewModel)

      const img = container.querySelector('img')!
      const spy = vi.spyOn(img, 'setAttribute')

      renderSrcBindings(bindings, viewModel)
      expect(spy).not.toHaveBeenCalled()
    })
  })
})
