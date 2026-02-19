import { describe, it, expect } from 'vitest'
import { createComponentViewModel } from './componentViewModel'

describe('componentViewModel', () => {
  describe('createComponentViewModel', () => {
    it('should provide access to component instance properties', () => {
      class ComponentVM {
        componentProp = 'component value'
      }

      const parentVM = { parentProp: 'parent value' }
      const instance = new ComponentVM()

      const extended = createComponentViewModel(instance, parentVM as any, {
        unidirectional: {},
        bidirectional: {},
      })

      expect(extended.componentProp).toBe('component value')
    })

    it('should provide access to parent viewmodel properties', () => {
      class ComponentVM {}

      const parentVM = { parentProp: 'parent value' }
      const instance = new ComponentVM()

      const extended = createComponentViewModel(instance, parentVM as any, {
        unidirectional: {},
        bidirectional: {},
      })

      expect(extended.parentProp).toBe('parent value')
    })

    it('should resolve unidirectional props as literals', () => {
      class ComponentVM {}

      const parentVM = { counter: 42 }
      const instance = new ComponentVM()

      const extended = createComponentViewModel(instance, parentVM as any, {
        unidirectional: { title: '"Hello World"', count: '10' },
        bidirectional: {},
      })

      expect(extended.title).toBe('Hello World')
      expect(extended.count).toBe(10)
    })

    it('should resolve unidirectional props from parent viewmodel', () => {
      class ComponentVM {}

      const parentVM = { userName: 'John Doe', userAge: 30 }
      const instance = new ComponentVM()

      const extended = createComponentViewModel(instance, parentVM as any, {
        unidirectional: { name: 'userName', age: 'userAge' },
        bidirectional: {},
      })

      expect(extended.name).toBe('John Doe')
      expect(extended.age).toBe(30)
    })

    it('should handle bidirectional props for reading', () => {
      class ComponentVM {}

      const parentVM = { counter: 42 }
      const instance = new ComponentVM()

      const extended = createComponentViewModel(instance, parentVM as any, {
        unidirectional: {},
        bidirectional: { value: 'counter' },
      })

      expect(extended.value).toBe(42)
    })

    it('should handle bidirectional props for writing', () => {
      class ComponentVM {}

      const parentVM = { counter: 42 }
      const instance = new ComponentVM()

      const extended = createComponentViewModel(instance, parentVM as any, {
        unidirectional: {},
        bidirectional: { value: 'counter' },
      })

      extended.value = 100

      expect(parentVM.counter).toBe(100)
      expect(extended.value).toBe(100)
    })

    it('should handle nested property paths in bidirectional props', () => {
      class ComponentVM {}

      const parentVM = { user: { profile: { name: 'John' } } }
      const instance = new ComponentVM()

      const extended = createComponentViewModel(instance, parentVM as any, {
        unidirectional: {},
        bidirectional: { userName: 'user.profile.name' },
      })

      expect(extended.userName).toBe('John')

      extended.userName = 'Jane'

      expect(parentVM.user.profile.name).toBe('Jane')
    })

    it('should prioritize component props over parent props', () => {
      class ComponentVM {
        sameName = 'component'
      }

      const parentVM = { sameName: 'parent' }
      const instance = new ComponentVM()

      const extended = createComponentViewModel(instance, parentVM as any, {
        unidirectional: {},
        bidirectional: {},
      })

      expect(extended.sameName).toBe('component')
    })

    it('should handle boolean literals', () => {
      class ComponentVM {}

      const parentVM = {}
      const instance = new ComponentVM()

      const extended = createComponentViewModel(instance, parentVM as any, {
        unidirectional: { isActive: 'true', isDisabled: 'false' },
        bidirectional: {},
      })

      expect(extended.isActive).toBe(true)
      expect(extended.isDisabled).toBe(false)
    })
  })
})

