// @vitest-environment jsdom
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { createLanguageService } from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupComponentBindings } from '../../core/src/bindings/bindComponent'
import { initializeI18n } from '../../core/src/commons/i18n'
import { InvalidConstValueError } from '../../core/src/errors/InvalidConstValueError'
import { createReactiveViewModel } from '../../core/src/reactivity/reactiveProxy'
import { clearComponentRegistry, defineComponent } from '../../core/src/registry/componentRegistry'
import type { ConstKind } from '../../core/src/types'
import { pelelajsPlugin } from './index'

vi.mock('typescript', async (importOriginal) => {
  const actual = await importOriginal<typeof import('typescript')>()
  return {
    ...actual,
    createLanguageService: vi.fn(actual.createLanguageService),
  }
})

const RESOLVED_VIRTUAL_ID = '\0virtual:pelela-auto-register'
const COMPONENT_SOURCE = `import { Scalar } from './scalar'
export class CounterViewModel {
  quantity!: Scalar
}`

function getHandler<T>(hook: T): T extends { handler: infer H } ? H : T {
  return (hook as { handler: never }).handler ?? hook
}

describe('plugin typeMap const binding integration', () => {
  let tempDir: string
  let originalCwd: () => string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-plugin-const-'))
    fs.mkdirSync(path.join(tempDir, 'src'))
    fs.writeFileSync(path.join(tempDir, 'src', 'counter.ts'), COMPONENT_SOURCE)
    fs.writeFileSync(path.join(tempDir, 'src', 'scalar.ts'), 'export type Scalar = number | Date')
    fs.writeFileSync(
      path.join(tempDir, 'src', 'counter.pelela'),
      '<pelela view-model="CounterViewModel"></pelela>',
    )
    fs.writeFileSync(
      path.join(tempDir, 'src', 'label.ts'),
      'export class LabelViewModel { label = "hello" }',
    )
    fs.writeFileSync(
      path.join(tempDir, 'src', 'label.pelela'),
      '<pelela view-model="LabelViewModel"></pelela>',
    )
    originalCwd = process.cwd
    process.cwd = () => tempDir
    initializeI18n('en')
    clearComponentRegistry()
  })

  afterEach(() => {
    vi.mocked(createLanguageService).mockClear()
    process.cwd = originalCwd
    clearComponentRegistry()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('refreshes real imported union types and applies them to const bindings', () => {
    const createLanguageServiceMock = vi.mocked(createLanguageService)
    const plugin = pelelajsPlugin()
    const load = getHandler(plugin.load!)
    const readGeneratedModule = (): string =>
      load.call(null as never, RESOLVED_VIRTUAL_ID, {} as never) as string
    const readTypeMap = (
      generatedModule: string,
      viewModelName: string,
    ): Record<string, ConstKind> | undefined => {
      const registration = generatedModule.match(
        new RegExp(`defineComponent\\("${viewModelName}"[^\\n]*`),
      )?.[0]
      if (registration === undefined) {
        throw new Error(`Generated registration for ${viewModelName} was not found`)
      }
      const typeMapMatch = registration.match(/typeMap: (\{[^}]*\})/)
      return typeMapMatch === null
        ? undefined
        : (JSON.parse(typeMapMatch[1]) as Record<string, ConstKind>)
    }

    class CounterViewModel {
      quantity: number | Date = new Date()
    }

    const container = document.createElement('div')
    container.innerHTML = '<counter-view-model const-quantity="42"></counter-view-model>'

    const initialGeneratedModule = readGeneratedModule()
    expect(readTypeMap(initialGeneratedModule, 'CounterViewModel')).toBeUndefined()
    expect(readTypeMap(initialGeneratedModule, 'LabelViewModel')).toEqual({ label: 'string' })
    expect(createLanguageServiceMock).toHaveBeenCalledTimes(1)
    const languageService = createLanguageServiceMock.mock.results[0].value
    const initialProgram = languageService.getProgram()
    expect(initialProgram).toBeDefined()

    readGeneratedModule()
    expect(createLanguageServiceMock).toHaveBeenCalledTimes(1)
    expect(languageService.getProgram()).toBe(initialProgram)

    defineComponent(
      'CounterViewModel',
      CounterViewModel,
      '<component view-model="CounterViewModel"></component>',
    )
    expect(() =>
      setupComponentBindings(
        container,
        createReactiveViewModel({}, () => {}),
      ),
    ).toThrow(InvalidConstValueError)

    clearComponentRegistry()
    const scalarPath = path.join(tempDir, 'src', 'scalar.ts')
    fs.writeFileSync(scalarPath, 'export type Scalar = number')
    const hotUpdate = getHandler(plugin.hotUpdate!)
    hotUpdate.call(
      {
        environment: { moduleGraph: { getModuleById: () => undefined } },
      } as never,
      { file: scalarPath, modules: [] } as never,
    )

    const regeneratedModule = readGeneratedModule()
    const numericTypeMap = readTypeMap(regeneratedModule, 'CounterViewModel')
    expect(numericTypeMap).toEqual({ quantity: 'number' })
    expect(readTypeMap(regeneratedModule, 'LabelViewModel')).toEqual({ label: 'string' })
    expect(languageService.getProgram()).not.toBe(initialProgram)
    defineComponent(
      'CounterViewModel',
      CounterViewModel,
      '<component view-model="CounterViewModel"></component>',
      { typeMap: numericTypeMap },
    )
    const bindings = setupComponentBindings(
      container,
      createReactiveViewModel({}, () => {}),
    )
    expect((bindings[0].childViewModel as unknown as CounterViewModel).quantity).toBe(42)
  })

  it('emits a union descriptor and applies it to const bindings end to end', () => {
    fs.writeFileSync(
      path.join(tempDir, 'src', 'parent.ts'),
      'export class ParentViewModel { value: number | string = 0 }',
    )
    fs.writeFileSync(
      path.join(tempDir, 'src', 'parent.pelela'),
      '<pelela view-model="ParentViewModel"></pelela>',
    )

    const plugin = pelelajsPlugin()
    const load = getHandler(plugin.load!)
    const generatedModule = load.call(null as never, RESOLVED_VIRTUAL_ID, {} as never) as string
    expect(generatedModule).toContain(
      '{ typeMap: {"value":{"kind":"unknown","allowedKinds":["number","string"]}} }',
    )

    class ParentViewModel {
      value: number | string = 0
    }
    defineComponent(
      'ParentViewModel',
      ParentViewModel,
      '<component view-model="ParentViewModel"></component>',
      { typeMap: { value: { kind: 'unknown', allowedKinds: ['number', 'string'] } } },
    )

    const container = document.createElement('div')
    container.innerHTML = '<parent-view-model const-value="hello"></parent-view-model>'
    const bindings = setupComponentBindings(
      container,
      createReactiveViewModel({}, () => {}),
    )
    expect((bindings[0].childViewModel as unknown as ParentViewModel).value).toBe('hello')
  })
})
