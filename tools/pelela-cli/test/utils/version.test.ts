import { join } from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { initializeI18n } from '../../src/utils/i18n'
import { checkNewVersion, versionUtils } from '../../src/utils/version'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
  }
})

beforeAll(async () => {
  await initializeI18n('en')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('checkNewVersion', () => {
  it('returns safe state when network fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error'))),
    )

    vi.spyOn(versionUtils, 'getLocalVersion').mockResolvedValue('1.0.0')

    const result = await checkNewVersion()

    expect(result).toBeDefined()
    expect(result.current).toBe('1.0.0')
    expect(result.hasUpdate).toBe(false)
    expect(result.latest).toBeNull()
  })

  it('returns safe state when fetch times out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        const error = new Error('The operation was aborted')
        error.name = 'AbortError'
        return Promise.reject(error)
      }),
    )
    vi.spyOn(versionUtils, 'getLocalVersion').mockResolvedValue('1.0.0')

    const result = await checkNewVersion()

    expect(result).toBeDefined()
    expect(result.current).toBe('1.0.0')
    expect(result.hasUpdate).toBe(false)
    expect(result.latest).toBeNull()
  })

  it('returns safe state when NPM registry response is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
    )
    vi.spyOn(versionUtils, 'getLocalVersion').mockResolvedValue('1.0.0')

    const result = await checkNewVersion()

    expect(result).toBeDefined()
    expect(result.current).toBe('1.0.0')
    expect(result.hasUpdate).toBe(false)
    expect(result.latest).toBeNull()
  })

  it('detects new version when NPM registry returns higher version', async () => {
    const mockResponse = {
      'dist-tags': {
        latest: '99.0.0',
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))),
    )
    vi.spyOn(versionUtils, 'getLocalVersion').mockResolvedValue('1.0.0')

    const result = await checkNewVersion()

    expect(result).toBeDefined()
    expect(result.current).toBe('1.0.0')
    expect(result.hasUpdate).toBe(true)
    expect(result.latest).toBe('99.0.0')
  })

  it('returns safe state when dist-tags.latest is undefined', async () => {
    const mockResponse = {
      'dist-tags': {},
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))),
    )
    vi.spyOn(versionUtils, 'getLocalVersion').mockResolvedValue('1.0.0')

    const result = await checkNewVersion()

    expect(result).toBeDefined()
    expect(result.current).toBe('1.0.0')
    expect(result.hasUpdate).toBe(false)
    expect(result.latest).toBeNull()
  })

  it('returns no update when latest equals current version', async () => {
    const mockResponse = {
      'dist-tags': {
        latest: '1.0.0',
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))),
    )
    vi.spyOn(versionUtils, 'getLocalVersion').mockResolvedValue('1.0.0')

    const result = await checkNewVersion()

    expect(result.current).toBe('1.0.0')
    expect(result.latest).toBe('1.0.0')
    expect(result.hasUpdate).toBe(false)
  })

  it('returns no update when latest is less than current version', async () => {
    const mockResponse = {
      'dist-tags': {
        latest: '0.9.0',
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))),
    )
    vi.spyOn(versionUtils, 'getLocalVersion').mockResolvedValue('1.0.0')

    const result = await checkNewVersion()

    expect(result.current).toBe('1.0.0')
    expect(result.latest).toBe('0.9.0')
    expect(result.hasUpdate).toBe(false)
  })

  it('returns safe state for non-200 response (404)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('Not found', { status: 404 }))),
    )
    vi.spyOn(versionUtils, 'getLocalVersion').mockResolvedValue('1.0.0')

    const result = await checkNewVersion()

    expect(result.current).toBe('1.0.0')
    expect(result.hasUpdate).toBe(false)
    expect(result.latest).toBeNull()
  })

  it('handles null dist-tags.latest', async () => {
    const mockResponse = {
      'dist-tags': {
        latest: null,
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))),
    )
    vi.spyOn(versionUtils, 'getLocalVersion').mockResolvedValue('1.0.0')

    const result = await checkNewVersion()

    expect(result.current).toBe('1.0.0')
    expect(result.hasUpdate).toBe(false)
    expect(result.latest).toBeNull()
  })

  it('handles invalid semver in dist-tags.latest', async () => {
    const mockResponse = {
      'dist-tags': {
        latest: 'invalid-version-string',
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))),
    )
    vi.spyOn(versionUtils, 'getLocalVersion').mockResolvedValue('1.0.0')

    const result = await checkNewVersion()

    expect(result.current).toBe('1.0.0')
    expect(result.latest).toBe('invalid-version-string')
    expect(result.hasUpdate).toBe(false)
  })
})

