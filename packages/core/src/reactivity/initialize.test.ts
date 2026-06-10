import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bootstrap } from '../bootstrap/bootstrap'
import { clearRegistry, registerViewModel } from '../registry/viewModelRegistry'

describe('ViewModel initialize()', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    clearRegistry()
    // Mock global fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should update DOM reactively when initialize() is async', async () => {
    // Mock a slow API response
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'pikachu' }),
      }),
    )

    class AsyncVM {
      pokemon = 'loading...'
      async initialize() {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon/25')
        const data = await response.json()
        this.pokemon = data.name
      }
    }

    document.body.innerHTML = `
      <pelela view-model="AsyncVM">
        <h1 bind-content="pokemon"></h1>
      </pelela>
    `

    registerViewModel('AsyncVM', AsyncVM)
    bootstrap()

    const h1 = document.querySelector('h1')!

    // Initial state before promise resolves
    expect(h1.innerHTML).toBe('loading...')

    // Wait for all microtasks (promises) to settle
    await vi.waitFor(() => {
      if (h1.innerHTML !== 'pikachu') throw new Error('Not yet updated')
    })

    expect(h1.innerHTML).toBe('pikachu')
  })
})
