import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export class DOMEnvironmentError extends PelelaError {
  constructor(options?: ErrorOptions) {
    super(t('errors.security.domEnvironmentRequired'), options)
  }
}
