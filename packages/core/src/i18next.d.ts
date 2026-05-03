import 'i18next'
import type { coreI18nDefaultNamespace, coreI18nResources } from './commons/resources'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof coreI18nDefaultNamespace
    resources: (typeof coreI18nResources)['en']
  }
}
