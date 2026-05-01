import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type RegistrationType = 'duplicate' | 'missing'

export class ViewModelRegistrationError extends PelelaError {
  static readonly I18N_CODES = {
    duplicate: 'errors.viewmodel.registration.duplicate',
    missing: 'errors.viewmodel.registration.missing',
  } as const

  get i18nCode() {
    return ViewModelRegistrationError.I18N_CODES[this.type]
  }

  constructor(
    public readonly viewModelName: string,
    public readonly type: RegistrationType,
    options?: ErrorOptions,
  ) {
    super(
      t(ViewModelRegistrationError.I18N_CODES[type], {
        name: viewModelName,
      }),
      options,
    )
  }
}
