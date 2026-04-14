import { beforeEach } from 'vitest'
import { initializeI18n } from './src/commons/i18n'

// Ensure deterministic locale for every test case.
beforeEach(() => {
  initializeI18n('en')
})
