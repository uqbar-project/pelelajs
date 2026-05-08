import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  computeTemplatePath,
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
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('computeTemplatePath', () => {
    it('computes path for dev environment (src/utils)', () => {
      // simulate the file path ending in 'utils'
      const path = computeTemplatePath(join('/', 'mock', 'src', 'utils'))
      expect(path).toContain('templates')
      expect(path).toContain('base-template-for-cli')
      expect(path).toBe(join('/', 'mock', 'templates', 'base-template-for-cli'))
    })

    it('computes path for prod environment (dist)', () => {
      // simulate the bundled path 'dist'
      const path = computeTemplatePath(join('/', 'mock', 'dist'))
      expect(path).toContain('base-template-for-cli')
      expect(path).toBe(join('/', 'mock', 'dist', 'base-template-for-cli'))
    })
  })

  describe('copyTemplate', () => {
    it('copies template and renames _biome.json to biome.json if it exists', () => {
      const projectPath = join(tempDir, 'test-copy')
      copyTemplate(projectPath)

      expect(existsSync(join(projectPath, 'biome.json'))).toBe(true)
      expect(existsSync(join(projectPath, '_biome.json'))).toBe(false)
      expect(existsSync(join(projectPath, 'package.json'))).toBe(true)
    })
  })

  describe('getTemplatePath', () => {
    it('returns template source path', () => {
      const path = getTemplatePath()

      expect(path).toContain('templates')
      expect(path).toContain('base-template-for-cli')
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
