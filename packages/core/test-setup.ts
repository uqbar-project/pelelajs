import { initializeI18n } from './src/commons/i18n'

// Initialize i18n once for all tests to ensure t() works in unit tests
// isolated from bootstrap().
initializeI18n('en')
