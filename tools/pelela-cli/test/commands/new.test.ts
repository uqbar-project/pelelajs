import * as fs from 'node:fs'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { newCommand } from '../../src/commands/new'
import { initializeI18n, t } from '../../src/utils/i18n'
import * as testingPreset from '../../src/utils/testingPreset'

vi.mock('node:fs')
vi.mock('../../src/utils/testingPreset')

const mockedFs = vi.mocked(fs)
const mockedTestingPreset = vi.mocked(testingPreset)

const EXPECTED_SPEC_CONTENT = `import { describe, expect, it } from 'vitest'

describe('Dashboard', () => {
  it('works as expected', () => {
    expect(1).toBe(1) // TODO: Add real assertion here
  })
})
`

beforeAll(async () => {
  await initializeI18n('en')
})

beforeEach(() => {
  mockedTestingPreset.isTestingConfigured.mockReturnValue(false)
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('newCommand', () => {
  it('throws for empty componentName', async () => {
    await expect(newCommand({ componentName: '' })).rejects.toThrow(
      t('commands.new.error.nameEmpty'),
    )
  })

  it('throws for invalid componentName', async () => {
    await expect(newCommand({ componentName: 'my-component' })).rejects.toThrow(
      t('commands.new.error.nameInvalid'),
    )
  })

  it('throws if files already exist', async () => {
    mockedFs.existsSync.mockReturnValue(true)
    await expect(newCommand({ componentName: 'MyComponent' })).rejects.toThrow(
      t('commands.new.error.filesExist', { name: 'MyComponent' }),
    )
  })

  it('creates files successfully in src directory if it exists', async () => {
    mockedFs.existsSync.mockImplementation((path) => path === 'src')

    await newCommand({ componentName: 'MyComponent' })

    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(3)
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('src/my-component.ts'),
      expect.stringContaining('export class MyComponent {'),
    )
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('src/my-component.pelela'),
      expect.stringMatching(/^<pelela view-model="MyComponent">/),
    )
    expect(mockedFs.writeFileSync).not.toHaveBeenCalledWith(
      expect.stringContaining('src/my-component.pelela'),
      expect.stringContaining('<div>'),
    )
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('src/my-component.css'),
      expect.stringContaining('Styles for MyComponent component'),
    )
  })

  it('creates files successfully in root if src does not exist', async () => {
    mockedFs.existsSync.mockReturnValue(false)

    await newCommand({ componentName: 'MyComponent' })

    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      'my-component.ts',
      expect.stringContaining('export class MyComponent {'),
    )
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      'my-component.pelela',
      expect.stringMatching(/^<pelela view-model="MyComponent">/),
    )
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      'my-component.css',
      expect.stringContaining('Styles for MyComponent component'),
    )
  })

  it('does not create css file when css option is false', async () => {
    mockedFs.existsSync.mockImplementation((path) => path === 'src')

    await newCommand({ componentName: 'MyComponent', css: false })

    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2)
    expect(mockedFs.writeFileSync).not.toHaveBeenCalledWith(
      expect.stringContaining('src/my-component.css'),
      expect.any(String),
    )
  })

  it('strips redundant src/ prefix when src directory exists', async () => {
    mockedFs.existsSync.mockImplementation((path) => path === 'src')

    await newCommand({ componentName: 'src/MyComponent' })

    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('src/my-component.ts'),
      expect.stringContaining('export class MyComponent {'),
    )
  })

  it('throws error when creation fails', async () => {
    mockedFs.existsSync.mockReturnValue(false)
    mockedFs.writeFileSync.mockImplementation(() => {
      throw new Error('Write failed')
    })

    await expect(newCommand({ componentName: 'MyComponent' })).rejects.toThrow(
      t('commands.new.error.creationFailed', { error: 'Write failed' }),
    )
  })

  it('uses <component> tag when component option is true', async () => {
    mockedFs.existsSync.mockImplementation((path) => path === 'src')

    await newCommand({ componentName: 'MyComponent', component: true })

    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('src/my-component.pelela'),
      expect.stringMatching(/^<component view-model="MyComponent">/),
    )
  })

  it('creates a spec with the component name when testing is configured', async () => {
    mockedFs.existsSync.mockImplementation((path) => path === 'src')
    mockedTestingPreset.isTestingConfigured.mockReturnValue(true)

    await newCommand({ componentName: 'Dashboard' })

    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(4)
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      'src/dashboard.spec.ts',
      EXPECTED_SPEC_CONTENT,
    )
  })

  it('does not create a spec when testing is not configured', async () => {
    mockedFs.existsSync.mockImplementation((path) => path === 'src')

    await newCommand({ componentName: 'Dashboard' })

    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(3)
    expect(mockedFs.writeFileSync).not.toHaveBeenCalledWith(
      'src/dashboard.spec.ts',
      expect.any(String),
    )
  })

  it('throws if the spec file already exists', async () => {
    mockedFs.existsSync.mockImplementation(
      (path) => path === 'src' || path === 'src/dashboard.spec.ts',
    )
    mockedTestingPreset.isTestingConfigured.mockReturnValue(true)

    await expect(newCommand({ componentName: 'Dashboard' })).rejects.toThrow(
      t('commands.new.error.filesExist', { name: 'Dashboard' }),
    )
  })
})
