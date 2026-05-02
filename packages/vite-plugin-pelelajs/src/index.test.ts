import * as fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  escapeTemplateForLiteral,
  extractLinkAttributeMatches,
  kebabToCamelCase,
  pelelajsPlugin,
} from './index'

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

      expect(errors.some((e) => e.includes('missingViewModel'))).toBe(true)
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

    it('reports error when multiple root tags exist', () => {
      const pelelaPath = path.join(tempDir, 'multiple.pelela')
      fs.writeFileSync(
        pelelaPath,
        '<pelela view-model="Home"></pelela><pelela view-model="Other"></pelela>',
      )

      const errors: string[] = []
      const errorFn = (msg: string | Error) => errors.push(String(msg))

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      handler.call({ error: errorFn } as never, pelelaPath, {} as never)

      expect(errors.some((e) => e.includes('multipleRoots'))).toBe(true)
    })

    it('reports error when foreign interpolation syntax is used', () => {
      const pelelaPath = path.join(tempDir, 'foreign.pelela')
      fs.writeFileSync(pelelaPath, '<pelela view-model="Home"><h1>{{value}}</h1></pelela>')

      const errors: string[] = []
      const errorFn = (msg: string | Error) => errors.push(String(msg))

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      handler.call({ error: errorFn } as never, pelelaPath, {} as never)

      expect(errors.some((e) => e.includes('foreignInterpolation'))).toBe(true)
    })

    it('reports error when foreign property binding syntax is used', () => {
      const pelelaPath = path.join(tempDir, 'foreign-prop.pelela')
      fs.writeFileSync(pelelaPath, '<pelela view-model="Home"><div [value]="x"></div></pelela>')

      const errors: string[] = []
      const errorFn = (msg: string | Error) => errors.push(String(msg))

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      handler.call({ error: errorFn } as never, pelelaPath, {} as never)

      expect(errors.some((e) => e.includes('foreignPropertyBinding'))).toBe(true)
    })

    it('reports error when forbidden attributes are on root tag', () => {
      const pelelaPath = path.join(tempDir, 'forbidden.pelela')
      fs.writeFileSync(pelelaPath, '<pelela view-model="Home" link-value="x"></pelela>')

      const errors: string[] = []
      const errorFn = (msg: string | Error) => errors.push(String(msg))

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      handler.call({ error: errorFn } as never, pelelaPath, {} as never)

      expect(errors.some((e) => e.includes('forbiddenRootAttribute'))).toBe(true)
    })

    it('reports error when link attributes are on standard HTML tags', () => {
      const pelelaPath = path.join(tempDir, 'html-link.pelela')
      fs.writeFileSync(
        pelelaPath,
        '<pelela view-model="Home"><div link-value="x">Test</div></pelela>',
      )

      const errors: string[] = []
      const errorFn = (msg: string | Error) => errors.push(String(msg))

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      handler.call({ error: errorFn } as never, pelelaPath, {} as never)

      expect(errors.some((e) => e.includes('forbiddenRootAttribute'))).toBe(true)
    })

    it('reports error when component attribute lacks prop-* or link-* prefix', () => {
      const pelelaPath = path.join(tempDir, 'invalid-comp.pelela')
      fs.writeFileSync(
        pelelaPath,
        '<pelela view-model="Home"><my-comp value="x"></my-comp></pelela>',
      )

      const errors: string[] = []
      const errorFn = (msg: string | Error) => errors.push(String(msg))

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      handler.call({ error: errorFn } as never, pelelaPath, {} as never)

      expect(errors.some((e) => e.includes('invalidComponentAttribute'))).toBe(true)
    })

    it('accepts prop-* prefix on component attributes', () => {
      const pelelaPath = path.join(tempDir, 'valid-props.pelela')
      fs.writeFileSync(
        pelelaPath,
        '<pelela view-model="Home"><my-comp prop-value="x"></my-comp></pelela>',
      )

      const errors: string[] = []
      const errorFn = (msg: string | Error) => errors.push(String(msg))

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      handler.call({ error: errorFn } as never, pelelaPath, {} as never)

      expect(errors.some((e) => e.includes('invalidComponentAttribute'))).toBe(false)
    })

    it('accepts link-* prefix on component attributes', () => {
      const pelelaPath = path.join(tempDir, 'valid-link.pelela')
      fs.writeFileSync(
        pelelaPath,
        '<pelela view-model="Home"><my-comp link-value="x"></my-comp></pelela>',
      )

      const errors: string[] = []
      const errorFn = (msg: string | Error) => errors.push(String(msg))

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      handler.call({ error: errorFn } as never, pelelaPath, {} as never)

      expect(errors.some((e) => e.includes('invalidComponentAttribute'))).toBe(false)
    })

    it('reports error for each invalid attribute when component has multiple invalid attributes', () => {
      const pelelaPath = path.join(tempDir, 'multi-invalid.pelela')
      fs.writeFileSync(
        pelelaPath,
        '<pelela view-model="Home"><my-comp class="bad" id="bad2" prop-x="ok"></my-comp></pelela>',
      )

      const errors: string[] = []
      const errorFn = (msg: string | Error) => errors.push(String(msg))

      const plugin = pelelajsPlugin()
      const handler = getHandler(plugin.load!)

      handler.call({ error: errorFn } as never, pelelaPath, {} as never)

      const invalidAttrErrors = errors.filter((e) => e.includes('invalidComponentAttribute'))
      expect(invalidAttrErrors).toHaveLength(2)
    })

    describe('component attribute extraction with values containing "="', () => {
      it('does not report false positive when prop-* value contains "=" (URL query string)', () => {
        const pelelaPath = path.join(tempDir, 'url-value.pelela')
        fs.writeFileSync(
          pelelaPath,
          '<pelela view-model="Home"><my-comp prop-url="api?a=1&b=2"></my-comp></pelela>',
        )

        const errors: string[] = []
        const errorFn = (msg: string | Error) => errors.push(String(msg))

        const plugin = pelelajsPlugin()
        const handler = getHandler(plugin.load!)

        handler.call({ error: errorFn } as never, pelelaPath, {} as never)

        expect(errors.some((e) => e.includes('invalidComponentAttribute'))).toBe(false)
      })

      it('does not report false positive when link-* value contains "="', () => {
        const pelelaPath = path.join(tempDir, 'link-eq-value.pelela')
        fs.writeFileSync(
          pelelaPath,
          '<pelela view-model="Home"><my-comp link-value="x=1"></my-comp></pelela>',
        )

        const errors: string[] = []
        const errorFn = (msg: string | Error) => errors.push(String(msg))

        const plugin = pelelajsPlugin()
        const handler = getHandler(plugin.load!)

        handler.call({ error: errorFn } as never, pelelaPath, {} as never)

        expect(errors.some((e) => e.includes('invalidComponentAttribute'))).toBe(false)
      })

      it('does not report false positive when single-quoted value contains "="', () => {
        const pelelaPath = path.join(tempDir, 'single-quote-eq.pelela')
        fs.writeFileSync(
          pelelaPath,
          `<pelela view-model="Home"><my-comp prop-label='key=value'></my-comp></pelela>`,
        )

        const errors: string[] = []
        const errorFn = (msg: string | Error) => errors.push(String(msg))

        const plugin = pelelajsPlugin()
        const handler = getHandler(plugin.load!)

        handler.call({ error: errorFn } as never, pelelaPath, {} as never)

        expect(errors.some((e) => e.includes('invalidComponentAttribute'))).toBe(false)
      })

      it('still detects truly invalid attributes when valid ones have "=" in their values', () => {
        const pelelaPath = path.join(tempDir, 'mixed-valid-invalid.pelela')
        fs.writeFileSync(
          pelelaPath,
          '<pelela view-model="Home"><my-comp prop-url="a=b" class="foo"></my-comp></pelela>',
        )

        const errors: string[] = []
        const errorFn = (msg: string | Error) => errors.push(String(msg))

        const plugin = pelelajsPlugin()
        const handler = getHandler(plugin.load!)

        handler.call({ error: errorFn } as never, pelelaPath, {} as never)

        const invalidAttrErrors = errors.filter((e) => e.includes('invalidComponentAttribute'))
        expect(invalidAttrErrors).toHaveLength(1)
      })

      it('reports error for unprefixed boolean attributes on component tags', () => {
        const pelelaPath = path.join(tempDir, 'boolean-attr.pelela')
        fs.writeFileSync(
          pelelaPath,
          '<pelela view-model="Home"><my-comp disabled prop-value="ok"></my-comp></pelela>',
        )

        const errors: string[] = []
        const errorFn = (msg: string | Error) => errors.push(String(msg))

        const plugin = pelelajsPlugin()
        const handler = getHandler(plugin.load!)

        handler.call({ error: errorFn } as never, pelelaPath, {} as never)

        expect(errors.some((e) => e.includes('invalidComponentAttribute'))).toBe(true)
      })
    })
  })

  describe('helper functions', () => {
    describe('extractLinkAttributeMatches', () => {
      it('extracts link attributes from HTML', () => {
        const html = '<div link-value="x"></div><span link-content="y"></span>'
        const matches = extractLinkAttributeMatches(html)

        expect(matches).toHaveLength(2)
        expect(matches[0]).toEqual({ tagName: 'div', attributeName: 'link-value' })
        expect(matches[1]).toEqual({ tagName: 'span', attributeName: 'link-content' })
      })

      it('handles multiple link attributes on same tag', () => {
        const html = '<div link-value="x" link-content="y"></div>'
        const matches = extractLinkAttributeMatches(html)

        expect(matches).toHaveLength(2)
        expect(matches[0].tagName).toBe('div')
        expect(matches[0].attributeName).toMatch(/^link-/)
        expect(matches[1].tagName).toBe('div')
        expect(matches[1].attributeName).toMatch(/^link-/)
      })

      it('converts tag names to lowercase', () => {
        const html = '<DIV link-value="x"></DIV>'
        const matches = extractLinkAttributeMatches(html)

        expect(matches[0].tagName).toBe('div')
      })

      it('returns empty array when no link attributes found', () => {
        const html = '<div class="x"></div>'
        const matches = extractLinkAttributeMatches(html)

        expect(matches).toHaveLength(0)
      })

      it('handles complex HTML with nested tags', () => {
        const html = '<div><span link-value="x"></span></div>'
        const matches = extractLinkAttributeMatches(html)

        expect(matches).toHaveLength(1)
        expect(matches[0]).toEqual({ tagName: 'span', attributeName: 'link-value' })
      })
    })

    describe('kebabToCamelCase', () => {
      it('converts kebab-case to camelCase', () => {
        expect(kebabToCamelCase('my-component')).toBe('myComponent')
        expect(kebabToCamelCase('person-row')).toBe('personRow')
        expect(kebabToCamelCase('detail-special')).toBe('detailSpecial')
      })

      it('handles single word', () => {
        expect(kebabToCamelCase('home')).toBe('home')
        expect(kebabToCamelCase('counter')).toBe('counter')
      })

      it('handles multiple hyphens', () => {
        expect(kebabToCamelCase('my-long-component-name')).toBe('myLongComponentName')
      })

      it('handles dots as separators', () => {
        expect(kebabToCamelCase('foo.bar')).toBe('fooBar')
      })

      it('handles mixed separators', () => {
        expect(kebabToCamelCase('my-component.name')).toBe('myComponentName')
      })
    })

    describe('escapeTemplateForLiteral', () => {
      it('escapes backticks', () => {
        expect(escapeTemplateForLiteral('`hello`')).toBe('\\`hello\\`')
        expect(escapeTemplateForLiteral('test `code` here')).toBe('test \\`code\\` here')
      })

      it('escapes template literal expressions', () => {
        expect(escapeTemplateForLiteral('${' + 'value' + '}')).toBe('\\${' + 'value' + '}')
        expect(escapeTemplateForLiteral('test ${' + 'x' + '} here')).toBe(
          'test \\${' + 'x' + '} here',
        )
      })

      it('escapes both backticks and expressions', () => {
        expect(escapeTemplateForLiteral('`test ${' + 'x' + '}`')).toBe(
          '\\`test \\${' + 'x' + '}\\`',
        )
      })

      it('leaves normal text unchanged', () => {
        expect(escapeTemplateForLiteral('hello world')).toBe('hello world')
        expect(escapeTemplateForLiteral('<div>test</div>')).toBe('<div>test</div>')
      })
    })
  })
})
