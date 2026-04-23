import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type RegistrationType = 'duplicate' | 'missing'

export class ViewModelRegistrationError extends PelelaError {
  constructor(
    public readonly viewModelName: string,
    public readonly type: RegistrationType,
    options?: ErrorOptions,
  ) {
    super(
      t(`errors.viewmodel.registration.${type}`, {
        name: viewModelName,
      }),
      options,
    )
  }
}
