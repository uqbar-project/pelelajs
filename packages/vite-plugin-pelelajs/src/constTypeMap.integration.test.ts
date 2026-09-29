// @vitest-environment jsdom
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setupComponentBindings } from '../../core/src/bindings/bindComponent'
import { initializeI18n } from '../../core/src/commons/i18n'
import { InvalidConstValueError } from '../../core/src/errors/InvalidConstValueError'
import { createReactiveViewModel } from '../../core/src/reactivity/reactiveProxy'
import { clearComponentRegistry, defineComponent } from '../../core/src/registry/componentRegistry'
import type { ConstKind } from '../../core/src/types'
import { pelelajsPlugin } from './index'

const RESOLVED_VIRTUAL_ID = '\0virtual:pelela-auto-register'
const COMPONENT_SOURCE = `export type Scalar = number | boolean
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
      path.join(tempDir, 'src', 'counter.pelela'),
      '<pelela view-model="CounterViewModel"></pelela>',
    )
    originalCwd = process.cwd
    process.cwd = () => tempDir
    initializeI18n('en')
    clearComponentRegistry()
  })

  afterEach(() => {
    process.cwd = originalCwd
    clearComponentRegistry()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('uses real extracted union types to reject an unsupported const binding', () => {
    const plugin = pelelajsPlugin()
    const load = getHandler(plugin.load!)
    const generatedModule = load.call(null as never, RESOLVED_VIRTUAL_ID, {} as never) as string
    const typeMapMatch = generatedModule.match(/typeMap: (\{[^}]*\})/)

    expect(typeMapMatch?.[1]).toBe('{"quantity":"other"}')
    if (typeMapMatch === null) {
      throw new Error('Generated registration did not include a typeMap')
    }

    const typeMap = JSON.parse(typeMapMatch[1]) as Record<string, ConstKind>
    class CounterViewModel {
      quantity!: number | boolean
    }

    defineComponent(
      'CounterViewModel',
      CounterViewModel,
      '<component view-model="CounterViewModel"></component>',
      { typeMap },
    )

    const container = document.createElement('div')
    container.innerHTML = '<counter-view-model const-quantity="42"></counter-view-model>'

    expect(() =>
      setupComponentBindings(
        container,
        createReactiveViewModel({}, () => {}),
      ),
    ).toThrow(InvalidConstValueError)
  })
})
