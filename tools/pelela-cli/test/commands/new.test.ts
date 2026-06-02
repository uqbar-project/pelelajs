import * as fs from 'node:fs'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { newCommand } from '../../src/commands/new'
import { initializeI18n, t } from '../../src/utils/i18n'

vi.mock('node:fs')
const mockedFs = vi.mocked(fs)

beforeAll(async () => {
  await initializeI18n('en')
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
})
