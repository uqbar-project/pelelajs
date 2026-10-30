import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { initializeI18n, t } from '../../src/utils/i18n'
import {
  BASE_TEMPLATE_FOR_CLI,
  computeTemplatePath,
  copyTemplate,
  getTemplatePath,
  updateProjectPackageJson,
  validateTemplatePath,
} from '../../src/utils/templates'

beforeAll(async () => {
  await initializeI18n('en')
})

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
    copyFileSync: vi.fn(actual.copyFileSync),
  }
})

describe('templates', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'template-test-'))
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    const fs = await import('node:fs')
    const actualFs = await vi.importActual<typeof import('node:fs')>('node:fs')

    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.existsSync).mockImplementation(actualFs.existsSync)
    vi.mocked(fs.copyFileSync).mockReset()
    vi.mocked(fs.copyFileSync).mockImplementation(actualFs.copyFileSync)
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('computeTemplatePath', () => {
    it('computes path for dev environment (src/utils)', () => {
      // simulate the file path ending in 'utils'
      const path = computeTemplatePath(join('/', 'mock', 'src', 'utils'))
      expect(path).toContain('templates')
      expect(path).toContain(BASE_TEMPLATE_FOR_CLI)
      expect(path).toBe(join('/', 'mock', 'templates', BASE_TEMPLATE_FOR_CLI))
    })

    it('computes path for prod environment (dist)', () => {
      // simulate the bundled path 'dist'
      const path = computeTemplatePath(join('/', 'mock', 'dist'))
      expect(path).toContain(BASE_TEMPLATE_FOR_CLI)
      expect(path).toBe(join('/', 'mock', 'dist', BASE_TEMPLATE_FOR_CLI))
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

    it('throws error when template source is missing', async () => {
      const fs = await import('node:fs')
      const templatePath = getTemplatePath()

      vi.mocked(fs.existsSync).mockImplementation((path: unknown) => path !== templatePath)

      expect(() => copyTemplate(join(tempDir, 'fail'))).toThrow('Template source not found')
    })

    it('throws error when copy fails', async () => {
      const fs = await import('node:fs')
      let failedFileName = ''
      const copyFileMock = vi.mocked(fs.copyFileSync)
      copyFileMock.mockImplementationOnce((sourcePath) => {
        failedFileName = basename(String(sourcePath))
        throw new Error('Disk full')
      })
      let copyError: unknown
      let copyCallCount = 0

      try {
        copyTemplate(join(tempDir, 'fail-copy'))
      } catch (error) {
        copyError = error
      } finally {
        copyCallCount = copyFileMock.mock.calls.length
      }

      expect(failedFileName).not.toBe('')
      expect(copyError).toEqual(
        new Error(
          t('commands.init.error.copyFileFailed', {
            fileName: failedFileName,
            error: 'Disk full',
          }),
        ),
      )
      expect(copyCallCount).toBeGreaterThan(1)
    })

    it('throws error if package.json is missing after copy', async () => {
      const fs = await import('node:fs')
      const projectPath = join(tempDir, 'after-copy')
      const expectedPackageJson = join(projectPath, 'package.json')

      // Simulate successful copy but missing package.json validation
      vi.mocked(fs.existsSync).mockImplementation((path: unknown) => {
        if (typeof path === 'string' && path === expectedPackageJson) return false
        // Call original behavior by importing actual
        return require('node:fs').existsSync(path)
      })
      expect(() => copyTemplate(projectPath)).toThrow('Template was not copied correctly')
      expect(() => copyTemplate(projectPath)).toThrow('Template was not copied correctly')
    })
  })

  describe('getTemplatePath', () => {
    it('returns template source path', () => {
      const path = getTemplatePath()

      expect(path).toContain('templates')
      expect(path).toContain(BASE_TEMPLATE_FOR_CLI)
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
      }).toThrow('Failed to read/write package.json')
    })

    it('throws error when package.json is invalid JSON', () => {
      const projectPath = join(tempDir, 'bad-json')
      mkdirSync(projectPath, { recursive: true })
      writeFileSync(join(projectPath, 'package.json'), 'not valid json')

      expect(() => {
        updateProjectPackageJson(projectPath, 'test-name')
      }).toThrow('Failed to read/write package.json')
    })
  })
})
