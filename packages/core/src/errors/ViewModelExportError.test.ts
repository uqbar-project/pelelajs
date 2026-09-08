import { describe, expect, it } from 'vitest'
import { initializeI18n, t } from '../commons/i18n'
import type { ViewModelExportErrorParams } from './ViewModelExportError'
import { ViewModelExportError } from './ViewModelExportError'

const CONVERSOR_TS_FILE = 'src/conversor.ts'
const CONVERSOR_CLASS_NAME = 'Conversor'
const CONVERSOR_VIEW_MODEL = 'conversor'

describe('ViewModelExportError', () => {
  it('builds the English message when the class is not exported', () => {
    initializeI18n('en')
    const params: ViewModelExportErrorParams = {
      kind: 'missingExport',
      viewModelName: CONVERSOR_CLASS_NAME,
      tsFilePath: CONVERSOR_TS_FILE,
    }

    const error = new ViewModelExportError(params)

    expect(error.message).toBe(
      t('errors.viewmodel.export.missingExport', {
        viewModelName: CONVERSOR_CLASS_NAME,
        tsFilePath: CONVERSOR_TS_FILE,
      }),
    )
    expect(error).toBeInstanceOf(Error)
  })

  it('builds the Spanish message when the class differs in case', () => {
    initializeI18n('es')
    const params: ViewModelExportErrorParams = {
      kind: 'wrongCase',
      viewModelName: CONVERSOR_VIEW_MODEL,
      expectedName: CONVERSOR_CLASS_NAME,
      tsFilePath: CONVERSOR_TS_FILE,
    }

    const error = new ViewModelExportError(params)

    expect(error.message).toBe(
      t('errors.viewmodel.export.wrongCase', {
        viewModelName: CONVERSOR_VIEW_MODEL,
        expectedName: CONVERSOR_CLASS_NAME,
        tsFilePath: CONVERSOR_TS_FILE,
      }),
    )
  })

  it('builds the Spanish message when no class matches, suggesting the file-derived name', () => {
    initializeI18n('es')
    const suggestedName = 'Contador'
    const params: ViewModelExportErrorParams = {
      kind: 'notFound',
      viewModelName: 'Bicicleta',
      tsFilePath: CONVERSOR_TS_FILE,
      suggestedName,
    }

    const error = new ViewModelExportError(params)

    expect(error.message).toBe(
      t('errors.viewmodel.export.notFound', {
        viewModelName: 'Bicicleta',
        tsFilePath: CONVERSOR_TS_FILE,
        suggestedName,
      }),
    )
  })
})
