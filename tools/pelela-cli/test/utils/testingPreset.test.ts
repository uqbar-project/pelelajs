import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { initializeI18n, t } from '../../src/utils/i18n'
import { getTemplatePath } from '../../src/utils/templates'
import { applyTestingPreset } from '../../src/utils/testingPreset'

const PRESET_FILES_PATH = join(dirname(getTemplatePath()), 'presets', 'testing', 'files')
const PACKAGE_JSON_NAME = 'package.json'
const TSCONFIG_NAME = 'tsconfig.json'
const VITEST_CONFIG_NAME = 'vitest.config.ts'
const EXTENSIONS_CONFIG_PATH = join('.vscode', 'extensions.json')

describe('applyTestingPreset', () => {
  let tempDir: string
  let projectPath: string

  beforeAll(async () => {
    await initializeI18n('en')
  })

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'testing-preset-test-'))
    projectPath = join(tempDir, 'project')
    mkdirSync(projectPath, { recursive: true })
    writeFileSync(
      join(projectPath, PACKAGE_JSON_NAME),
      JSON.stringify({
        name: 'sample-project',
        scripts: { dev: 'vite' },
        devDependencies: { vite: '7.3.5' },
      }),
    )
    writeFileSync(
      join(projectPath, TSCONFIG_NAME),
      JSON.stringify({ compilerOptions: { strict: true, types: ['node'] } }),
    )
    mkdirSync(join(projectPath, '.vscode'), { recursive: true })
    writeFileSync(
      join(projectPath, EXTENSIONS_CONFIG_PATH),
      JSON.stringify({ recommendations: ['biomejs.biome'] }),
    )
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('merges Vitest configuration and copies preset files', () => {
    applyTestingPreset(projectPath)

    const packageJson = JSON.parse(readFileSync(join(projectPath, PACKAGE_JSON_NAME), 'utf-8'))
    const tsConfig = JSON.parse(readFileSync(join(projectPath, TSCONFIG_NAME), 'utf-8'))
    const extensions = JSON.parse(readFileSync(join(projectPath, EXTENSIONS_CONFIG_PATH), 'utf-8'))
    const sourceVitestConfig = readFileSync(join(PRESET_FILES_PATH, VITEST_CONFIG_NAME), 'utf-8')

    expect(packageJson.devDependencies).toEqual({
      vite: '7.3.5',
      '@vitest/coverage-v8': '4.0.14',
      vitest: '4.0.14',
    })
    expect(packageJson.scripts).toEqual({
      dev: 'vite',
      test: 'vitest',
      'test:coverage': 'vitest --coverage',
    })
    expect(tsConfig.compilerOptions).toEqual({
      strict: true,
      types: ['node', 'vitest/globals'],
    })
    expect(extensions.recommendations).toEqual(['biomejs.biome', 'vitest.explorer'])
    expect(readFileSync(join(projectPath, VITEST_CONFIG_NAME), 'utf-8')).toBe(sourceVitestConfig)
    expect(existsSync(join(projectPath, '.github', 'workflows', 'testing.yml'))).toBe(true)
  })

  it('is idempotent when applied more than once', () => {
    applyTestingPreset(projectPath)
    const packageJsonBeforeReapplication = readFileSync(
      join(projectPath, PACKAGE_JSON_NAME),
      'utf-8',
    )
    const tsConfigBeforeReapplication = readFileSync(join(projectPath, TSCONFIG_NAME), 'utf-8')
    const extensionsBeforeReapplication = readFileSync(
      join(projectPath, EXTENSIONS_CONFIG_PATH),
      'utf-8',
    )
    const workflowBeforeReapplication = readFileSync(
      join(projectPath, '.github', 'workflows', 'testing.yml'),
      'utf-8',
    )

    applyTestingPreset(projectPath)

    expect(readFileSync(join(projectPath, PACKAGE_JSON_NAME), 'utf-8')).toBe(
      packageJsonBeforeReapplication,
    )
    expect(readFileSync(join(projectPath, TSCONFIG_NAME), 'utf-8')).toBe(
      tsConfigBeforeReapplication,
    )
    expect(readFileSync(join(projectPath, EXTENSIONS_CONFIG_PATH), 'utf-8')).toBe(
      extensionsBeforeReapplication,
    )
    expect(readFileSync(join(projectPath, '.github', 'workflows', 'testing.yml'), 'utf-8')).toBe(
      workflowBeforeReapplication,
    )
  })

  it('rejects an existing test script without changing project files', () => {
    const packageJsonPath = join(projectPath, PACKAGE_JSON_NAME)
    const originalPackageJson = {
      name: 'sample-project',
      scripts: { dev: 'vite', test: 'jest' },
      devDependencies: { vite: '7.3.5' },
    }
    writeFileSync(packageJsonPath, JSON.stringify(originalPackageJson))

    expect(() => applyTestingPreset(projectPath)).toThrow(
      t('commands.testing.error.conflict', {
        filePath: packageJsonPath,
        entry: 'scripts.test',
      }),
    )
    expect(readFileSync(packageJsonPath, 'utf-8')).toBe(JSON.stringify(originalPackageJson))
    expect(existsSync(join(projectPath, VITEST_CONFIG_NAME))).toBe(false)
    expect(existsSync(join(projectPath, '.github', 'workflows', 'testing.yml'))).toBe(false)
  })

  it('rejects a conflicting preset file before modifying configuration', () => {
    const vitestConfigPath = join(projectPath, VITEST_CONFIG_NAME)
    const originalPackageJson = readFileSync(join(projectPath, PACKAGE_JSON_NAME), 'utf-8')
    const originalTsConfig = readFileSync(join(projectPath, TSCONFIG_NAME), 'utf-8')
    const conflictingContent = 'export default {}'
    writeFileSync(vitestConfigPath, conflictingContent)

    expect(() => applyTestingPreset(projectPath)).toThrow(
      t('commands.testing.error.conflict', {
        filePath: vitestConfigPath,
        entry: 'file',
      }),
    )
    expect(readFileSync(join(projectPath, PACKAGE_JSON_NAME), 'utf-8')).toBe(originalPackageJson)
    expect(readFileSync(join(projectPath, TSCONFIG_NAME), 'utf-8')).toBe(originalTsConfig)
    expect(readFileSync(vitestConfigPath, 'utf-8')).toBe(conflictingContent)
  })

  it('reports malformed JSON with the affected project file', () => {
    const packageJsonPath = join(projectPath, PACKAGE_JSON_NAME)
    writeFileSync(packageJsonPath, '{ invalid json')

    expect(() => applyTestingPreset(projectPath)).toThrow(
      t('commands.testing.error.invalidJson', { filePath: packageJsonPath }),
    )
  })

  it('rejects invalid TypeScript types configuration without changing package.json', () => {
    const packageJsonPath = join(projectPath, PACKAGE_JSON_NAME)
    const originalPackageJson = readFileSync(packageJsonPath, 'utf-8')
    writeFileSync(
      join(projectPath, TSCONFIG_NAME),
      JSON.stringify({ compilerOptions: { types: 'node' } }),
    )

    expect(() => applyTestingPreset(projectPath)).toThrow(
      t('commands.testing.error.invalidConfig', {
        filePath: join(projectPath, TSCONFIG_NAME),
        section: 'compilerOptions.types',
      }),
    )
    expect(readFileSync(packageJsonPath, 'utf-8')).toBe(originalPackageJson)
    expect(existsSync(join(projectPath, VITEST_CONFIG_NAME))).toBe(false)
  })
})
