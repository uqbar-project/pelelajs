import { describe, expect, it } from 'vitest'
import type { ForEachScopeInfo } from './forEachScope'
import { registerForEachScope, resolveHandlerOwner } from './forEachScope'

function registerItemScope(item: unknown): object {
  const scope = {}
  const info: ForEachScopeInfo = {
    parentViewModel: {},
    itemName: 'item',
    indexName: null,
    itemRef: { current: item },
    indexRef: { current: 0 },
  }
  registerForEachScope(scope, info)
  return scope
}

describe('resolveHandlerOwner', () => {
  it('resolves a single-level item handler to the item itself', () => {
    const item = { save: () => {} }
    const scope = registerItemScope(item)

    expect(resolveHandlerOwner(scope, 'item.save')).toEqual({ owner: item, memberName: 'save' })
  })

  it('returns null for an unsafe handler name', () => {
    const scope = registerItemScope({ save: () => {} })

    expect(resolveHandlerOwner(scope, '__proto__')).toBeNull()
  })

  it('returns null when a nested segment is unsafe', () => {
    const scope = registerItemScope({ link: { navigate: () => {} } })

    expect(resolveHandlerOwner(scope, 'item.__proto__.navigate')).toBeNull()
  })

  it('returns null for a single-level handler when the item is not an object', () => {
    const scope = registerItemScope(5)

    expect(resolveHandlerOwner(scope, 'item.toFixed')).toBeNull()
  })

  it('resolves a deeply nested handler to its owning object', () => {
    const link = { navigate: () => {} }
    const scope = registerItemScope({ link })

    const resolution = resolveHandlerOwner(scope, 'item.link.navigate')

    expect(resolution?.memberName).toBe('navigate')
    expect(resolution?.owner).toBe(link)
  })

  it('returns null when a nested chain breaks on a primitive', () => {
    const scope = registerItemScope({ link: 5 })

    expect(resolveHandlerOwner(scope, 'item.link.valueOf.navigate')).toBeNull()
  })

  it('returns null when a nested chain points at a missing key', () => {
    const scope = registerItemScope({})

    expect(resolveHandlerOwner(scope, 'item.link.navigate')).toBeNull()
  })
})
