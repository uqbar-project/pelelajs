import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as errorPage from '../bootstrap/errorPage'
import { InvalidHandlerError } from '../errors/index'
import { executeEventHandler } from './executeEventHandler'
import type { ViewModel } from './types'

const EVENT_TYPE = 'click'
const HANDLER_NAME = 'handleEvent'
const HANDLER_ERROR_MESSAGE = 'Handler failed'
const INVALID_HANDLER_VALUE = 'not a function'

function executeHandler(viewModel: ViewModel, handlerName = HANDLER_NAME): void {
  executeEventHandler({
    handlerName,
    viewModel,
    event: new MouseEvent(EVENT_TYPE),
    eventType: EVENT_TYPE,
  })
}

describe('executeEventHandler', () => {
  beforeEach(() => {
    vi.spyOn(errorPage, 'renderErrorPage').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should execute the handler with the viewModel as context and first argument', () => {
    let handlerContext: unknown
    const handler = vi.fn(function (this: unknown) {
      handlerContext = this
    })
    const viewModel = { [HANDLER_NAME]: handler }
    const event = new MouseEvent(EVENT_TYPE)

    executeEventHandler({
      handlerName: HANDLER_NAME,
      viewModel,
      event,
      eventType: EVENT_TYPE,
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(viewModel, event)
    expect(handlerContext).toBe(viewModel)
  })

  it('should execute handlers declared as class methods', () => {
    class TestViewModel {
      [key: string]: unknown
      count = 0

      handleEvent(): void {
        this.count++
      }
    }
    const viewModel = new TestViewModel()

    executeHandler(viewModel)

    expect(viewModel.count).toBe(1)
  })

  it('should render InvalidHandlerError when the handler is missing', () => {
    const missingHandlerName = 'missingHandler'

    executeHandler({}, missingHandlerName)

    const expectedError = new InvalidHandlerError(missingHandlerName, 'Object', EVENT_TYPE)
    expect(errorPage.renderErrorPage).toHaveBeenCalledWith(expectedError)
  })

  it.each([
    { description: 'a string', invalidHandler: INVALID_HANDLER_VALUE },
    { description: 'null', invalidHandler: null },
  ])('should render InvalidHandlerError when the handler is $description', ({ invalidHandler }) => {
    const viewModel = { [HANDLER_NAME]: invalidHandler }

    executeHandler(viewModel)

    const expectedError = new InvalidHandlerError(HANDLER_NAME, 'Object', EVENT_TYPE)
    expect(errorPage.renderErrorPage).toHaveBeenCalledWith(expectedError)
  })

  it('should include the viewModel class name in InvalidHandlerError', () => {
    class TestViewModel {
      [key: string]: unknown
      handleEvent = INVALID_HANDLER_VALUE
    }
    const viewModel = new TestViewModel()

    executeHandler(viewModel)

    const expectedError = new InvalidHandlerError(HANDLER_NAME, 'TestViewModel', EVENT_TYPE)
    expect(errorPage.renderErrorPage).toHaveBeenCalledWith(expectedError)
  })

  it.each([
    '__proto__',
    'constructor',
    'prototype',
  ])('should reject the unsafe handler name %s', (unsafeHandlerName) => {
    executeHandler({}, unsafeHandlerName)

    const expectedError = new InvalidHandlerError(unsafeHandlerName, 'Object', EVENT_TYPE)
    expect(errorPage.renderErrorPage).toHaveBeenCalledWith(expectedError)
  })

  it('should render the error page when the handler throws', () => {
    const handlerError = new Error(HANDLER_ERROR_MESSAGE)
    const viewModel = {
      [HANDLER_NAME]: () => {
        throw handlerError
      },
    }

    executeHandler(viewModel)

    expect(errorPage.renderErrorPage).toHaveBeenCalledWith(handlerError)
  })

  it('should render rejected non-Error values from async handlers', async () => {
    const viewModel = {
      [HANDLER_NAME]: () => Promise.reject(HANDLER_ERROR_MESSAGE),
    }

    executeHandler(viewModel)

    await vi.waitFor(() => {
      expect(errorPage.renderErrorPage).toHaveBeenCalledWith(HANDLER_ERROR_MESSAGE)
    })
  })

  it('should not render the error page when an async handler resolves', async () => {
    const handler = vi.fn(() => Promise.resolve())
    const viewModel = { [HANDLER_NAME]: handler }

    executeHandler(viewModel)
    await Promise.resolve()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(errorPage.renderErrorPage).not.toHaveBeenCalled()
  })
})
