import { describe, expect, it } from 'vitest'
import {
  analyzeViewModelModule,
  classifyViewModelIssue,
  extractViewModelPropertyTypes,
  pascalCaseFromFileName,
} from './index'

const CONVERTER_SOURCE = 'export class Converter {}'
const CONVERTER_VIEW_MODEL = 'converter'
const CONVERTER_CLASS_NAME = 'Converter'

describe('analyzeViewModelModule', () => {
  it('collects an exported class in both exported and declared names', () => {
    const analysis = analyzeViewModelModule(CONVERTER_SOURCE)

    expect(analysis).toEqual({
      exportedNames: [CONVERTER_CLASS_NAME],
      declaredNames: [CONVERTER_CLASS_NAME],
      classNames: [CONVERTER_CLASS_NAME],
      functionNames: [],
    })
  })

  it('collects each name of a multi-declaration export', () => {
    const analysis = analyzeViewModelModule('export const miles = 0, kilometers = 1')

    expect(analysis).toEqual({
      exportedNames: ['miles', 'kilometers'],
      declaredNames: ['miles', 'kilometers'],
      classNames: [],
      functionNames: [],
    })
  })

  it('collects exported names from an export list respecting aliases', () => {
    const analysis = analyzeViewModelModule('export { Converter, MiniConverter as ConverterV2 }')

    expect(analysis.exportedNames).toEqual(['Converter', 'ConverterV2'])
  })

  it('does not treat a default export as a named export', () => {
    const analysis = analyzeViewModelModule(`export default class ${CONVERTER_CLASS_NAME} {}`)

    expect(analysis).toEqual({
      exportedNames: [],
      declaredNames: [CONVERTER_CLASS_NAME],
      classNames: [CONVERTER_CLASS_NAME],
      functionNames: [],
    })
  })

  it('keeps declared names separate from exported names', () => {
    const analysis = analyzeViewModelModule(`class ${CONVERTER_CLASS_NAME} {}`)

    expect(analysis).toEqual({
      exportedNames: [],
      declaredNames: [CONVERTER_CLASS_NAME],
      classNames: [CONVERTER_CLASS_NAME],
      functionNames: [],
    })
  })

  it('collects declared function names separately from classes', () => {
    const analysis = analyzeViewModelModule('export function init() {}')

    expect(analysis.functionNames).toEqual(['init'])
    expect(analysis.classNames).toEqual([])
  })

  it('collects every function declarator from a single variable statement', () => {
    const analysis = analyzeViewModelModule('export const app = () => {}, App = function () {}')

    expect(analysis.functionNames).toEqual(['app', 'App'])
    expect(analysis.classNames).toEqual([])
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

  it('collects no exported names from a type-only export declaration', () => {
    const analysis = analyzeViewModelModule('export type { Converter }')

    expect(analysis.exportedNames).toEqual([])
  })

  it('ignores type-only specifiers within a named export', () => {
    const analysis = analyzeViewModelModule('export { type Converter, converter }')

    expect(analysis.exportedNames).toEqual(['converter'])
  })

  it('collects no exported names from a type-only re-export', () => {
    const analysis = analyzeViewModelModule(`export type * from './models'`)

    expect(analysis.exportedNames).toEqual([])
  })

  it('collects no exported names from a namespace re-export', () => {
    const analysis = analyzeViewModelModule(`export * as models from './models'`)

    expect(analysis).toEqual({
      exportedNames: [],
      declaredNames: [],
      classNames: [],
      functionNames: [],
    })
  })

  it('collects no function name from an anonymous default function export', () => {
    const analysis = analyzeViewModelModule('export default function () {}')

    expect(analysis).toEqual({
      exportedNames: [],
      declaredNames: [],
      classNames: [],
      functionNames: [],
    })
  })
})

describe('classifyViewModelIssue', () => {
  it('returns ok when the view model matches an exported name exactly', () => {
    const analysis = analyzeViewModelModule(CONVERTER_SOURCE)
    const issue = classifyViewModelIssue(analysis, CONVERTER_CLASS_NAME, CONVERTER_CLASS_NAME)

    expect(issue).toEqual({ kind: 'ok' })
  })

  it('returns ok when a lowercase class matches the lowercase view model', () => {
    const analysis = analyzeViewModelModule(`export class ${CONVERTER_VIEW_MODEL} {}`)
    const issue = classifyViewModelIssue(analysis, CONVERTER_VIEW_MODEL, CONVERTER_CLASS_NAME)

    expect(issue).toEqual({ kind: 'ok' })
  })

  it('reports notAClass as an Object when the view model is an exported object literal', () => {
    const analysis = analyzeViewModelModule(
      'export const converterObject = { miles: 100, convert: () => 0 }',
    )
    const issue = classifyViewModelIssue(analysis, 'converterObject', 'ConverterObject')

    expect(issue).toEqual({
      kind: 'notAClass',
      viewModelName: 'converterObject',
      declaredAs: 'Object',
    })
  })

  it('reports notAClass as a Function when the view model is an exported function', () => {
    const analysis = analyzeViewModelModule('export function conversor() {}')
    const issue = classifyViewModelIssue(analysis, 'conversor', 'Conversor')

    expect(issue).toEqual({ kind: 'notAClass', viewModelName: 'conversor', declaredAs: 'Function' })
  })

  it('reports notAClass as a Function when the view model is an exported arrow function', () => {
    const analysis = analyzeViewModelModule('export const App = () => {}')
    const issue = classifyViewModelIssue(analysis, 'App', 'App')

    expect(issue).toEqual({ kind: 'notAClass', viewModelName: 'App', declaredAs: 'Function' })
  })

  it('reports notAClass as a Function when the view model is an exported function expression', () => {
    const analysis = analyzeViewModelModule('export const App = function () {}')
    const issue = classifyViewModelIssue(analysis, 'App', 'App')

    expect(issue).toEqual({ kind: 'notAClass', viewModelName: 'App', declaredAs: 'Function' })
  })

  it('returns ok for a re-exported binding declared in another module', () => {
    const analysis = analyzeViewModelModule(`export { ${CONVERTER_CLASS_NAME} } from './model'`)
    const issue = classifyViewModelIssue(analysis, CONVERTER_CLASS_NAME, CONVERTER_CLASS_NAME)

    expect(issue).toEqual({ kind: 'ok' })
  })

  it('skips validation when exported names cannot be determined', () => {
    const analysis = analyzeViewModelModule(`export * from './models'`)
    const issue = classifyViewModelIssue(analysis, CONVERTER_VIEW_MODEL, CONVERTER_CLASS_NAME)

    expect(issue).toEqual({ kind: 'ok' })
  })

  it('reports missingExport when the class is declared but not exported', () => {
    const analysis = analyzeViewModelModule(`class ${CONVERTER_CLASS_NAME} {}`)
    const issue = classifyViewModelIssue(analysis, CONVERTER_CLASS_NAME, CONVERTER_CLASS_NAME)

    expect(issue).toEqual({ kind: 'missingExport', viewModelName: CONVERTER_CLASS_NAME })
  })

  it('reports missingExport for a default export class', () => {
    const analysis = analyzeViewModelModule(`export default class ${CONVERTER_CLASS_NAME} {}`)
    const issue = classifyViewModelIssue(analysis, CONVERTER_CLASS_NAME, CONVERTER_CLASS_NAME)

    expect(issue).toEqual({ kind: 'missingExport', viewModelName: CONVERTER_CLASS_NAME })
  })

  it('reports missingExport when the class is only exported as a type', () => {
    const analysis = analyzeViewModelModule(`export type { ${CONVERTER_CLASS_NAME} }
class ${CONVERTER_CLASS_NAME} {}`)
    const issue = classifyViewModelIssue(analysis, CONVERTER_CLASS_NAME, CONVERTER_CLASS_NAME)

    expect(issue).toEqual({ kind: 'missingExport', viewModelName: CONVERTER_CLASS_NAME })
  })

  it('reports missingExport when the only named export is type-only', () => {
    const analysis = analyzeViewModelModule(`class ${CONVERTER_CLASS_NAME} {}
export { type ${CONVERTER_CLASS_NAME} }`)
    const issue = classifyViewModelIssue(analysis, CONVERTER_CLASS_NAME, CONVERTER_CLASS_NAME)

    expect(issue).toEqual({ kind: 'missingExport', viewModelName: CONVERTER_CLASS_NAME })
  })

  it('reports missingExport when a declared class differs in case but is not exported', () => {
    const analysis = analyzeViewModelModule(`class ${CONVERTER_CLASS_NAME} {}`)
    const issue = classifyViewModelIssue(analysis, CONVERTER_VIEW_MODEL, CONVERTER_CLASS_NAME)

    expect(issue).toEqual({ kind: 'missingExport', viewModelName: CONVERTER_VIEW_MODEL })
  })

  it('reports wrongCase when an exported class differs only by case', () => {
    const analysis = analyzeViewModelModule(CONVERTER_SOURCE)
    const issue = classifyViewModelIssue(analysis, CONVERTER_VIEW_MODEL, CONVERTER_CLASS_NAME)

    expect(issue).toEqual({
      kind: 'wrongCase',
      viewModelName: CONVERTER_VIEW_MODEL,
      expectedName: CONVERTER_CLASS_NAME,
    })
  })

  it('reports notFound when no declared or exported class matches', () => {
    const analysis = analyzeViewModelModule(CONVERTER_SOURCE)
    const issue = classifyViewModelIssue(analysis, 'Bicycle', CONVERTER_CLASS_NAME)

    expect(issue).toEqual({
      kind: 'notFound',
      viewModelName: 'Bicycle',
      suggestedName: CONVERTER_CLASS_NAME,
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

  it('returns an empty name for an empty file name', () => {
    expect(pascalCaseFromFileName('')).toBe('')
  })
})

describe('extractViewModelPropertyTypes', () => {
  const extractCounter = (tsSource: string) => extractViewModelPropertyTypes(tsSource, 'Counter')

  it('classifies typed properties, initializer-inferred properties and definite-assignment properties', () => {
    const types = extractViewModelPropertyTypes(
      `export class Counter {
  value = 0
  total = 0
  quantity!: number
  active = false
  label = ''
  config = {}
  when: Date = new Date()
  items: string[] = []
  dynamic
}`,
      'Counter',
    )

    expect(types).toEqual({
      value: 'number',
      total: 'number',
      quantity: 'number',
      active: 'boolean',
      label: 'string',
      config: 'other',
      when: 'other',
      items: 'other',
      dynamic: 'unknown',
    })
  })

  it('drops nullable union members to classify number | undefined as number', () => {
    const types = extractCounter('export class Counter {\n  fromNumber: number | undefined\n}')

    expect(types).toEqual({ fromNumber: 'number' })
  })

  it('classifies a homogeneous nullable union as its const kind regardless of member order', () => {
    const numberFirst = extractCounter(
      'export class Counter {\n  fromNumber: number | null | undefined\n}',
    )
    const nullFirst = extractCounter('export class Counter {\n  fromNumber: null | number\n}')

    expect(numberFirst).toEqual({ fromNumber: 'number' })
    expect(nullFirst).toEqual({ fromNumber: 'number' })
  })

  it('marks a heterogeneous union as other regardless of member order', () => {
    const stringFirst = extractCounter('export class Counter {\n  mixed: string | number\n}')
    const numberFirst = extractCounter('export class Counter {\n  mixed: number | string\n}')

    expect(stringFirst).toEqual({ mixed: 'other' })
    expect(numberFirst).toEqual({ mixed: 'other' })
  })

  it('drops nullable members before classifying a heterogeneous union as other', () => {
    const types = extractCounter('export class Counter {\n  mixed: number | string | undefined\n}')

    expect(types).toEqual({ mixed: 'other' })
  })

  it('classifies getters from their return type annotation', () => {
    const types = extractCounter(`export class Counter {
  private _count = 1

  get count(): number {
    return this._count
  }
}`)

    expect(types).toEqual({ count: 'number' })
  })

  it('classifies getters from their returned literal when there is no annotation', () => {
    const types = extractCounter(`export class Counter {
  get toggled() {
    return true
  }
}`)

    expect(types).toEqual({ toggled: 'boolean' })
  })

  it('classifies constructor parameter properties from their parameter type', () => {
    const types = extractCounter(
      'export class Counter {\n  constructor(public title: string) {}\n}',
    )

    expect(types).toEqual({ title: 'string' })
  })

  it('ignores static members', () => {
    const types = extractCounter('export class Counter {\n  static total = 0\n  value = 0\n}')

    expect(types).toEqual({ value: 'number' })
  })

  it('ignores private and protected members', () => {
    const types = extractCounter(
      'export class Counter {\n  private _count = 1\n  protected hidden = 0\n  value = 0\n}',
    )

    expect(types).toEqual({ value: 'number' })
  })

  it('ignores private and protected parameter properties', () => {
    const types = extractCounter(
      'export class Counter {\n  constructor(private hidden: string, protected reserved: number) {}\n}',
    )

    expect(types).toEqual({})
  })

  it('collects base class types for same-file inheritance and prefers own members', () => {
    const types = extractViewModelPropertyTypes(
      `export class BaseCounter {
  base = 0
  shared = 'from-base'
}

export class Counter extends BaseCounter {
  shared = 2
  own = 1
}`,
      'Counter',
    )

    expect(types).toEqual({ base: 'number', shared: 'number', own: 'number' })
  })

  it('returns an empty map when the class does not exist', () => {
    const types = extractViewModelPropertyTypes('export class BaseCounter {}', 'MissingClass')

    expect(types).toEqual({})
  })

  it('classifies a typed boolean property from its type annotation', () => {
    const types = extractCounter('export class Counter {\n  enabled: boolean\n}')

    expect(types).toEqual({ enabled: 'boolean' })
  })

  it('classifies a string literal type annotation as string', () => {
    const types = extractCounter('export class Counter {\n  label: "counter"\n}')

    expect(types).toEqual({ label: 'string' })
  })

  it('classifies a number literal type annotation as number', () => {
    const types = extractCounter('export class Counter {\n  base: 10\n}')

    expect(types).toEqual({ base: 'number' })
  })

  it('classifies a boolean literal type annotation as boolean', () => {
    const types = extractCounter('export class Counter {\n  enabled: true\n}')

    expect(types).toEqual({ enabled: 'boolean' })
  })

  it('classifies a union of only nullish members as unknown', () => {
    const types = extractCounter('export class Counter {\n  bridge: null | undefined\n}')

    expect(types).toEqual({ bridge: 'unknown' })
  })

  it('classifies a negative numeric literal initializer as number', () => {
    const types = extractCounter('export class Counter {\n  undone = -5\n}')

    expect(types).toEqual({ undone: 'number' })
  })

  it('unwraps parenthesized, asserted and casted initializer expressions', () => {
    const types = extractCounter(
      `export class Counter {
  parenthesized = (1)
  asserted = 0 as number
  casted = <number>2
}`,
    )

    expect(types).toEqual({ parenthesized: 'number', asserted: 'number', casted: 'number' })
  })

  it('classifies untyped array and construction initializers as other', () => {
    const types = extractCounter(
      `export class Counter {
  tags = []
  createdAt = new Date()
}`,
    )

    expect(types).toEqual({ tags: 'other', createdAt: 'other' })
  })

  it('classifies an identifier initializer without a type annotation as unknown', () => {
    const types = extractCounter('export class Counter {\n  alias = label\n}')

    expect(types).toEqual({ alias: 'unknown' })
  })

  it('classifies a getter with no annotation or returned value as unknown', () => {
    const types = extractCounter(`export class Counter {
  private _touched = true

  get touched() {
    this._touched = true
  }
}`)

    expect(types).toEqual({ touched: 'unknown' })
  })

  it('ignores plain constructor parameters that are not parameter properties', () => {
    const types = extractCounter(
      'export class Counter {\n  value = 1\n  constructor(todo: string) {}\n}',
    )

    expect(types).toEqual({ value: 'number' })
  })

  it('classifies typeless parameter properties from their name only', () => {
    const types = extractCounter('export class Counter {\n  constructor(public title) {}\n}')

    expect(types).toEqual({ title: 'unknown' })
  })

  it('ignores private and protected getters', () => {
    const types = extractCounter('export class Counter {\n  private get secret() { return 1 }\n}')

    expect(types).toEqual({})
  })

  it('resolves a base class referred through a namespace property access', () => {
    const types = extractCounter(`export class BaseCounter {
  base = 0
}

export namespace ns {
  export class BaseCounter { other = 1 }
}

export class Counter extends ns.BaseCounter {
  value = 1
}`)

    expect(types).toEqual({ other: 'number', value: 'number' })
  })

  it('skips base types when the extends expression is not a simple class reference', () => {
    const types = extractCounter(`export class BaseCounter {
  base = 0
}

function factory(Base: any) {
  return Base
}

export class Counter extends factory(BaseCounter) {
  value = 1
}`)

    expect(types).toEqual({ value: 'number' })
  })

  it('falls back to the getter body when the type annotation is unknown', () => {
    const types = extractCounter(`export class Counter {
  get count(): null | undefined {
    return undefined
  }
}`)

    expect(types).toEqual({ count: 'unknown' })
  })

  it('classifies readonly parameter properties from their parameter type', () => {
    const types = extractCounter(
      'export class Counter {\n  constructor(readonly title: string) {}\n}',
    )

    expect(types).toEqual({ title: 'string' })
  })

  it('ignores parameter properties whose name is unauthorized', () => {
    const types = extractCounter(
      'export class Counter {\n  constructor(public prototype: string) {}\n}',
    )

    expect(types).toEqual({})
  })

  it('ignores members whose name is unauthorized', () => {
    const types = extractCounter('export class Counter {\n  prototype = 1\n}')

    expect(types).toEqual({})
  })

  it('ignores methods that are neither properties nor getters', () => {
    const types = extractCounter('export class Counter {\n  value = 1\n  reset() {}\n}')

    expect(types).toEqual({ value: 'number' })
  })
})
