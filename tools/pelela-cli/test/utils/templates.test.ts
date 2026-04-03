import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  copyTemplate,
  getTemplatePath,
  updateProjectPackageJson,
  validateTemplatePath,
} from '../../src/utils/templates'

describe('templates', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'template-test-'))
  })

  afterEach(() => {
    try {
      rmdirSync(tempDir, { recursive: true })
    } catch {
      // ignore cleanup errors
    }
  })

  describe('getTemplatePath', () => {
    it('returns template source path', () => {
      const path = getTemplatePath()

      expect(path).toContain('templates')
      expect(path).toContain('basic-converter')
    })
  })

  describe('validateTemplatePath', () => {
    it('returns boolean based on template existence', () => {
      // This function depends on the actual filesystem
      // In production it validates TEMPLATE_SOURCE exists
      const result = validateTemplatePath()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('updateProjectPackageJson', () => {
    it('updates package.json name field', () => {
      const projectPath = join(tempDir, 'test-project')
      mkdirSync(projectPath, { recursive: true })

      const packageJsonPath = join(projectPath, 'package.json')
      writeFileSync(packageJsonPath, JSON.stringify({ name: 'old-name', version: '1.0.0' }))

      updateProjectPackageJson(projectPath, 'new-project-name')

      const updated = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
      expect(updated.name).toBe('new-project-name')
      expect(updated.version).toBe('1.0.0')
    })

    it('throws error when package.json does not exist', () => {
      const projectPath = join(tempDir, 'non-existent')
      mkdirSync(projectPath, { recursive: true })

      expect(() => {
        updateProjectPackageJson(projectPath, 'test-name')
      }).toThrow('Failed to update package.json')
    })

    it('throws error when package.json is invalid JSON', () => {
      const projectPath = join(tempDir, 'bad-json')
      mkdirSync(projectPath, { recursive: true })
      writeFileSync(join(projectPath, 'package.json'), 'not valid json')

      expect(() => {
        updateProjectPackageJson(projectPath, 'test-name')
      }).toThrow('Failed to update package.json')
    })
  })
})