describe('getCliVersion', () => {
  it('returns version from package.json if found', async () => {
    const { getCliVersion } = await import('../../src/utils/version')
    const version = getCliVersion()
    expect(version).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('handles deep recursive search', async () => {
    const fs = await import('node:fs')
    const { getCliVersion } = await import('../../src/utils/version')

    // Mock implementation to test recursion depth by inspecting the path
    const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation((path: unknown) => {
      const pathStr = String(path)
      // Simulate that package.json is missing in intermediate directories (src/utils, src)
      // to force the recursive search to move up the directory tree.
      if (
        pathStr.endsWith(join('src', 'utils', 'package.json')) ||
        pathStr.endsWith(join('src', 'package.json'))
      ) {
        throw new Error('ENOENT: no such file or directory')
      }
      // Return valid version for the first package.json found outside src
      if (pathStr.endsWith('package.json')) {
        return JSON.stringify({ name: 'pelelajs', version: '1.2.3' })
      }
      throw new Error('ENOENT: no such file or directory')
    })

    const version = getCliVersion()
    expect(version).toBe('1.2.3')
    expect(readSpy).toHaveBeenCalled()
    // Verify that it actually recursed (called at least twice)
    expect(readSpy.mock.calls.length).toBeGreaterThan(1)
    readSpy.mockRestore()
  })

  it('stops at the first supported package when it finds pelelajs', async () => {
    const fs = await import('node:fs')
    const { getCliVersion } = await import('../../src/utils/version')

    let calls = 0
    const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      calls++
      // First call: unrecognized package, should continue
      if (calls === 1) return JSON.stringify({ name: 'my-app', version: '1.0.0' })
      // Second call: recognized package, should stop
      return JSON.stringify({ name: 'pelelajs', version: '0.5.12' })
    })

    const version = getCliVersion()
    expect(version).toBe('0.5.12')
    expect(calls).toBe(2)
    readSpy.mockRestore()
  })

  it('keeps supporting the standalone CLI package as a fallback source', async () => {
    const fs = await import('node:fs')
    const { getCliVersion } = await import('../../src/utils/version')

    const readSpy = vi
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => JSON.stringify({ name: '@pelelajs/cli', version: '0.5.12' }))

    const version = getCliVersion()
    expect(version).toBe('0.5.12')
    readSpy.mockRestore()
  })

  it('ignores vite-plugin-pelelajs as a CLI version source', async () => {
    const fs = await import('node:fs')
    const { getCliVersion } = await import('../../src/utils/version')

    let calls = 0
    const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      calls++
      if (calls === 1) {
        return JSON.stringify({ name: 'vite-plugin-pelelajs', version: '9.9.9' })
      }
      return JSON.stringify({ name: 'pelelajs', version: '0.5.12' })
    })

    const version = getCliVersion()
    expect(version).toBe('0.5.12')
    expect(calls).toBe(2)
    readSpy.mockRestore()
  })

  it('returns 0.0.0 if package.json is not found after max depth', async () => {
    const fs = await import('node:fs')
    const { getCliVersion } = await import('../../src/utils/version')

    const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('Not found')
    })

    const version = getCliVersion()
    expect(version).toBe('0.0.0')
    readSpy.mockRestore()
  })
})

describe('getLocalVersion', () => {
  it('delegates to getCliVersion and returns the same value as a Promise', async () => {
    const { getLocalVersion, getCliVersion } = await import('../../src/utils/version')
    const syncVersion = getCliVersion()
    const asyncVersion = await getLocalVersion()

    expect(asyncVersion).toBe(syncVersion)
  })
})
