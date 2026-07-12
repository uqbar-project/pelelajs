import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { publishVitePlugin } from '../scripts/publish-vite-plugin'

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}))

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

describe('publishVitePlugin', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should restore workspace:* dependency in finally when publish fails', () => {
    const mockedExecSync = vi.mocked(execSync)
    mockedExecSync.mockImplementation(() => {
      throw new Error('publish failed')
    })

    const mockedReadFileSync = vi.mocked(readFileSync)
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { pelelajs: 'workspace:*' } }),
    )
    const mockedWriteFileSync = vi.mocked(writeFileSync)

    expect(() => publishVitePlugin('1.0.0')).toThrow('publish failed')

    const lastWriteCall = mockedWriteFileSync.mock.lastCall
    expect(lastWriteCall).toBeDefined()
    const [, writtenContent] = lastWriteCall as [string, string]
    expect(writtenContent).toContain('"workspace:*"')
  })

  it('should not modify package.json when dependency is not workspace:*', () => {
    const mockedExecSync = vi.mocked(execSync)
    mockedExecSync.mockImplementation(() => {
      throw new Error('publish failed')
    })

    const mockedReadFileSync = vi.mocked(readFileSync)
    mockedReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { pelelajs: '1.0.0' } }))
    const mockedWriteFileSync = vi.mocked(writeFileSync)

    expect(() => publishVitePlugin('1.0.0')).toThrow('publish failed')

    expect(mockedWriteFileSync).not.toHaveBeenCalled()
  })
})
