import * as fs from 'node:fs'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renameCommand } from '../../src/commands/rename'
import { initializeI18n, t } from '../../src/utils/i18n'

vi.mock('node:fs')
const mockedFs = vi.mocked(fs)

beforeAll(async () => {
  await initializeI18n('en')
})

afterEach(() => {
  vi.restoreAllMocks()
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
      t('commands.new.error.nameInvalid'),
    )
  })

  it('throws if old files do not exist', async () => {
    mockedFs.existsSync.mockReturnValue(false)
    await expect(renameCommand({ oldName: 'Old', newName: 'New' })).rejects.toThrow(
      t('commands.rename.error.oldNotFound', { name: 'Old' }),
    )
  })

  it('throws if new files already exist', async () => {
    mockedFs.existsSync.mockImplementation((path) => {
      const pathString = path.toString()
      return pathString.includes('Old') || pathString.includes('New')
    })
    await expect(renameCommand({ oldName: 'Old', newName: 'New' })).rejects.toThrow(
      t('commands.rename.error.newNameExists', { name: 'New' }),
    )
  })

  it('renames files and updates content successfully', async () => {
    const oldContentTs = 'export class Old extends ViewModel {}'
    const oldContentPelela = '<pelela view-model="Old"></pelela>'

    mockedFs.existsSync.mockImplementation((path) => {
      const pathString = path.toString()
      return (
        pathString === 'src' || pathString.includes('Old.ts') || pathString.includes('Old.pelela')
      )
    })

    mockedFs.readFileSync.mockImplementation((path) => {
      const pathString = path.toString()
      if (pathString.includes('Old.ts')) return oldContentTs
      if (pathString.includes('Old.pelela')) return oldContentPelela
      return ''
    })

    await renameCommand({ oldName: 'Old', newName: 'New' })

    // Check content update
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('Old.ts'),
      'export class New extends ViewModel {}',
    )
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('Old.pelela'),
      '<pelela view-model="New"></pelela>',
    )

    // Check renaming
    expect(mockedFs.renameSync).toHaveBeenCalledWith(
      expect.stringContaining('Old.ts'),
      expect.stringContaining('New.ts'),
    )
    expect(mockedFs.renameSync).toHaveBeenCalledWith(
      expect.stringContaining('Old.pelela'),
      expect.stringContaining('New.pelela'),
    )
  })

  it('creates new directory if it does not exist', async () => {
    mockedFs.existsSync.mockImplementation((path) => {
      const pathString = path.toString()
      return pathString === 'src' || pathString.includes('Old.ts')
    })

    await renameCommand({ oldName: 'Old', newName: 'new-dir/New' })

    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('new-dir'), {
      recursive: true,
    })
  })

  it('creates new directory for pelela file if it does not exist', async () => {
    mockedFs.existsSync.mockImplementation((path) => {
      const pathString = path.toString()
      return pathString === 'src' || pathString.includes('Old.pelela')
    })

    await renameCommand({ oldName: 'Old', newName: 'new-dir/New' })

    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('new-dir'), {
      recursive: true,
    })
  })

  it('throws error when rename fails', async () => {
    mockedFs.existsSync.mockImplementation((path) => path.toString().includes('Old.ts'))
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('Read failed')
    })

    await expect(renameCommand({ oldName: 'Old', newName: 'New' })).rejects.toThrow(
      t('commands.rename.error.renameFailed', { error: 'Read failed' }),
    )
  })
})
