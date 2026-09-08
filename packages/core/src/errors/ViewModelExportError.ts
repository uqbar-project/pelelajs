import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type ViewModelExportErrorKind = 'missingExport' | 'wrongCase' | 'notFound'

export type ViewModelExportErrorParams = {
  kind: ViewModelExportErrorKind
  viewModelName: string
  tsFilePath: string
  expectedName?: string
  suggestedName?: string
}

const viewModelExportMessageBuilders: Record<
  ViewModelExportErrorKind,
  (params: ViewModelExportErrorParams) => string
> = {
  missingExport: ({ viewModelName, tsFilePath }) =>
    t('errors.viewmodel.export.missingExport', { viewModelName, tsFilePath }),
  wrongCase: ({ viewModelName, expectedName, tsFilePath }) =>
    t('errors.viewmodel.export.wrongCase', { viewModelName, expectedName, tsFilePath }),
  notFound: ({ viewModelName, tsFilePath, suggestedName }) =>
    t('errors.viewmodel.export.notFound', { viewModelName, tsFilePath, suggestedName }),
}

/**
 * Thrown when a view-model attribute does not match the exported class of its .ts file.
 * The vite plugin detects the mismatch at build time and registers this error to be
 * raised at runtime, right before the component is instantiated, so the user gets an
 * actionable message instead of a blank screen.
 */
export class ViewModelExportError extends PelelaError {
  constructor(
    public readonly params: ViewModelExportErrorParams,
    options?: ErrorOptions,
  ) {
    super(viewModelExportMessageBuilders[params.kind](params), options)
  }
}
