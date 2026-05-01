import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export class DOMEnvironmentError extends PelelaError {
  static readonly I18N_CODE = 'errors.security.domEnvironmentRequired' as const

  get i18nCode() {
    return DOMEnvironmentError.I18N_CODE
  }

  constructor(options?: ErrorOptions) {
    super(t(DOMEnvironmentError.I18N_CODE), options)
  }
}
