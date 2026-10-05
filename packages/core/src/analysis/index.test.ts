import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ViewModelSourceNotFoundError } from '../errors/ViewModelSourceNotFoundError'
import {
  analyzeViewModelModule,
  checkConstValue,
  classifyViewModelIssue,
  collectViewModelPropertyTypes,
  createViewModelProgramContext,
  createViewModelProgramContextFromProgram,
  describeConstType,
  extractViewModelPropertyTypes,
  extractViewModelPropertyTypesWithContext,
  pascalCaseFromFileName,
  resolveCompilerOptions,
  suggestViewModelClassName,
  type ViewModelProgramContext,
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
    const analysis = analyzeViewModelModule('export function converter() {}')
    const issue = classifyViewModelIssue(analysis, 'converter', 'Converter')

    expect(issue).toEqual({ kind: 'notAClass', viewModelName: 'converter', declaredAs: 'Function' })
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
    expect(pascalCaseFromFileName('converter')).toBe('Converter')
  })

  it('converts kebab-case segments to PascalCase', () => {
    expect(pascalCaseFromFileName('converter-medidas')).toBe('ConverterMedidas')
  })

  it('handles dots as separators', () => {
    expect(pascalCaseFromFileName('foo.tsfile')).toBe('FooTsfile')
  })

  it('returns an empty name for an empty file name', () => {
    expect(pascalCaseFromFileName('')).toBe('')
  })
})

describe('suggestViewModelClassName', () => {
  it('suggests the sole exported class', () => {
    const analysis = analyzeViewModelModule('export class PriceViewModel {}')

    expect(suggestViewModelClassName(analysis)).toBe('PriceViewModel')
  })

  it('suggests the exported class even when the module also exports constants', () => {
    const analysis = analyzeViewModelModule('export const MAX = 10\nexport class PriceViewModel {}')

    expect(suggestViewModelClassName(analysis)).toBe('PriceViewModel')
  })

  it('returns an empty suggestion when several classes are exported', () => {
    const analysis = analyzeViewModelModule(
      'export class PriceViewModel {}\nexport class DetailsViewModel {}',
    )

    expect(suggestViewModelClassName(analysis)).toBe('')
  })

  it('returns an empty suggestion when nothing is exported', () => {
    const analysis = analyzeViewModelModule('class PriceViewModel {}')

    expect(suggestViewModelClassName(analysis)).toBe('')
  })

  it('returns an empty suggestion when the exports hold no class', () => {
    const analysis = analyzeViewModelModule('export const MAX = 10')

    expect(suggestViewModelClassName(analysis)).toBe('')
  })

  it('returns an empty suggestion when exported names cannot be determined', () => {
    const analysis = analyzeViewModelModule(`export * from './models'`)

    expect(suggestViewModelClassName(analysis)).toBe('')
  })
})

