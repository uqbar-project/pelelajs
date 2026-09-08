import { describe, expect, it } from 'vitest'
import { analyzeViewModelModule, classifyViewModelIssue, pascalCaseFromFileName } from './index'

const CONVERSOR_SOURCE = 'export class Conversor {}'
const CONVERSOR_VIEW_MODEL = 'conversor'
const CONVERSOR_CLASS_NAME = 'Conversor'

describe('analyzeViewModelModule', () => {
  it('collects an exported class in both exported and declared names', () => {
    const analysis = analyzeViewModelModule(CONVERSOR_SOURCE)

    expect(analysis).toEqual({
      exportedNames: [CONVERSOR_CLASS_NAME],
      declaredNames: [CONVERSOR_CLASS_NAME],
    })
  })

  it('collects each name of a multi-declaration export', () => {
    const analysis = analyzeViewModelModule('export const miles = 0, kilometers = 1')

    expect(analysis).toEqual({
      exportedNames: ['miles', 'kilometers'],
      declaredNames: ['miles', 'kilometers'],
    })
  })

  it('collects exported names from an export list respecting aliases', () => {
    const analysis = analyzeViewModelModule('export { Converter, MiniConverter as ConverterV2 }')

    expect(analysis.exportedNames).toEqual(['Converter', 'ConverterV2'])
  })

  it('does not treat a default export as a named export', () => {
    const analysis = analyzeViewModelModule(`export default class ${CONVERSOR_CLASS_NAME} {}`)

    expect(analysis).toEqual({
      exportedNames: [],
      declaredNames: [CONVERSOR_CLASS_NAME],
    })
  })

  it('keeps declared names separate from exported names', () => {
    const analysis = analyzeViewModelModule(`class ${CONVERSOR_CLASS_NAME} {}`)

    expect(analysis).toEqual({
      exportedNames: [],
      declaredNames: [CONVERSOR_CLASS_NAME],
    })
  })

  it('collects interfaces, types, enums and functions', () => {
    const analysis = analyzeViewModelModule(
      'export interface Person {}; export type Id = number; export enum Status {}; export function init() {}',
    )

    expect(analysis.exportedNames).toEqual(['Person', 'Id', 'Status', 'init'])
  })

  it('returns null for exported names when a re-export is present', () => {
    const analysis = analyzeViewModelModule(`export * from './models'`)

    expect(analysis.exportedNames).toBeNull()
  })
})

describe('classifyViewModelIssue', () => {
  it('returns ok when the view model matches an exported name exactly', () => {
    const analysis = analyzeViewModelModule(CONVERSOR_SOURCE)
    const issue = classifyViewModelIssue(analysis, CONVERSOR_CLASS_NAME, CONVERSOR_CLASS_NAME)

    expect(issue).toEqual({ kind: 'ok' })
  })

  it('returns ok when a lowercase class matches the lowercase view model', () => {
    const analysis = analyzeViewModelModule(`export class ${CONVERSOR_VIEW_MODEL} {}`)
    const issue = classifyViewModelIssue(analysis, CONVERSOR_VIEW_MODEL, CONVERSOR_CLASS_NAME)

    expect(issue).toEqual({ kind: 'ok' })
  })

  it('skips validation when exported names cannot be determined', () => {
    const analysis = analyzeViewModelModule(`export * from './models'`)
    const issue = classifyViewModelIssue(analysis, CONVERSOR_VIEW_MODEL, CONVERSOR_CLASS_NAME)

    expect(issue).toEqual({ kind: 'ok' })
  })

  it('reports missingExport when the class is declared but not exported', () => {
    const analysis = analyzeViewModelModule(`class ${CONVERSOR_CLASS_NAME} {}`)
    const issue = classifyViewModelIssue(analysis, CONVERSOR_CLASS_NAME, CONVERSOR_CLASS_NAME)

    expect(issue).toEqual({ kind: 'missingExport', viewModelName: CONVERSOR_CLASS_NAME })
  })

  it('reports missingExport for a default export class', () => {
    const analysis = analyzeViewModelModule(`export default class ${CONVERSOR_CLASS_NAME} {}`)
    const issue = classifyViewModelIssue(analysis, CONVERSOR_CLASS_NAME, CONVERSOR_CLASS_NAME)

    expect(issue).toEqual({ kind: 'missingExport', viewModelName: CONVERSOR_CLASS_NAME })
  })

  it('reports missingExport when a declared class differs in case but is not exported', () => {
    const analysis = analyzeViewModelModule(`class ${CONVERSOR_CLASS_NAME} {}`)
    const issue = classifyViewModelIssue(analysis, CONVERSOR_VIEW_MODEL, CONVERSOR_CLASS_NAME)

    expect(issue).toEqual({ kind: 'missingExport', viewModelName: CONVERSOR_VIEW_MODEL })
  })

  it('reports wrongCase when an exported class differs only by case', () => {
    const analysis = analyzeViewModelModule(CONVERSOR_SOURCE)
    const issue = classifyViewModelIssue(analysis, CONVERSOR_VIEW_MODEL, CONVERSOR_CLASS_NAME)

    expect(issue).toEqual({
      kind: 'wrongCase',
      viewModelName: CONVERSOR_VIEW_MODEL,
      expectedName: CONVERSOR_CLASS_NAME,
    })
  })

  it('reports notFound when no declared or exported class matches', () => {
    const analysis = analyzeViewModelModule(CONVERSOR_SOURCE)
    const issue = classifyViewModelIssue(analysis, 'Bicicleta', CONVERSOR_CLASS_NAME)

    expect(issue).toEqual({
      kind: 'notFound',
      viewModelName: 'Bicicleta',
      suggestedName: CONVERSOR_CLASS_NAME,
    })
  })
})

describe('pascalCaseFromFileName', () => {
  it('capitalizes a single lowercase word', () => {
    expect(pascalCaseFromFileName('conversor')).toBe('Conversor')
  })

  it('converts kebab-case segments to PascalCase', () => {
    expect(pascalCaseFromFileName('conversor-medidas')).toBe('ConversorMedidas')
  })

  it('handles dots as separators', () => {
    expect(pascalCaseFromFileName('foo.tsfile')).toBe('FooTsfile')
  })
})
