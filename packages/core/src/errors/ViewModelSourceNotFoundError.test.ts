import { describe, expect, it } from 'vitest'
import { initializeI18n, t } from '../commons/i18n'
import { ViewModelSourceNotFoundError } from './ViewModelSourceNotFoundError'

const MISSING_TS_PATH = 'src/components/missing-counter.ts'

describe('ViewModelSourceNotFoundError', () => {
  it('builds the English message exposing the unreadable path', () => {
    initializeI18n('en')

    const error = new ViewModelSourceNotFoundError({ tsPath: MISSING_TS_PATH })

    expect(error.message).toBe(
      t('errors.analysis.viewModelSourceNotFound', { path: MISSING_TS_PATH }),
    )
    expect(error.tsPath).toBe(MISSING_TS_PATH)
    expect(error).toBeInstanceOf(Error)
  })

  it('builds the Spanish message exposing the unreadable path', () => {
    initializeI18n('es')

    const error = new ViewModelSourceNotFoundError({ tsPath: MISSING_TS_PATH })

    expect(error.message).toBe(
      t('errors.analysis.viewModelSourceNotFound', { path: MISSING_TS_PATH }),
    )
    expect(error.tsPath).toBe(MISSING_TS_PATH)
  })

  it('does not leak the translation key when i18n has been initialized', () => {
    initializeI18n('en')
    const error = new ViewModelSourceNotFoundError({ tsPath: MISSING_TS_PATH })

    expect(error.message).not.toBe('errors.analysis.viewModelSourceNotFound')
  })

  it('preserves the cause when wrapping an underlying failure', () => {
    initializeI18n('en')
    const cause = new Error('read failure')

    const error = new ViewModelSourceNotFoundError({ tsPath: MISSING_TS_PATH, options: { cause } })

    expect(error.cause).toBe(cause)
  })
})
