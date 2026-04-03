import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDirectory, executeCommand, pathExists, resolvePath } from '../../src/utils/shell'

describe('Shell utilities', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'shell-test-'))
  })

  afterEach(() => {
    try {
      rmdirSync(tempDir, { recursive: true })
    } catch {
      // ignore cleanup errors
    }
  })

  describe('createDirectory', () => {
    it('creates a new directory when it does not exist', () => {
      const newDir = join(tempDir, 'new-directory')

      createDirectory(newDir)

      expect(pathExists(newDir)).toBe(true)
    })

    it('does not throw when directory already exists', () => {
      const existingDir = join(tempDir, 'existing-directory')
      createDirectory(existingDir)

      expect(() => createDirectory(existingDir)).not.toThrow()
      expect(pathExists(existingDir)).toBe(true)
    })

    it('creates nested directories recursively', () => {
      const nestedDir = join(tempDir, 'level1', 'level2', 'level3')

      createDirectory(nestedDir)

      expect(pathExists(nestedDir)).toBe(true)
    })
  })

  describe('pathExists', () => {
    it('returns true for existing directory', () => {
      expect(pathExists(tempDir)).toBe(true)
    })

    it('returns false for non-existent directory', () => {
      const nonExistent = join(tempDir, 'does-not-exist')

      expect(pathExists(nonExistent)).toBe(false)
    })

    it('returns true for existing file or directory', () => {
      const filePath = join(tempDir, 'test-file.txt')
      writeFileSync(filePath, 'content')

      expect(pathExists(filePath)).toBe(true)

      unlinkSync(filePath)
    })
  })

  describe('resolvePath', () => {
    it('resolves relative path from cwd', () => {
      const resolved = resolvePath('some', 'path')

      expect(resolved).toContain('some')
      expect(resolved).toContain('path')
      expect(isAbsolute(resolved)).toBe(true)
    })

    it('resolves multiple path segments', () => {
      const resolved = resolvePath('a', 'b', 'c')

      expect(resolved).toContain('a')
      expect(resolved).toContain('b')
      expect(resolved).toContain('c')
    })
  })

  describe('executeCommand', () => {
    it('executes a simple command and returns output', () => {
      const result = executeCommand('echo hello')

      expect(result).toBe('hello')
    })

    it('executes command in specified cwd', () => {
      const result = executeCommand('pwd', tempDir)

      expect(result).toContain(tempDir.split('/').pop()!)
    })

    it('throws error when command fails', () => {
      expect(() => {
        executeCommand('exit 1')
      }).toThrow('Command failed')
    })

    it('throws error for non-existent command', () => {
      expect(() => {
        executeCommand('thiscommanddoesnotexist')
      }).toThrow('Command failed')
    })
  })
})