describe('extractViewModelPropertyTypes', () => {
  let testDir: string
  let viewModelPath: string
  let viewModelSource: string
  let scriptVersion: number
  let languageService: ts.LanguageService | null

  beforeAll(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-analysis-'))
    viewModelPath = path.join(testDir, 'counter.ts')
    fs.writeFileSync(viewModelPath, '')
    viewModelSource = ''
    scriptVersion = 0
    languageService = ts.createLanguageService(
      {
        getCompilationSettings: () => resolveCompilerOptions(testDir),
        getScriptFileNames: () => [viewModelPath],
        getScriptVersion: () => String(scriptVersion),
        getScriptSnapshot: (fileName) => {
          if (path.resolve(fileName) === viewModelPath) {
            return ts.ScriptSnapshot.fromString(viewModelSource)
          }
          const contents = ts.sys.readFile(fileName)
          return contents === undefined ? undefined : ts.ScriptSnapshot.fromString(contents)
        },
        getCurrentDirectory: () => testDir,
        getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
        fileExists: ts.sys.fileExists,
        readFile: ts.sys.readFile,
        readDirectory: ts.sys.readDirectory,
        directoryExists: ts.sys.directoryExists,
        getDirectories: ts.sys.getDirectories,
      },
      ts.createDocumentRegistry(),
    )
  })

  afterAll(() => {
    languageService?.dispose()
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  const writeModule = (tsSource: string, fileName: string): string => {
    const tsPath = path.join(testDir, fileName)
    fs.writeFileSync(tsPath, tsSource)
    return tsPath
  }

  const writeViewModel = (tsSource: string): string => writeModule(tsSource, 'counter.ts')

  const extractCounter = (tsSource: string) => {
    viewModelSource = tsSource
    scriptVersion += 1
    const program = languageService?.getProgram()
    if (program === undefined) {
      throw new Error('Language service could not create a program for the test ViewModel')
    }
    const context = createViewModelProgramContextFromProgram(program, viewModelPath)
    return extractViewModelPropertyTypesWithContext(context, 'Counter')
  }

  const describeCounter = (tsSource: string) => {
    viewModelSource = tsSource
    scriptVersion += 1
    const program = languageService?.getProgram()
    if (program === undefined) {
      throw new Error('Language service could not create a program for the test ViewModel')
    }
    const context = createViewModelProgramContextFromProgram(program, viewModelPath)
    return Object.fromEntries(
      Array.from(collectViewModelPropertyTypes(context, 'Counter'), ([name, type]) => [
        name,
        describeConstType(type, context.checker),
      ]),
    )
  }

  it('classifies typed properties, initializer-inferred properties and definite-assignment properties', () => {
    const types = extractCounter(`export class Counter {
  value = 0
  total = 0
  quantity!: number
  active = false
  label = ''
  config = {}
  when: Date = new Date()
  items: string[] = []
  dynamic
  fromNumber: number | undefined
  numberFirst: number | null | undefined
  nullFirst: null | number
  mixed: string | number
  numberFirstMixed: number | string
  nullableMixed: number | string | undefined
  numberOrDate: number | Date
  stringOrObject: string | Record<string, unknown>
}`)

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
      fromNumber: 'number',
      numberFirst: 'number',
      nullFirst: 'number',
      mixed: { kind: 'unknown', allowedKinds: ['number', 'string'] },
      numberFirstMixed: { kind: 'unknown', allowedKinds: ['number', 'string'] },
      nullableMixed: { kind: 'unknown', allowedKinds: ['number', 'string'] },
      numberOrDate: 'other',
      stringOrObject: 'other',
    })
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
      writeViewModel(`export class BaseCounter {
  base = 0
  shared = 'from-base'
}

export class Counter extends BaseCounter {
  shared = 2
  own = 1
}`),
      'Counter',
    )

    expect(types).toEqual({ base: 'number', shared: 'number', own: 'number' })
  })

  it('returns an empty map when the class does not exist', () => {
    const types = extractViewModelPropertyTypes(
      writeViewModel('export class BaseCounter {}'),
      'MissingClass',
    )

    expect(types).toEqual({})
  })

  it('classifies a typed boolean property from its type annotation', () => {
    const types = extractCounter('export class Counter {\n  enabled: boolean\n}')

    expect(types).toEqual({ enabled: 'boolean' })
  })

  it('describes a string literal type annotation with its allowed value', () => {
    const types = extractCounter('export class Counter {\n  label: "counter"\n}')

    expect(types).toEqual({ label: { kind: 'string', allowedValues: ['counter'] } })
  })

  it('describes a number literal type annotation with its allowed value', () => {
    const types = extractCounter('export class Counter {\n  base: 10\n}')

    expect(types).toEqual({ base: { kind: 'number', allowedValues: [10] } })
  })

  it('describes a boolean literal type annotation with its allowed value', () => {
    const types = extractCounter('export class Counter {\n  enabled: true\n}')

    expect(types).toEqual({ enabled: { kind: 'boolean', allowedValues: [true] } })
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

  it('ignores base members when the extends expression is not a class reference', () => {
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

  it('classifies a getter with a nullish return type as unknown', () => {
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

  it('describes a type alias of string literals with its allowed values', () => {
    const types = extractCounter(`type Size = 'sm' | 'lg'
export class Counter {
  size: Size = 'sm'
}`)

    expect(types).toEqual({ size: { kind: 'string', allowedValues: ['sm', 'lg'] } })
  })

  it('describes a type alias of number literals with its allowed values', () => {
    const types = extractCounter(`type Level = 1 | 2
export class Counter {
  level: Level = 1
}`)

    expect(types).toEqual({ level: { kind: 'number', allowedValues: [1, 2] } })
  })

  it('resolves a string enum to string', () => {
    const types = extractCounter(`enum Color { Red = 'red', Blue = 'blue' }
export class Counter {
  color: Color = Color.Red
}`)

    expect(types).toEqual({ color: 'string' })
  })

  it('classifies a bigint literal union as other', () => {
    const types = extractCounter(`type Huge = 1n | 2n
export class Counter {
  huge: Huge = 1n
}`)

    expect(types).toEqual({ huge: 'other' })
  })

  it('classifies a union of object literals as other', () => {
    const types = extractCounter(`type Shape = { a: 1 } | { b: 2 }
export class Counter {
  shape: Shape = { a: 1 }
}`)

    expect(types).toEqual({ shape: 'other' })
  })

  it('describes a heterogeneous scalar literal union with every kind in coercion order', () => {
    const types = extractCounter(`type Mixed = 'a' | 1 | true
export class Counter {
  mixed: Mixed = 'a'
}`)

    expect(types).toEqual({
      mixed: {
        kind: 'unknown',
        allowedKinds: ['number', 'boolean', 'string'],
        allowedValues: [1, true, 'a'],
      },
    })
  })

  it('classifies an any property as unknown so the runtime falls back to typeof', () => {
    const types = extractCounter('export class Counter {\n  anything: any = 1\n}')

    expect(types).toEqual({ anything: 'unknown' })
  })

  it('classifies an unknown property as unknown', () => {
    const types = extractCounter('export class Counter {\n  mystery: unknown = 1\n}')

    expect(types).toEqual({ mystery: 'unknown' })
  })

  it('resolves a type alias imported from another module with its allowed values', () => {
    writeModule(`export type Size = 'sm' | 'lg'`, 'sizes.ts')
    const types = extractViewModelPropertyTypes(
      writeViewModel(`import { Size } from './sizes'
export class Counter {
  size: Size = 'sm'
}`),
      'Counter',
    )

    expect(types).toEqual({ size: { kind: 'string', allowedValues: ['sm', 'lg'] } })
  })

  it('collects inherited property types from a base class in another module', () => {
    writeModule(
      `export class BaseCounter {
  inherited = 'from-base'
}`,
      'base.ts',
    )
    const types = extractViewModelPropertyTypes(
      writeViewModel(`import { BaseCounter } from './base'
export class Counter extends BaseCounter {
  own = 1
}`),
      'Counter',
    )

    expect(types).toEqual({ inherited: 'string', own: 'number' })
  })

  it('collects property types from a class re-exported under another name', () => {
    writeModule(
      `export class Counter {
  count!: number | undefined
}`,
      'model.ts',
    )
    const barrelPath = writeViewModel(`export { Counter as CounterViewModel } from './model'`)
    const types = extractViewModelPropertyTypes(barrelPath, 'CounterViewModel')

    expect(types).toEqual({ count: 'number' })
  })

  it('ignores private and static members inherited from a base class', () => {
    writeModule(
      `export class BaseCounter {
  private secret = 1
  protected reserved = 'x'
  static shared = 0
  inherited = 'from-base'
}`,
      'base.ts',
    )
    const types = extractViewModelPropertyTypes(
      writeViewModel(`import { BaseCounter } from './base'
export class Counter extends BaseCounter {
  own = 1
}`),
      'Counter',
    )

    expect(types).toEqual({ inherited: 'string', own: 'number' })
  })

  it('describes a heterogeneous scalar union with its allowed kinds in coercion order', () => {
    const types = describeCounter(`export class Counter {
  value: number | string = 0
  inverted: string | number = 'a'
}`)

    const expected = { kind: 'unknown', allowedKinds: ['number', 'string'] }
    expect(types).toEqual({ value: expected, inverted: expected })
  })

  it('describes a nullable mixed union ignoring its nullish members', () => {
    const types = describeCounter(`export class Counter {
  value: number | string | undefined = undefined
}`)

    expect(types).toEqual({ value: { kind: 'unknown', allowedKinds: ['number', 'string'] } })
  })

  it('describes a string literal union with its allowed values', () => {
    const types = describeCounter(`export class Counter {
  theme: 'light' | 'dark' = 'light'
}`)

    expect(types).toEqual({ theme: { kind: 'string', allowedValues: ['light', 'dark'] } })
  })

  it('describes a mixed literal union with every scalar kind in coercion order', () => {
    const types = describeCounter(`export type Mixed = 'a' | 1 | true
export class Counter {
  mixed: Mixed = 'a'
}`)

    expect(types).toEqual({
      mixed: {
        kind: 'unknown',
        allowedKinds: ['number', 'boolean', 'string'],
        allowedValues: [1, true, 'a'],
      },
    })
  })

  it('collapses an explicit true and false union back to boolean', () => {
    const types = describeCounter(`export class Counter {
  flag: true | false = true
}`)

    expect(types).toEqual({ flag: 'boolean' })
  })

  it('keeps any and unknown as bare unknown without detail', () => {
    const types = describeCounter(`export class Counter {
  anything: any = 1
  mystery: unknown = 1
}`)

    expect(types).toEqual({ anything: 'unknown', mystery: 'unknown' })
  })

  it('keeps plain scalars as plain kinds', () => {
    const types = describeCounter(`export class Counter {
  count = 0
  label = ''
  active = false
}`)

    expect(types).toEqual({ count: 'number', label: 'string', active: 'boolean' })
  })

  it('keeps a union with object members as other', () => {
    const types = describeCounter(`export class Counter {
  amountOrDate: number | Date = 2
}`)

    expect(types).toEqual({ amountOrDate: 'other' })
  })

  it('fails fast when the view model path cannot be read by the program', () => {
    const missingPath = path.join(testDir, 'missing-counter.ts')

    expect(() => extractViewModelPropertyTypes(missingPath, 'Counter')).toThrowError(
      new ViewModelSourceNotFoundError({ tsPath: missingPath }),
    )
  })
})

describe('checkConstValue', () => {
  const viewModelSource = `class CustomModel {}
export type Size = 'sm' | 'lg'
export type Mixed = 'a' | 1 | true
export enum Level { Low = 'low', High = 'high' }
export class Counter {
  size: Size = 'sm'
  level: Level = Level.Low
  mode: 'grid' | 'list' = 'grid'
  mixed: Mixed = 'a'
  count: number = 0
  set quantity(value: number) {}
  set enabled(value: boolean) {}
  set scheduledAt(value: Date) {}
  set model(value: CustomModel) {}
  set optionalCount(value: number | null) {}
  private hidden = 1
  protected reserved = 1
  static shared = 1
  active: boolean = false
  label: string = ''
  config = { level: 1 }
  amount: bigint = 1n
  anything: any = 1
  mystery: unknown = 1
  pendingScores!: number[]
  amountOrDate: number | Date = 2
  amountOrLabel!: number | string
}`

  let testDir: string
  let context: ViewModelProgramContext

  beforeAll(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-const-'))
    const tsPath = path.join(testDir, 'counter.ts')
    fs.writeFileSync(tsPath, viewModelSource)
    context = createViewModelProgramContext(tsPath)
  })

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  const check = (propertyName: string, rawValue: string) =>
    checkConstValue({ context, className: 'Counter', propertyName, rawValue })

  it('accepts a number literal attribute value for a number property', () => {
    expect(check('count', '5')).toEqual({ accepted: true })
    expect(check('count', '5.5')).toEqual({ accepted: true })
  })

  it('rejects a non numeric attribute value for a number property', () => {
    expect(check('count', 'abc')).toEqual({
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: 'number',
    })
  })

  it('validates const values using the parameter type of a setter-only property', () => {
    expect(check('quantity', 'invalid')).toEqual({
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: 'number',
    })
    expect(check('quantity', '42')).toEqual({ accepted: true })
  })

  it('validates boolean const values using the parameter type of a setter-only property', () => {
    expect(check('enabled', 'true')).toEqual({ accepted: true })
    expect(check('enabled', 'false')).toEqual({ accepted: true })
    expect(check('enabled', 'yes')).toEqual({
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: 'boolean',
    })
  })

  it('rejects setter-only Date and custom class types as unsupported', () => {
    expect(check('scheduledAt', '2026-09-28')).toEqual({
      accepted: false,
      reason: 'nonLiteralType',
      declaredTypeText: 'Date',
    })
    expect(check('model', 'custom')).toEqual({
      accepted: false,
      reason: 'nonLiteralType',
      declaredTypeText: 'CustomModel',
    })
  })

  it('validates a nullable setter-only property using the compiler-resolved scalar type', () => {
    expect(check('optionalCount', '42')).toEqual({ accepted: true })
    expect(check('optionalCount', 'invalid')).toEqual({
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: 'number',
    })
  })

  it('accepts the boolean literals true and false for a boolean property', () => {
    expect(check('active', 'true')).toEqual({ accepted: true })
    expect(check('active', 'false')).toEqual({ accepted: true })
  })

  it('rejects a non boolean attribute value for a boolean property', () => {
    expect(check('active', 'yes')).toEqual({
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: 'boolean',
    })
  })

  it('accepts any attribute value for a string property, including numbers and booleans', () => {
    expect(check('label', 'anything')).toEqual({ accepted: true })
    expect(check('label', '5')).toEqual({ accepted: true })
    expect(check('label', 'true')).toEqual({ accepted: true })
  })

  it('accepts an attribute value listed in a type alias of string literals', () => {
    expect(check('size', 'lg')).toEqual({ accepted: true })
    expect(check('size', 'sm')).toEqual({ accepted: true })
  })

  it('rejects an attribute value outside a type alias of string literals and names the allowed ones', () => {
    expect(check('size', 'xx')).toEqual({
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: '"sm" | "lg"',
    })
  })

  it('rejects a numeric attribute value for a type alias of string literals', () => {
    expect(check('size', '5')).toEqual({
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: '"sm" | "lg"',
    })
  })

  it('leaves a heterogeneous scalar union unchecked for runtime resolution', () => {
    expect(check('mixed', 'a')).toEqual({ accepted: 'unchecked' })
    expect(check('mixed', '1')).toEqual({ accepted: 'unchecked' })
    expect(check('mixed', 'true')).toEqual({ accepted: 'unchecked' })
  })

  it('leaves values outside a heterogeneous scalar union unchecked', () => {
    expect(check('mixed', 'zz')).toEqual({ accepted: 'unchecked' })
    expect(check('mixed', 'false')).toEqual({ accepted: 'unchecked' })
  })

  it('accepts a string enum member because it holds that string at runtime', () => {
    expect(check('level', 'high')).toEqual({ accepted: true })
    expect(check('level', 'low')).toEqual({ accepted: true })
  })

  it('names the allowed members when a value is outside a string enum', () => {
    expect(check('level', 'mid')).toEqual({
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: '"low" | "high"',
    })
  })

  it('resolves an inline union of string literals to its allowed values', () => {
    expect(check('mode', 'grid')).toEqual({ accepted: true })
    expect(check('mode', 'zz')).toEqual({
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: '"grid" | "list"',
    })
  })

  it('reports a non literal type as unsupported rather than as a value mismatch', () => {
    expect(check('config', 'anything')).toEqual({
      accepted: false,
      reason: 'nonLiteralType',
      declaredTypeText: '{ level: number; }',
    })
  })

  it('reports bigint as unsupported because const attributes cannot represent it', () => {
    expect(check('amount', '1')).toEqual({
      accepted: false,
      reason: 'nonLiteralType',
      declaredTypeText: 'bigint',
    })
  })

  it('reports an array property declared without an initializer as unsupported', () => {
    expect(check('pendingScores', 'anything')).toEqual({
      accepted: false,
      reason: 'nonLiteralType',
      declaredTypeText: 'number[]',
    })
  })

  it('reports a union that mixes a scalar type with Date as unsupported', () => {
    expect(check('amountOrDate', '2')).toEqual({
      accepted: false,
      reason: 'nonLiteralType',
      declaredTypeText: 'number | Date',
    })
    expect(check('amountOrDate', '2026-09-28')).toEqual({
      accepted: false,
      reason: 'nonLiteralType',
      declaredTypeText: 'number | Date',
    })
  })

  it('leaves a union of two scalar types unchecked for runtime resolution', () => {
    expect(check('amountOrLabel', 'anything')).toEqual({ accepted: 'unchecked' })
  })

  it('leaves any and unknown properties unchecked', () => {
    expect(check('anything', 'whatever')).toEqual({ accepted: 'unchecked' })
    expect(check('mystery', 'whatever')).toEqual({ accepted: 'unchecked' })
  })

  it('leaves a property the view model does not declare unchecked', () => {
    expect(check('notDeclared', 'whatever')).toEqual({ accepted: 'unchecked' })
  })

  it('leaves non-public and static properties unchecked', () => {
    expect(check('hidden', '1')).toEqual({ accepted: 'unchecked' })
    expect(check('reserved', '1')).toEqual({ accepted: 'unchecked' })
    expect(check('shared', '1')).toEqual({ accepted: 'unchecked' })
  })

  it('resolves a type alias imported from another module against the current content of that module', () => {
    const sizesPath = path.join(testDir, 'sizes.ts')
    const tsPath = path.join(testDir, 'aliased.ts')
    fs.writeFileSync(sizesPath, `export type Size = 'xs' | 'xl'`)
    fs.writeFileSync(
      tsPath,
      `import { Size } from './sizes'
export class Aliased {
  size: Size = 'sm'
}`,
    )

    const checkAliased = (viewModelContext: ViewModelProgramContext, rawValue: string) =>
      checkConstValue({
        context: viewModelContext,
        className: 'Aliased',
        propertyName: 'size',
        rawValue,
      })

    const aliasedContext = createViewModelProgramContext(tsPath)
    expect(checkAliased(aliasedContext, 'xx')).toEqual({
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: '"xs" | "xl"',
    })
    expect(checkAliased(aliasedContext, 'xs')).toEqual({ accepted: true })
  })

  it('validates a const value for a property inherited from an imported base class', () => {
    const basePath = path.join(testDir, 'base-counter.ts')
    const derivedPath = path.join(testDir, 'derived-counter.ts')
    fs.writeFileSync(
      basePath,
      `export class BaseCounter {
  inheritedCount = 0
}`,
    )
    fs.writeFileSync(
      derivedPath,
      `import { BaseCounter } from './base-counter'
export class DerivedCounter extends BaseCounter {}`,
    )
    const derivedContext = createViewModelProgramContext(derivedPath)

    expect(
      checkConstValue({
        context: derivedContext,
        className: 'DerivedCounter',
        propertyName: 'inheritedCount',
        rawValue: 'invalid',
      }),
    ).toEqual({
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: 'number',
    })
    expect(
      checkConstValue({
        context: derivedContext,
        className: 'DerivedCounter',
        propertyName: 'inheritedCount',
        rawValue: '42',
      }),
    ).toEqual({ accepted: true })
  })
})

/**
 * A view model whose members mix inferred and annotated declarations: an
 * evolving array, definite assignment properties without initializer, a union
 * mixing a scalar with a class type and a string union reached through a type
 * alias declared after the class that refers to it.
 */
describe('checkConstValue on a view model with definite assignment declarations', () => {
  const rosterViewModelSource = `export class StudentRoster {
  students = []
  total = 0
  title = ''
  pendingScores!: number[]
  dueAt!: number | Date
  label!: string | number
  shift!: Shift
}

type Shift = 'morning' | 'evening'`

  let testDir: string
  let context: ViewModelProgramContext

  beforeAll(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-roster-const-'))
    const tsPath = path.join(testDir, 'student-roster.ts')
    fs.writeFileSync(tsPath, rosterViewModelSource)
    context = createViewModelProgramContext(tsPath)
  })

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  const check = (propertyName: string, rawValue: string) =>
    checkConstValue({ context, className: 'StudentRoster', propertyName, rawValue })

  const checkInContext = (
    viewModelContext: ViewModelProgramContext,
    propertyName: string,
    rawValue: string,
  ) =>
    checkConstValue({
      context: viewModelContext,
      className: 'StudentRoster',
      propertyName,
      rawValue,
    })

  it('reports an array property declared with a definite assignment assertion', () => {
    expect(check('pendingScores', 'three')).toEqual({
      accepted: false,
      reason: 'nonLiteralType',
      declaredTypeText: 'number[]',
    })
  })

  it('reports a union with a class type declared with a definite assignment assertion', () => {
    expect(check('dueAt', '2026-09-28')).toEqual({
      accepted: false,
      reason: 'nonLiteralType',
      declaredTypeText: 'number | Date',
    })
  })

  it('reports a union with a class type that carries a literal initializer', () => {
    const initializedTsPath = path.join(testDir, 'student-roster-initialized.ts')
    fs.writeFileSync(
      initializedTsPath,
      rosterViewModelSource.replace('dueAt!: number | Date', 'dueAt: number | Date = 2'),
    )

    expect(
      checkInContext(createViewModelProgramContext(initializedTsPath), 'dueAt', '2026-09-28'),
    ).toEqual({
      accepted: false,
      reason: 'nonLiteralType',
      declaredTypeText: 'number | Date',
    })
  })

  it('names the allowed values of a string union reached through a trailing type alias', () => {
    expect(check('shift', 'midday')).toEqual({
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: '"morning" | "evening"',
    })
  })

  it('accepts a listed value of a string union reached through a trailing type alias', () => {
    expect(check('shift', 'morning')).toEqual({ accepted: true })
    expect(check('shift', 'evening')).toEqual({ accepted: true })
  })

  it('leaves a union of two scalar types unchecked for runtime resolution', () => {
    expect(check('label', 'three')).toEqual({ accepted: 'unchecked' })
  })
})
