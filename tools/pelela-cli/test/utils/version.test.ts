import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { initializeI18n } from '../../src/utils/i18n'
import { checkNewVersion } from '../../src/utils/version'

beforeAll(async () => {
  await initializeI18n('en')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('checkNewVersion', () => {
  it('returns safe state when network fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error'))),
    )

    vi.spyOn(await import('../../src/utils/version'), 'getLocalVersion').mockResolvedValue('1.0.0')

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
    vi.spyOn(await import('../../src/utils/version'), 'getLocalVersion').mockResolvedValue('1.0.0')

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
    vi.spyOn(await import('../../src/utils/version'), 'getLocalVersion').mockResolvedValue('1.0.0')

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
    vi.spyOn(await import('../../src/utils/version'), 'getLocalVersion').mockResolvedValue('1.0.0')

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
    vi.spyOn(await import('../../src/utils/version'), 'getLocalVersion').mockResolvedValue('1.0.0')

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
    vi.spyOn(await import('../../src/utils/version'), 'getLocalVersion').mockResolvedValue('1.0.0')

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
    vi.spyOn(await import('../../src/utils/version'), 'getLocalVersion').mockResolvedValue('1.0.0')

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
    vi.spyOn(await import('../../src/utils/version'), 'getLocalVersion').mockResolvedValue('1.0.0')

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
    vi.spyOn(await import('../../src/utils/version'), 'getLocalVersion').mockResolvedValue('1.0.0')

    const result = await checkNewVersion()

    expect(result.current).toBe('1.0.0')
    expect(result.latest).toBeNull()
    expect(result.hasUpdate).toBe(false)
  })
})
