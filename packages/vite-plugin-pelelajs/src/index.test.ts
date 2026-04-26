import * as fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pelelajsPlugin } from './index'

const VIRTUAL_MODULE_ID = 'virtual:pelela-auto-register'
const RESOLVED_VIRTUAL_ID = '\0virtual:pelela-auto-register'

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'test-fixtures-'))
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

function getHandler<T>(hook: T): T extends { handler: infer H } ? H : T {
  return (hook as { handler: never }).handler ?? hook
}

describe('pelelajsPlugin', () => {
  describe('resolveId', () => {
    it('resolves virtual:pelela-auto-register to internal id', () => {
      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.resolveId!)

      const result = handler.call(null as never, VIRTUAL_MODULE_ID, '', {} as never)

      expect(result).toBe(RESOLVED_VIRTUAL_ID)
    })

    it('returns null for non-virtual imports', () => {
      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.resolveId!)

      const result = handler.call(null as never, './something.ts', '', {} as never)

      expect(result).toBeNull()
    })
  })

  describe('load - virtual module', () => {
    let tempDir: string

    beforeEach(() => {
      tempDir = createTempDir()
      const srcDir = path.join(tempDir, 'src')
      fs.mkdirSync(srcDir)
    })

    afterEach(() => {
      removeTempDir(tempDir)
    })

    it('returns empty export when no components found', () => {
      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)
      const originalCwd = process.cwd

      process.cwd = () => tempDir

      const result = handler.call(null as never, RESOLVED_VIRTUAL_ID, {} as never)

      expect(result).toBe('export {}')

      process.cwd = originalCwd
    })

    it('generates registration code for simple component', () => {
      const srcDir = path.join(tempDir, 'src')
      fs.writeFileSync(path.join(srcDir, 'home.ts'), 'export class Home {}')
      fs.writeFileSync(
        path.join(srcDir, 'home.pelela'),
        '<pelela view-model="Home"><h1>Hello</h1></pelela>',
      )

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)
      const originalCwd = process.cwd

      process.cwd = () => tempDir

      const result = handler.call(null as never, RESOLVED_VIRTUAL_ID, {} as never) as string

      expect(result).toContain('import { Home } from "./src/home.ts"')
      expect(result).toContain('import homeTemplate from "./src/home.pelela"')
      expect(result).toContain('import { defineComponent } from "pelelajs"')
      expect(result).toContain('defineComponent("Home", Home, homeTemplate)')

      process.cwd = originalCwd
    })

    it('generates registration code for kebab-case component', () => {
      const srcDir = path.join(tempDir, 'src')
      fs.writeFileSync(path.join(srcDir, 'detail-special.ts'), 'export class DetailSpecial {}')
      fs.writeFileSync(
        path.join(srcDir, 'detail-special.pelela'),
        '<pelela view-model="DetailSpecial"><h1>Special</h1></pelela>',
      )

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)
      const originalCwd = process.cwd

      process.cwd = () => tempDir

      const result = handler.call(null as never, RESOLVED_VIRTUAL_ID, {} as never) as string

      expect(result).toContain('import { DetailSpecial } from "./src/detail-special.ts"')
      expect(result).toContain('import detailSpecialTemplate from "./src/detail-special.pelela"')
      expect(result).toContain(
        'defineComponent("DetailSpecial", DetailSpecial, detailSpecialTemplate)',
      )

      process.cwd = originalCwd
    })

    it('skips ts files without matching pelela template', () => {
      const srcDir = path.join(tempDir, 'src')
      fs.writeFileSync(path.join(srcDir, 'home.ts'), 'export class Home {}')
      fs.writeFileSync(
        path.join(srcDir, 'home.pelela'),
        '<pelela view-model="Home"><h1>Hello</h1></pelela>',
      )
      fs.writeFileSync(path.join(srcDir, 'orphan.ts'), 'export class Orphan {}')

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)
      const originalCwd = process.cwd

      process.cwd = () => tempDir

      const result = handler.call(null as never, RESOLVED_VIRTUAL_ID, {} as never) as string

      expect(result).toContain('import { Home }')
      expect(result).not.toContain('Orphan')

      process.cwd = originalCwd
    })

    it('handles component names with .ts in the middle', () => {
      const srcDir = path.join(tempDir, 'src')
      fs.writeFileSync(path.join(srcDir, 'foo.tsfile.ts'), 'export class FooTsfile {}')
      fs.writeFileSync(
        path.join(srcDir, 'foo.tsfile.pelela'),
        '<pelela view-model="FooTsfile"><h1>Test</h1></pelela>',
      )

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)
      const originalCwd = process.cwd

      process.cwd = () => tempDir

      const result = handler.call(null as never, RESOLVED_VIRTUAL_ID, {} as never) as string

      expect(result).toContain('import { FooTsfile } from "./src/foo.tsfile.ts"')
      expect(result).toContain('import fooTsfileTemplate from "./src/foo.tsfile.pelela"')
      expect(result).toContain('defineComponent("FooTsfile", FooTsfile, fooTsfileTemplate)')

      process.cwd = originalCwd
    })
  })

  describe('load - pelela files', () => {
    let tempDir: string

    beforeEach(() => {
      tempDir = createTempDir()
    })

    afterEach(() => {
      removeTempDir(tempDir)
    })

    it('returns null for non-pelela files', () => {
      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      const result = handler.call(null as never, '/some/file.ts', {} as never)

      expect(result).toBeNull()
    })

    it('transforms pelela file into module with template and viewModelName', () => {
      const pelelaPath = path.join(tempDir, 'home.pelela')
      fs.writeFileSync(pelelaPath, '<pelela view-model="Home"><h1>Hello</h1></pelela>')

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      const mockContext = { error: () => {} }
      const result = handler.call(mockContext as never, pelelaPath, {} as never) as string

      expect(result).toContain('export const viewModelName = "Home"')
      expect(result).toContain('export default template')
    })

    it('reports error when pelela tag is missing', () => {
      const pelelaPath = path.join(tempDir, 'broken.pelela')
      fs.writeFileSync(pelelaPath, '<div>No pelela tag</div>')

      const errors: string[] = []
      const errorFn = (msg: string | Error) => errors.push(String(msg))

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      handler.call({ error: errorFn } as never, pelelaPath, {} as never)

      expect(errors.length).toBeGreaterThan(0)
    })

    it('reports error when view-model attribute is missing', () => {
      const pelelaPath = path.join(tempDir, 'no-vm.pelela')
      fs.writeFileSync(pelelaPath, '<pelela><h1>No view-model</h1></pelela>')

      const errors: string[] = []
      const errorFn = (msg: string | Error) => errors.push(String(msg))

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      handler.call({ error: errorFn } as never, pelelaPath, {} as never)

      expect(errors.some((e) => e.includes('missingViewModel') || e.includes('view-model'))).toBe(
        true,
      )
    })

    it('reports error when pelela tags are unbalanced', () => {
      const pelelaPath = path.join(tempDir, 'unbalanced.pelela')
      fs.writeFileSync(pelelaPath, '<pelela view-model="Home"><h1>Missing closing tag</h1>')

      const errors: string[] = []
      const errorFn = (msg: string | Error) => errors.push(String(msg))

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      handler.call({ error: errorFn } as never, pelelaPath, {} as never)

      expect(errors.some((e) => e.includes('unbalanced'))).toBe(true)
    })

    it('includes css import when matching css file exists', () => {
      const pelelaPath = path.join(tempDir, 'styled.pelela')
      const cssPath = path.join(tempDir, 'styled.css')
      fs.writeFileSync(pelelaPath, '<pelela view-model="Styled"><h1>Styled</h1></pelela>')
      fs.writeFileSync(cssPath, 'h1 { color: red; }')

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      const mockContext = { error: () => {} }
      const result = handler.call(mockContext as never, pelelaPath, {} as never) as string

      expect(result).toContain('import "./styled.css"')
    })
  })
})
