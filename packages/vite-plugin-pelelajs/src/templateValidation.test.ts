import { initializeI18n, t } from 'pelelajs'
import { beforeEach, describe, expect, it } from 'vitest'
import { validatePelelaSource } from './templateValidation'

const FILE_PATH = '/project/src/home.pelela'
const HOME_VIEW_MODEL = 'Home'
const PERSON_ROW_TAG = 'person-row'
const PERSON_ROW_COLLAPSED_TAG = 'personrow'
const PERSON_ROW_CAMEL_TAG = 'personRow'
const PERSON_ROW_PASCAL_TAG = 'PersonRow'
const COUNTER_TAG = 'counter'
const INVALID_ATTRIBUTE = 'value'

function pelelaTemplate(content: string): string {
  return `<pelela view-model="${HOME_VIEW_MODEL}">${content}</pelela>`
}

function validateTemplate(sourceCode: string, knownComponentTags: string[] = []): string[] {
  const errors: string[] = []

  validatePelelaSource({
    sourceCode,
    filePath: FILE_PATH,
    knownComponentTags,
    errorFn: (message) => {
      errors.push(message)
    },
  })

  return errors
}

describe('validatePelelaSource', () => {
  beforeEach(() => {
    initializeI18n('en')
  })

  it('returns the declared view model name for a valid pelela template', () => {
    const errors: string[] = []

    const viewModelName = validatePelelaSource({
      sourceCode: pelelaTemplate(`<${COUNTER_TAG}></${COUNTER_TAG}>`),
      filePath: FILE_PATH,
      knownComponentTags: [COUNTER_TAG],
      errorFn: (message) => {
        errors.push(message)
      },
    })

    expect(viewModelName).toBe(HOME_VIEW_MODEL)
    expect(errors).toEqual([])
  })

  it('returns the declared view model name when it uses single quotes', () => {
    const errors: string[] = []

    const viewModelName = validatePelelaSource({
      sourceCode: `<pelela view-model='${HOME_VIEW_MODEL}'>
        <${COUNTER_TAG}></${COUNTER_TAG}>
      </pelela>`,
      filePath: FILE_PATH,
      knownComponentTags: [COUNTER_TAG],
      errorFn: (message) => {
        errors.push(message)
      },
    })

    expect(viewModelName).toBe(HOME_VIEW_MODEL)
    expect(errors).toEqual([])
  })

  it('reports an error when a component tag uses camelCase', () => {
    const errors = validateTemplate(
      pelelaTemplate(`<${PERSON_ROW_CAMEL_TAG}></${PERSON_ROW_CAMEL_TAG}>`),
    )

    expect(errors).toContain(
      t('errors.compiler.invalidComponentTagCase', {
        tag: PERSON_ROW_CAMEL_TAG,
        suggestedTag: PERSON_ROW_TAG,
      }),
    )
  })

  it('reports an error when a component tag uses PascalCase', () => {
    const errors = validateTemplate(
      pelelaTemplate(`<${PERSON_ROW_PASCAL_TAG}></${PERSON_ROW_PASCAL_TAG}>`),
    )

    expect(errors).toContain(
      t('errors.compiler.invalidComponentTagCase', {
        tag: PERSON_ROW_PASCAL_TAG,
        suggestedTag: PERSON_ROW_TAG,
      }),
    )
  })

  it('reports an error when a component tag collapsed a known kebab-case tag', () => {
    const errors = validateTemplate(
      pelelaTemplate(`<${PERSON_ROW_COLLAPSED_TAG}></${PERSON_ROW_COLLAPSED_TAG}>`),
      [PERSON_ROW_TAG],
    )

    expect(errors).toContain(
      t('errors.compiler.invalidComponentTagCase', {
        tag: PERSON_ROW_COLLAPSED_TAG,
        suggestedTag: PERSON_ROW_TAG,
      }),
    )
  })

  it('does not suggest a kebab-case tag when the collapsed component tag is ambiguous', () => {
    const errors = validateTemplate(
      pelelaTemplate(`<${PERSON_ROW_COLLAPSED_TAG}></${PERSON_ROW_COLLAPSED_TAG}>`),
      [PERSON_ROW_TAG, 'personr-ow'],
    )

    expect(errors).toEqual([])
  })

  it('accepts a known single-word component tag', () => {
    const errors = validateTemplate(pelelaTemplate(`<${COUNTER_TAG}></${COUNTER_TAG}>`), [
      COUNTER_TAG,
    ])

    expect(errors).toEqual([])
  })

  it('reports an error when a component attribute does not use a component binding prefix', () => {
    const errors = validateTemplate(
      pelelaTemplate(`<${PERSON_ROW_TAG} ${INVALID_ATTRIBUTE}="x"></${PERSON_ROW_TAG}>`),
      [PERSON_ROW_TAG],
    )

    expect(errors).toContain(
      t('errors.compiler.invalidComponentAttribute', {
        tag: PERSON_ROW_TAG,
        attr: INVALID_ATTRIBUTE,
      }),
    )
  })
})
