import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initializeI18n } from '../commons/i18n'
import { ViewModelExportError } from '../errors/index'
import type { ViewModelConstructor } from '../types'
import {
  clearComponentRegistry,
  defineComponent,
  getComponentByTag,
  getComponentEntry,
  getComponentTag,
  getRegisteredTags,
} from './componentRegistry'
import { clearRegistry, getViewModel } from './viewModelRegistry'

class TodoList {
  items: string[] = []
  addItem(item: string) {
    this.items.push(item)
  }
}

class UserProfile {
  name = 'John'
  email = 'john@example.com'
}

describe('componentRegistry', () => {
  beforeEach(() => {
    clearRegistry()
    clearComponentRegistry()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('defineComponent', () => {
    it('should register the ViewModel in the viewModel registry', () => {
      defineComponent('TodoList', TodoList, '<pelela view-model="TodoList"></pelela>')

      expect(getViewModel('TodoList')).toBe(TodoList)
    })

    it('should throw a notAClass error when the creator is an object, not a class', () => {
      initializeI18n('es')
      const objectViewModel = { millas: 100 } as unknown as ViewModelConstructor
      const template = '<pelela view-model="conversorObj"></pelela>'

      expect(() => {
        defineComponent('conversorObj', objectViewModel, template)
      }).toThrow(ViewModelExportError)
      expect(() => {
        defineComponent('conversorObj', objectViewModel, template)
      }).toThrow(/No se puede definir un Object como view model/)
    })

    it('should throw a notAClass error when the creator is a regular function, not a class', () => {
      initializeI18n('es')
      function regularFunctionViewModel() {}
      const template = '<pelela view-model="regularFunction"></pelela>'

      expect(() => {
        defineComponent(
          'regularFunction',
          regularFunctionViewModel as unknown as ViewModelConstructor,
          template,
        )
      }).toThrow(ViewModelExportError)
      expect(() => {
        defineComponent(
          'regularFunction',
          regularFunctionViewModel as unknown as ViewModelConstructor,
          template,
        )
      }).toThrow(/No se puede definir un Function como view model/)
    })

    it('should throw a notAClass error when the creator is an arrow function, not a class', () => {
      initializeI18n('es')
      const arrowFunctionViewModel = () => {}
      const template = '<pelela view-model="arrowFunction"></pelela>'

      expect(() => {
        defineComponent(
          'arrowFunction',
          arrowFunctionViewModel as unknown as ViewModelConstructor,
          template,
        )
      }).toThrow(ViewModelExportError)
      expect(() => {
        defineComponent(
          'arrowFunction',
          arrowFunctionViewModel as unknown as ViewModelConstructor,
          template,
        )
      }).toThrow(/No se puede definir un Function como view model/)
    })

    it('should store the template for the component', () => {
      const template = '<pelela view-model="TodoList"><ul></ul></pelela>'
      defineComponent('TodoList', TodoList, template)

      const entry = getComponentEntry(TodoList)

      expect(entry).toBeDefined()
      expect(entry!.template).toBe(template)
      expect(entry!.name).toBe('TodoList')
    })

    it('should be idempotent when called with the same name and constructor', () => {
      const template = '<pelela view-model="TodoList"></pelela>'

      defineComponent('TodoList', TodoList, template)

      expect(() => {
        defineComponent('TodoList', TodoList, template)
      }).not.toThrow()
    })

    it('should NOT throw when registering a different constructor (HMR support)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      defineComponent('Shared', TodoList, '<pelela view-model="Shared"></pelela>')

      expect(() => {
        defineComponent('Shared', UserProfile, '<pelela view-model="Shared"></pelela>')
      }).not.toThrow()

      expect(getViewModel('Shared')).toBe(UserProfile)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[pelela] Component "Shared" re-evaluated'),
      )
    })

    it('should clean up old constructor mapping when replaced (HMR support)', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      defineComponent('Shared', TodoList, '<template1></template1>')
      defineComponent('Shared', UserProfile, '<template2></template2>')

      expect(getComponentEntry(TodoList)).toBeUndefined()
      expect(getComponentEntry(UserProfile)).toBeDefined()
    })

    it('should remove obsolete entries in componentsByTag when constructor is replaced', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      defineComponent('Shared', TodoList, '<template1></template1>')

      const entryBefore = getComponentByTag('shared')
      expect(entryBefore).toBeDefined()
      expect(entryBefore!.creator).toBe(TodoList)

      defineComponent('Shared', UserProfile, '<template2></template2>')

      const entryAfter = getComponentByTag('shared')
      expect(entryAfter).toBeDefined()
      expect(entryAfter!.creator).toBe(UserProfile)
      expect(entryAfter!.creator).not.toBe(TodoList)
    })

    it('should allow registering multiple components with different names', () => {
      defineComponent('TodoList', TodoList, '<pelela view-model="TodoList"></pelela>')
      defineComponent('UserProfile', UserProfile, '<pelela view-model="UserProfile"></pelela>')

      expect(getComponentEntry(TodoList)).toBeDefined()
      expect(getComponentEntry(UserProfile)).toBeDefined()
    })
  })

  describe('getComponentEntry', () => {
    it('should return the entry for a registered component', () => {
      const template = '<pelela view-model="TodoList"></pelela>'
      defineComponent('TodoList', TodoList, template)

      const entry = getComponentEntry(TodoList)

      expect(entry).toEqual({ name: 'TodoList', template })
    })

    it('should return undefined for an unregistered component', () => {
      expect(getComponentEntry(TodoList)).toBeUndefined()
    })
  })

  describe('getComponentByTag', () => {
    it('should return the entry for a registered component using kebab-case tag', () => {
      const template = '<pelela view-model="TodoList"></pelela>'
      defineComponent('TodoList', TodoList, template)

      const entry = getComponentByTag('todo-list')

      expect(entry).toBeDefined()
      expect(entry!.creator).toBe(TodoList)
      expect(entry!.entry).toEqual({ name: 'TodoList', template })
    })

    it('should return undefined for a non-existent component tag', () => {
      expect(getComponentByTag('non-existent')).toBeUndefined()
    })
  })

  describe('getComponentTag', () => {
    it('should return kebab-case tag for a registered component creator', () => {
      defineComponent('TodoList', TodoList, '<pelela view-model="TodoList"></pelela>')

      const tag = getComponentTag(TodoList)

      expect(tag).toBe('todo-list')
    })

    it('should return undefined for a non-registered component', () => {
      class NeverRegistered {}

      const tag = getComponentTag(NeverRegistered)

      expect(tag).toBeUndefined()
    })
  })

  describe('getRegisteredTags', () => {
    it('should return array with kebab-case tag of registered component', () => {
      defineComponent('TodoList', TodoList, '<pelela view-model="TodoList"></pelela>')

      const tags = getRegisteredTags()

      expect(tags).toContain('todo-list')
    })

    it('should return empty array when no components are registered', () => {
      const tags = getRegisteredTags()

      expect(tags).toEqual([])
    })
  })

  describe('clearComponentRegistry', () => {
    it('should remove all registered entries', () => {
      defineComponent('TodoList', TodoList, '<pelela view-model="TodoList"></pelela>')

      clearComponentRegistry()

      expect(getComponentEntry(TodoList)).toBeUndefined()
    })
  })
})
