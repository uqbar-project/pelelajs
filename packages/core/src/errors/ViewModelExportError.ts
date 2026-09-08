import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type ViewModelExportErrorKind = 'missingExport' | 'wrongCase' | 'notFound' | 'notAClass'

export type DeclaredAs = 'Function' | 'Object'

export type ViewModelExportErrorParams =
  | { kind: 'missingExport'; viewModelName: string; tsFilePath: string }
  | { kind: 'wrongCase'; viewModelName: string; tsFilePath: string; expectedName: string }
  | { kind: 'notFound'; viewModelName: string; tsFilePath: string; suggestedName: string }
  | { kind: 'notAClass'; viewModelName: string; tsFilePath: string; declaredAs: DeclaredAs }

function buildViewModelExportMessage(params: ViewModelExportErrorParams): string {
  switch (params.kind) {
    case 'missingExport':
      return t('errors.viewmodel.export.missingExport', {
        viewModelName: params.viewModelName,
        tsFilePath: params.tsFilePath,
      })
    case 'wrongCase':
      return t('errors.viewmodel.export.wrongCase', {
        viewModelName: params.viewModelName,
        expectedName: params.expectedName,
        tsFilePath: params.tsFilePath,
      })
    case 'notFound':
      return t('errors.viewmodel.export.notFound', {
        viewModelName: params.viewModelName,
        tsFilePath: params.tsFilePath,
        suggestedName: params.suggestedName,
      })
    case 'notAClass':
      return params.declaredAs === 'Function'
        ? t('errors.viewmodel.export.notAClassFunction', {
            viewModelName: params.viewModelName,
            tsFilePath: params.tsFilePath,
          })
        : t('errors.viewmodel.export.notAClassObject', {
            viewModelName: params.viewModelName,
            tsFilePath: params.tsFilePath,
          })
  }
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
    super(buildViewModelExportMessage(params), options)
  }
}
