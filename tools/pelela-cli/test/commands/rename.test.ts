import * as fs from 'node:fs'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renameCommand } from '../../src/commands/rename'
import { initializeI18n, t } from '../../src/utils/i18n'

vi.mock('node:fs')
const mockedFs = vi.mocked(fs)

const OLD_TS = 'src/Old.ts'
const OLD_PELELA = 'src/Old.pelela'
const OLD_CSS = 'src/Old.css'
const NEW_TS = 'src/New.ts'
const NEW_PELELA = 'src/New.pelela'
const NEW_CSS = 'src/New.css'
const NEW_DIR = 'src/new-dir'

const OLD_CONTENT_TS = 'export class Old {}'
const OLD_CONTENT_PELELA = '<pelela view-model="Old"></pelela>'
const NEW_CONTENT_TS = 'export class New {}'
const NEW_CONTENT_PELELA = '<pelela view-model="New"></pelela>'

beforeAll(async () => {
  await initializeI18n('en')
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('renameCommand', () => {
  it('throws for empty old name', async () => {
    await expect(renameCommand({ oldName: '', newName: 'New' })).rejects.toThrow(
      t('commands.rename.error.oldNameEmpty'),
    )
  })

  it('throws for empty new name', async () => {
    await expect(renameCommand({ oldName: 'Old', newName: '' })).rejects.toThrow(
      t('commands.rename.error.newNameEmpty'),
    )
  })

  it('throws for invalid new name', async () => {
    await expect(renameCommand({ oldName: 'Old', newName: 'invalid-name' })).rejects.toThrow(
      t('commands.rename.error.nameInvalid'),
    )
  })

  it('throws if old files do not exist', async () => {
    mockedFs.existsSync.mockReturnValue(false)
    await expect(renameCommand({ oldName: 'Old', newName: 'New' })).rejects.toThrow(
      t('commands.rename.error.oldNotFound', { name: 'Old' }),
    )
  })

  it('throws if new files already exist', async () => {
    const existing = ['src', OLD_TS, NEW_TS]
    mockedFs.existsSync.mockImplementation((path) => existing.includes(path.toString()))

    await expect(renameCommand({ oldName: 'Old', newName: 'New' })).rejects.toThrow(
      t('commands.rename.error.newNameExists', { name: 'New' }),
    )
  })

  it('renames files and updates content successfully', async () => {
    const existing = ['src', OLD_TS, OLD_PELELA, OLD_CSS]
    mockedFs.existsSync.mockImplementation((path) => existing.includes(path.toString()))

    mockedFs.readFileSync.mockImplementation((path) => {
      const pathString = path.toString()
      if (pathString === OLD_TS) return OLD_CONTENT_TS
      if (pathString === OLD_PELELA) return OLD_CONTENT_PELELA
      return ''
    })

    await renameCommand({ oldName: 'Old', newName: 'New' })

    // Check content update
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(OLD_TS, NEW_CONTENT_TS)
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(OLD_PELELA, NEW_CONTENT_PELELA)

    // Check renaming
    expect(mockedFs.renameSync).toHaveBeenCalledWith(OLD_TS, NEW_TS)
    expect(mockedFs.renameSync).toHaveBeenCalledWith(OLD_PELELA, NEW_PELELA)
    expect(mockedFs.renameSync).toHaveBeenCalledWith(OLD_CSS, NEW_CSS)
  })

  it('creates new directory if it does not exist', async () => {
    const existing = ['src', OLD_TS]
    mockedFs.existsSync.mockImplementation((path) => existing.includes(path.toString()))

    await renameCommand({ oldName: 'Old', newName: 'new-dir/New' })

    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(NEW_DIR, {
      recursive: true,
    })
  })

  it('creates new directory for pelela file if it does not exist', async () => {
    const existing = ['src', OLD_PELELA]
    mockedFs.existsSync.mockImplementation((path) => existing.includes(path.toString()))

    await renameCommand({ oldName: 'Old', newName: 'new-dir/New' })

    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(NEW_DIR, {
      recursive: true,
    })
  })

  it('throws error when rename fails', async () => {
    const existing = ['src', OLD_TS]
    mockedFs.existsSync.mockImplementation((path) => existing.includes(path.toString()))
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('Read failed')
    })

    await expect(renameCommand({ oldName: 'Old', newName: 'New' })).rejects.toThrow(
      t('commands.rename.error.renameFailed', { error: 'Read failed' }),
    )
  })
})
