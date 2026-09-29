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
    fs.writeFileSync(
      path.join(tempDir, 'src', 'scalar.ts'),
      'export type Scalar = number | boolean',
    )
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
    const readTypeMaps = (): Record<string, ConstKind>[] => {
      const generatedModule = load.call(null as never, RESOLVED_VIRTUAL_ID, {} as never) as string
      const typeMapMatches = Array.from(generatedModule.matchAll(/typeMap: (\{[^}]*\})/g))
      if (typeMapMatches.length === 0) {
        throw new Error('Generated registration did not include a typeMap')
      }
      return typeMapMatches.map((match) => JSON.parse(match[1]) as Record<string, ConstKind>)
    }

    class CounterViewModel {
      quantity!: number | boolean
    }

    const container = document.createElement('div')
    container.innerHTML = '<counter-view-model const-quantity="42"></counter-view-model>'

    const [unionTypeMap, labelTypeMap] = readTypeMaps()
    expect(unionTypeMap).toEqual({ quantity: 'other' })
    expect(labelTypeMap).toEqual({ label: 'string' })
    expect(createLanguageServiceMock).toHaveBeenCalledTimes(1)
    const languageService = createLanguageServiceMock.mock.results[0].value
    const initialProgram = languageService.getProgram()
    expect(initialProgram).toBeDefined()

    readTypeMaps()
    expect(createLanguageServiceMock).toHaveBeenCalledTimes(1)
    expect(languageService.getProgram()).toBe(initialProgram)

    defineComponent(
      'CounterViewModel',
      CounterViewModel,
      '<component view-model="CounterViewModel"></component>',
      { typeMap: unionTypeMap },
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

    const [numericTypeMap, updatedLabelTypeMap] = readTypeMaps()
    expect(numericTypeMap).toEqual({ quantity: 'number' })
    expect(updatedLabelTypeMap).toEqual({ label: 'string' })
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
})
