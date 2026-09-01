import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testHelpers } from '../test/helpers'
import { renderErrorPage } from './errorPage'

const ERROR_MESSAGE_SELECTOR = '.error-message'
const ERROR_MESSAGE = 'Something went wrong'
const UNSAFE_ERROR_MESSAGE = '<img src="invalid" onerror="alert(1)">'

function renderedErrorMessage(): string | null | undefined {
  return document.querySelector(ERROR_MESSAGE_SELECTOR)?.textContent
}

describe('renderErrorPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    testHelpers.cleanupAllContainers()
    vi.restoreAllMocks()
  })

  it('should render an Error message', () => {
    renderErrorPage(new Error(ERROR_MESSAGE))

    expect(renderedErrorMessage()).toBe(ERROR_MESSAGE)
  })

  it('should normalize and render non-Error values', () => {
    renderErrorPage(ERROR_MESSAGE)

    expect(renderedErrorMessage()).toBe(ERROR_MESSAGE)
  })

  it('should escape HTML in the error message', () => {
    renderErrorPage(new Error(UNSAFE_ERROR_MESSAGE))

    expect(renderedErrorMessage()).toBe(UNSAFE_ERROR_MESSAGE)
    expect(document.querySelector(`${ERROR_MESSAGE_SELECTOR} img`)).toBeNull()
  })
})
