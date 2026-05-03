import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type RegistrationType = 'duplicate' | 'missing'

const viewModelRegistrationMessageBuilders = {
  duplicate: (viewModelName: string) =>
    t('errors.viewmodel.registration.duplicate', { name: viewModelName }),
  missing: (viewModelName: string) =>
    t('errors.viewmodel.registration.missing', { name: viewModelName }),
} as const satisfies Record<RegistrationType, (viewModelName: string) => string>

export class ViewModelRegistrationError extends PelelaError {
  constructor(
    public readonly viewModelName: string,
    public readonly type: RegistrationType,
    options?: ErrorOptions,
  ) {
    super(viewModelRegistrationMessageBuilders[type](viewModelName), options)
  }
}
