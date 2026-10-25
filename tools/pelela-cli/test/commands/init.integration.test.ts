import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { initCommand } from '../../src/commands/init'
import { initializeI18n } from '../../src/utils/i18n'

const BASE_COMPONENT_OPENING_TAG = '<pelela view-model="Base">'
const BASE_COMPONENT_CLOSING_TAG = '</pelela>'

describe('initCommand (Integration)', () => {
  let testDir: string

  beforeAll(async () => {
    await initializeI18n('en')
  })

  beforeEach(() => {
    testDir = `pelela-init-test-${randomUUID()}`
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('initializes a project from the base template', async () => {
    await initCommand({ projectName: testDir })

    const gitignorePath = join(testDir, '.gitignore')
    expect(existsSync(gitignorePath)).toBe(true)

    const packageJsonPath = join(testDir, 'package.json')
    expect(existsSync(packageJsonPath)).toBe(true)
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
    expect(packageJson.name).toBe(testDir)

    const biomeJsonPath = join(testDir, 'biome.json')
    expect(existsSync(biomeJsonPath)).toBe(true)

    expect(existsSync(join(testDir, 'src'))).toBe(true)
    expect(existsSync(join(testDir, 'index.html'))).toBe(true)
    expect(existsSync(join(testDir, 'main.ts'))).toBe(true)
  })

  it('initializes a project with the testing preset when requested', async () => {
    await initCommand({ projectName: testDir, testing: true })

    const packageJson = JSON.parse(readFileSync(join(testDir, 'package.json'), 'utf-8'))
    const tsConfig = JSON.parse(readFileSync(join(testDir, 'tsconfig.json'), 'utf-8'))
    const extensions = JSON.parse(
      readFileSync(join(testDir, '.vscode', 'extensions.json'), 'utf-8'),
    )

    expect(packageJson.devDependencies.vitest).toBe('4.0.14')
    expect(packageJson.devDependencies['@vitest/coverage-v8']).toBe('4.0.14')
    expect(packageJson.scripts.test).toBe('vitest')
    expect(packageJson.scripts['test:coverage']).toBe('vitest --coverage')
    expect(tsConfig.compilerOptions.types).toEqual(['vitest/globals'])
    expect(extensions.recommendations).toEqual([
      'biomejs.biome',
      'uqbar.pelela-vscode',
      'vitest.explorer',
    ])
    expect(existsSync(join(testDir, 'vitest.config.ts'))).toBe(true)
    expect(existsSync(join(testDir, '.github', 'workflows', 'testing.yml'))).toBe(true)
  })

  it('creates the base component with pelela as root', async () => {
    await initCommand({ projectName: testDir })

    const baseTemplate = readFileSync(join(testDir, 'src', 'base.pelela'), 'utf-8')
    const templateLines = baseTemplate.trim().split(/\r?\n/)

    expect(templateLines.at(0)).toBe(BASE_COMPONENT_OPENING_TAG)
    expect(templateLines.at(-1)).toBe(BASE_COMPONENT_CLOSING_TAG)
  })

  it('copies .vscode settings for .pelela formatting', async () => {
    await initCommand({ projectName: testDir })

    const settingsPath = join(testDir, '.vscode', 'settings.json')
    expect(existsSync(settingsPath)).toBe(true)

    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))

    expect(settings['files.associations']['*.pelela']).toBe('html')
    expect(settings['[html]']['editor.defaultFormatter']).toBe('vscode.html-language-features')
    expect(settings['editor.formatOnSave']).toBe(true)
    expect(settings['editor.defaultFormatter']).toBe('biomejs.biome')
  })

  it('copies .gitignore and .vscode folder from template', async () => {
    await initCommand({ projectName: testDir })

    expect(existsSync(join(testDir, '.gitignore'))).toBe(true)
    expect(existsSync(join(testDir, '.vscode'))).toBe(true)
    expect(existsSync(join(testDir, '.vscode', 'extensions.json'))).toBe(true)
  })
})
