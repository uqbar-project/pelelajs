import * as fs from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { pelelajsPlugin } from './index'

vi.mock('node:fs')

describe('pelelajsPlugin', () => {
  const plugin = pelelajsPlugin() as any

  it('should identify itself correctly', () => {
    expect(plugin.name).toBe('vite-plugin-pelelajs')
  })

  describe('load', () => {
    it('should return null for non-pelela files', () => {
      expect(plugin.load('test.ts')).toBeNull()
    })

    it('should process a valid <pelela> template', () => {
      const source = '<pelela view-model="TestVM"><div>Hello</div></pelela>'
      vi.mocked(fs.readFileSync).mockReturnValue(source)
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const errorSpy = vi.fn()
      const context = { error: errorSpy }
      const result = plugin.load.call(context, 'test.pelela')
      expect(result).toContain('export const viewModelName = "TestVM"')
      expect(result).toContain(
        'const template = `<pelela view-model="TestVM"><div>Hello</div></pelela>`',
      )
    })

    it('should process a valid <component> template', () => {
      const source = '<component view-model="MyComp"><span>Hi</span></component>'
      vi.mocked(fs.readFileSync).mockReturnValue(source)

      const errorSpy = vi.fn()
      const context = { error: errorSpy }
      const result = plugin.load.call(context, 'test.pelela')
      expect(result).toContain('export const viewModelName = "MyComp"')
    })

    it('should fail if view-model is missing', () => {
      const source = '<component>No VM</component>'
      vi.mocked(fs.readFileSync).mockReturnValue(source)

      const errorSpy = vi.fn()
      const context = { error: errorSpy }

      plugin.load.call(context, 'test.pelela')
      expect(errorSpy).toHaveBeenCalled()
    })

    it('should fail if multiple roots are present', () => {
      const source = '<component view-model="A"></component><component view-model="B"></component>'
      vi.mocked(fs.readFileSync).mockReturnValue(source)

      const errorSpy = vi.fn()
      const context = { error: errorSpy }

      plugin.load.call(context, 'test.pelela')
      expect(errorSpy).toHaveBeenCalled()
    })

    it('should fail if foreign syntax {{}} is detected', () => {
      const source = '<pelela view-model="A"><div>{{ wrong }}</div></pelela>'
      vi.mocked(fs.readFileSync).mockReturnValue(source)

      const errorSpy = vi.fn()
      const context = { error: errorSpy }

      plugin.load.call(context, 'test.pelela')
      expect(errorSpy).toHaveBeenCalled()
    })

    it('should fail if a forbidden attribute (like link-*) is on the <pelela> tag', () => {
      const source = '<pelela view-model="A" link-value="B"></pelela>'
      vi.mocked(fs.readFileSync).mockReturnValue(source)

      const errorSpy = vi.fn()
      const context = { error: errorSpy }

      plugin.load.call(context, 'test.pelela')
      expect(errorSpy).toHaveBeenCalled()
      const lastError = errorSpy.mock.calls[0][0]
      expect(lastError.includes('link-value') || lastError.includes('forbiddenRootAttribute')).toBe(
        true,
      )
    })

    it('should NOT fail if link-* is on the <component> tag', () => {
      const source = '<component view-model="A" link-value="B"></component>'
      vi.mocked(fs.readFileSync).mockReturnValue(source)

      const errorSpy = vi.fn()
      const context = { error: errorSpy }

      plugin.load.call(context, 'test.pelela')
      expect(errorSpy).not.toHaveBeenCalled()
    })
  })
})
