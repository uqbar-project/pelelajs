import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import ts from 'typescript'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { initCommand } from '../../src/commands/init'
import { initializeI18n } from '../../src/utils/i18n'
import * as shell from '../../src/utils/shell'

vi.mock('../../src/utils/shell', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/shell')>()
  return { ...actual, installDependencies: vi.fn() }
})

const mockedShell = vi.mocked(shell)

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
    vi.clearAllMocks()
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('initializes a project from the base template', async () => {
    await initCommand({ projectName: testDir })

    expect(mockedShell.installDependencies).toHaveBeenCalledWith(join(process.cwd(), testDir))

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

  it('initializes a project with valid asset and virtual module declarations', async () => {
    await initCommand({ projectName: testDir })

    const projectPath = resolve(testDir)
    const require = createRequire(import.meta.url)
    const vitestRequire = createRequire(require.resolve('vitest/package.json'))
    const vitePath = dirname(vitestRequire.resolve('vite/package.json'))
    mkdirSync(join(projectPath, 'node_modules'))
    symlinkSync(vitePath, join(projectPath, 'node_modules', 'vite'), 'junction')

    const importsPath = join(projectPath, 'imports.ts')
    writeFileSync(
      importsPath,
      [
        "import './styles.css'",
        "import 'virtual:pelela-auto-register'",
        "import template, { viewModelName } from './src/base.pelela'",
        'const mode: string = import.meta.env.MODE',
        'export { template, viewModelName, mode }',
      ].join('\n'),
    )

    const config = ts.readConfigFile(join(projectPath, 'tsconfig.json'), ts.sys.readFile)
    expect(config.error).toBeUndefined()
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, projectPath)
    expect(parsed.errors).toEqual([])
    expect(parsed.fileNames.map((file) => relative(projectPath, file))).toEqual(
      expect.arrayContaining(['pelela-env.d.ts', join('src', 'vite-env.d.ts')]),
    )

    const program = ts.createProgram({
      rootNames: [...parsed.fileNames.filter((file) => file.endsWith('.d.ts')), importsPath],
      options: { ...parsed.options, noEmit: true, noUncheckedSideEffectImports: true },
    })
    const diagnostics = ts.getPreEmitDiagnostics(program)
    expect(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: () => projectPath,
        getNewLine: () => '\n',
      }),
    ).toBe('')
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
