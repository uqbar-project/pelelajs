import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { checkNewVersion } from '../../src/utils/version'
import { initializeI18n } from '../../src/utils/i18n'

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

    const result = await checkNewVersion()

    expect(result).toBeDefined()
    expect(result.hasUpdate).toBe(false)
    expect(result.latest).toBeNull()
  })

  it('returns safe state when NPM registry response is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
    )

    const result = await checkNewVersion()

    expect(result).toBeDefined()
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
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), { status: 200 }),
        ),
      ),
    )

    const result = await checkNewVersion()

    expect(result).toBeDefined()
    expect(result.hasUpdate).toBe(true)
    expect(result.latest).toBe('99.0.0')
  })

  it('returns safe state when dist-tags.latest is undefined', async () => {
    const mockResponse = {
      'dist-tags': {},
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), { status: 200 }),
        ),
      ),
    )

    const result = await checkNewVersion()

    expect(result).toBeDefined()
    expect(result.hasUpdate).toBe(false)
    expect(result.latest).toBeNull()
  })
})
