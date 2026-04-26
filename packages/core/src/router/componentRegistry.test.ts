import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearRegistry, getViewModel } from '../registry/viewModelRegistry'
import {
  autoRegisterComponent,
  clearComponentRegistry,
  defineComponent,
  getComponentEntry,
  inferComponentName,
} from './componentRegistry'

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

  describe('defineComponent', () => {
    it('should register the ViewModel in the viewModel registry', () => {
      defineComponent('TodoList', TodoList, '<pelela view-model="TodoList"></pelela>')

      expect(getViewModel('TodoList')).toBe(TodoList)
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
      warnSpy.mockRestore()
    })

    it('should clean up old constructor mapping when replaced (HMR support)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      defineComponent('Shared', TodoList, '<template1></template1>')
      defineComponent('Shared', UserProfile, '<template2></template2>')

      expect(getComponentEntry(TodoList)).toBeUndefined()
      expect(getComponentEntry(UserProfile)).toBeDefined()
      warnSpy.mockRestore()
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

  describe('clearComponentRegistry', () => {
    it('should remove all registered entries', () => {
      defineComponent('TodoList', TodoList, '<pelela view-model="TodoList"></pelela>')

      clearComponentRegistry()

      expect(getComponentEntry(TodoList)).toBeUndefined()
    })
  })

  describe('inferComponentName', () => {
    it('should convert simple camelCase to kebab-case', () => {
      class Home {}
      expect(inferComponentName(Home)).toBe('home')
    })

    it('should convert multi-word camelCase to kebab-case', () => {
      class ShoppingCart {}
      expect(inferComponentName(ShoppingCart)).toBe('shopping-cart')
    })

    it('should handle acronyms correctly', () => {
      class XMLParser {}
      expect(inferComponentName(XMLParser)).toBe('xml-parser')
    })

    it('should handle numbers correctly', () => {
      class User2Profile {}
      expect(inferComponentName(User2Profile)).toBe('user2-profile')
    })

    it('should handle consecutive uppercase letters', () => {
      class HTTPRequest {}
      expect(inferComponentName(HTTPRequest)).toBe('http-request')
    })
  })

  describe('autoRegisterComponent', () => {
    it('should register component with inferred name', () => {
      const template = '<pelela view-model="TodoList"></pelela>'
      autoRegisterComponent(TodoList, template)

      expect(getViewModel('todo-list')).toBe(TodoList)
      const entry = getComponentEntry(TodoList)
      expect(entry).toBeDefined()
      expect(entry!.name).toBe('todo-list')
      expect(entry!.template).toBe(template)
    })

    it('should use kebab-case for multi-word class names', () => {
      const template = '<pelela view-model="UserProfile"></pelela>'
      autoRegisterComponent(UserProfile, template)

      expect(getViewModel('user-profile')).toBe(UserProfile)
    })
  })
})
