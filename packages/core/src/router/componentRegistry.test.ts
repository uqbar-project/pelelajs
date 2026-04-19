import { beforeEach, describe, expect, it } from 'vitest'
import { ViewModelRegistrationError } from '../errors/index'
import { clearRegistry, getViewModel } from '../registry/viewModelRegistry'
import {
  clearComponentRegistry,
  defineComponent,
  getComponentEntry,
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

    it('should throw when registering a different constructor under the same name', () => {
      defineComponent('Shared', TodoList, '<pelela view-model="Shared"></pelela>')

      expect(() => {
        defineComponent('Shared', UserProfile, '<pelela view-model="Shared"></pelela>')
      }).toThrow(ViewModelRegistrationError)
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
})
