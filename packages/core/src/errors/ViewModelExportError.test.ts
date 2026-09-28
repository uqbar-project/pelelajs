import { describe, expect, it } from 'vitest'
import { initializeI18n, t } from '../commons/i18n'
import type { ViewModelExportErrorParams } from './ViewModelExportError'
import { ViewModelExportError } from './ViewModelExportError'

const CONVERTER_TS_FILE = 'src/converter.ts'
const CONVERTER_CLASS_NAME = 'Converter'
const CONVERTER_VIEW_MODEL = 'converter'

describe('ViewModelExportError', () => {
  it('builds the English message when the class is not exported', () => {
    initializeI18n('en')
    const params: ViewModelExportErrorParams = {
      kind: 'missingExport',
      viewModelName: CONVERTER_CLASS_NAME,
      tsFilePath: CONVERTER_TS_FILE,
    }

    const error = new ViewModelExportError(params)

    expect(error.message).toBe(
      t('errors.viewmodel.export.missingExport', {
        viewModelName: CONVERTER_CLASS_NAME,
        tsFilePath: CONVERTER_TS_FILE,
      }),
    )
    expect(error).toBeInstanceOf(Error)
  })

  it('builds the Spanish message when the class differs in case', () => {
    initializeI18n('es')
    const params: ViewModelExportErrorParams = {
      kind: 'wrongCase',
      viewModelName: CONVERTER_VIEW_MODEL,
      expectedName: CONVERTER_CLASS_NAME,
      tsFilePath: CONVERTER_TS_FILE,
    }

    const error = new ViewModelExportError(params)

    expect(error.message).toBe(
      t('errors.viewmodel.export.wrongCase', {
        viewModelName: CONVERTER_VIEW_MODEL,
        expectedName: CONVERTER_CLASS_NAME,
        tsFilePath: CONVERTER_TS_FILE,
      }),
    )
  })

  it('builds the Spanish message when no class matches, suggesting the module-derived name', () => {
    initializeI18n('es')
    const suggestedName = 'Counter'
    const params: ViewModelExportErrorParams = {
      kind: 'notFound',
      viewModelName: 'Bicycle',
      tsFilePath: CONVERTER_TS_FILE,
      suggestedName,
    }

    const error = new ViewModelExportError(params)

    expect(error.message).toBe(
      t('errors.viewmodel.export.notFound', {
        viewModelName: 'Bicycle',
        tsFilePath: CONVERTER_TS_FILE,
        suggestedName,
      }),
    )
  })

  it('builds the Spanish message when the view model is an object, not a class', () => {
    initializeI18n('es')
    const params: ViewModelExportErrorParams = {
      kind: 'notAClass',
      viewModelName: 'converterObj',
      tsFilePath: CONVERTER_TS_FILE,
      declaredAs: 'Object',
    }

    const error = new ViewModelExportError(params)

    expect(error.message).toBe(
      t('errors.viewmodel.export.notAClassObject', {
        viewModelName: 'converterObj',
        tsFilePath: CONVERTER_TS_FILE,
      }),
    )
  })

  it('builds the Spanish message when the view model is a function, not a class', () => {
    initializeI18n('es')
    const params: ViewModelExportErrorParams = {
      kind: 'notAClass',
      viewModelName: 'converter',
      tsFilePath: CONVERTER_TS_FILE,
      declaredAs: 'Function',
    }

    const error = new ViewModelExportError(params)

    expect(error.message).toBe(
      t('errors.viewmodel.export.notAClassFunction', {
        viewModelName: 'converter',
        tsFilePath: CONVERTER_TS_FILE,
      }),
    )
  })
})
