import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import { en } from '../../src/i18n/en'
import { es } from '../../src/i18n/es'
import { interpolate, t } from '../../src/i18n/index'
import { setLanguage } from '../vscode-stub'

const UNKNOWN_LANGUAGE = 'fr'
const ENGLISH_LANGUAGE = 'en'
const SPANISH_LANGUAGE = 'es'
const REGIONAL_SPANISH_LANGUAGE = 'es-AR'
const EMPTY_VALUE = ''
const MISSING_KEY = 'commands.rename.doesNotExist'
const LEAF_PATH_KEY = 'commands.rename.title.extra'

function collectKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, entry]) =>
    collectKeys(entry, prefix === '' ? key : `${prefix}.${key}`)
  )
}

describe('interpolate', () => {
  it('replaces a single placeholder', () => {
    assert.strictEqual(interpolate('Hello {{name}}', { name: 'World' }), 'Hello World')
  })

  it('replaces multiple different placeholders', () => {
    assert.strictEqual(interpolate('{{a}} and {{b}}', { a: 'foo', b: 'bar' }), 'foo and bar')
  })

  it('replaces the same placeholder multiple times', () => {
    assert.strictEqual(interpolate('{{a}} and {{a}}', { a: 'x' }), 'x and x')
  })

  it('returns the template unchanged when no params match', () => {
    assert.strictEqual(interpolate('Hello {{name}}', { other: 'value' }), 'Hello {{name}}')
  })

  it('handles empty params', () => {
    assert.strictEqual(interpolate('no placeholders', {}), 'no placeholders')
  })
})

describe('translations', () => {
  it('keeps every locale with the same keys', () => {
    assert.deepEqual(collectKeys(es).sort(), collectKeys(en).sort())
  })

  it('has no empty messages', () => {
    ;[...collectKeys(es), ...collectKeys(en)].forEach((key) => {
      setLanguage(SPANISH_LANGUAGE)
      assert.notEqual(t(key), EMPTY_VALUE)
      setLanguage(ENGLISH_LANGUAGE)
      assert.notEqual(t(key), EMPTY_VALUE)
    })
  })
})

describe('t', () => {
  it('resolves a nested key in Spanish by default', () => {
    assert.equal(t('commands.rename.title'), es.commands.rename.title)
  })

  it('resolves a regional Spanish locale', () => {
    setLanguage(REGIONAL_SPANISH_LANGUAGE)

    assert.equal(t('commands.new.title'), es.commands.new.title)
  })

  it('resolves the English locale', () => {
    setLanguage(ENGLISH_LANGUAGE)

    assert.equal(t('commands.new.title'), en.commands.new.title)
  })

  it('falls back to Spanish for unsupported locales', () => {
    setLanguage(UNKNOWN_LANGUAGE)

    assert.equal(t('commands.move.title'), es.commands.move.title)
  })

  it('returns the key when the message is missing', () => {
    assert.equal(t(MISSING_KEY), MISSING_KEY)
  })

  it('returns the key when the path crosses a leaf value', () => {
    assert.equal(t(LEAF_PATH_KEY), LEAF_PATH_KEY)
  })

  it('interpolates the given parameters', () => {
    assert.equal(
      t('commands.rename.success', { name: 'NavBar' }),
      interpolate(es.commands.rename.success, { name: 'NavBar' })
    )
  })
})
