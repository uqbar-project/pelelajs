import * as assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { ViewModelLanguageService } from '../../src/parsers/viewModelLanguageService'

function createWorkspace(): { dir: string; tsPath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-ls-'))
  const tsPath = path.join(dir, 'counter.ts')
  fs.writeFileSync(
    tsPath,
    `export type Size = 'sm' | 'lg'
export class Counter {
  size: Size = 'sm'
}`
  )
  return { dir, tsPath }
}

describe('ViewModelLanguageService', () => {
  let dir: string
  let tsPath: string
  let service: ViewModelLanguageService

  beforeEach(() => {
    const workspace = createWorkspace()
    dir = workspace.dir
    tsPath = workspace.tsPath
    service = new ViewModelLanguageService(dir)
  })

  afterEach(() => {
    service.dispose()
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('resolves property types for a class in a registered file', () => {
    assert.deepEqual(service.propertyTypes(tsPath, 'Counter'), {
      size: { kind: 'string', allowedValues: ['sm', 'lg'] },
    })
  })

  it('reuses the same program when no tracked file changed', () => {
    const first = service.propertyTypes(tsPath, 'Counter')
    const second = service.propertyTypes(tsPath, 'Counter')

    assert.deepEqual(first, second)
  })

  it('picks up an edit to a tracked view model instead of answering from the previous program', () => {
    const before = service.constValue({
      tsPath,
      className: 'Counter',
      propertyName: 'size',
      rawValue: 'xx',
    })
    assert.deepEqual(before, {
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: '"sm" | "lg"',
    })

    writeWithNewModificationTime(
      tsPath,
      `export type Size = 'xs' | 'xl'
export class Counter {
  size: Size = 'xs'
}`
    )

    const after = service.constValue({
      tsPath,
      className: 'Counter',
      propertyName: 'size',
      rawValue: 'xx',
    })
    assert.deepEqual(after, {
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: '"xs" | "xl"',
    })
    assert.deepEqual(
      service.constValue({ tsPath, className: 'Counter', propertyName: 'size', rawValue: 'xs' }),
      { accepted: true }
    )
  })

  it('picks up an edit to an imported module used by a type alias', () => {
    fs.writeFileSync(path.join(dir, 'sizes.ts'), `export type Size = 'sm' | 'lg'`)
    fs.writeFileSync(
      tsPath,
      `import { Size } from './sizes'
export class Counter {
  size: Size = 'sm'
}`
    )
    service.invalidate(tsPath)

    const before = service.constValue({
      tsPath,
      className: 'Counter',
      propertyName: 'size',
      rawValue: 'xx',
    })
    assert.deepEqual(before, {
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: '"sm" | "lg"',
    })

    writeWithNewModificationTime(path.join(dir, 'sizes.ts'), `export type Size = 'xs' | 'xl'`)

    const after = service.constValue({
      tsPath,
      className: 'Counter',
      propertyName: 'size',
      rawValue: 'xx',
    })
    assert.deepEqual(after, {
      accepted: false,
      reason: 'literalMismatch',
      expectedTypeText: '"xs" | "xl"',
    })
  })

  it('rebuilds after an explicit invalidation even when the file is untouched', () => {
    const before = service.constValue({
      tsPath,
      className: 'Counter',
      propertyName: 'size',
      rawValue: 'lg',
    })
    assert.deepEqual(before, { accepted: true })

    service.invalidate(tsPath)

    const after = service.constValue({
      tsPath,
      className: 'Counter',
      propertyName: 'size',
      rawValue: 'lg',
    })
    assert.deepEqual(after, { accepted: true })
  })
})

function writeWithNewModificationTime(filePath: string, contents: string): void {
  fs.writeFileSync(filePath, contents)
  const future = new Date(Date.now() + 2000)
  fs.utimesSync(filePath, future, future)
}
