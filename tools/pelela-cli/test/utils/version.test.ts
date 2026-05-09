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

    // Mock implementation for this specific test
    const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      if (typeof path === 'string' && path.includes('deep/path/package.json')) {
        throw new Error('Not found')
      }
      return JSON.stringify({ name: 'pelelajs', version: '1.2.3' })
    })

    const version = getCliVersion()
    expect(version).toBeDefined()
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
