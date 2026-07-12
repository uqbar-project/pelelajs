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

  it('should publish and restore workspace:* dependency on success', () => {
    const mockedReadFileSync = vi.mocked(readFileSync)
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { pelelajs: 'workspace:*' } }),
    )
    const mockedWriteFileSync = vi.mocked(writeFileSync)

    publishVitePlugin('1.0.0')

    expect(mockedWriteFileSync).toHaveBeenCalledTimes(2)
    const firstCallContent = mockedWriteFileSync.mock.calls[0][1]
    const secondCallContent = mockedWriteFileSync.mock.calls[1][1]
    expect(firstCallContent).toContain('"1.0.0"')
    expect(secondCallContent).toContain('"workspace:*"')
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
    expect(JSON.parse(writtenContent).dependencies.pelelajs).toBe('workspace:*')
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
