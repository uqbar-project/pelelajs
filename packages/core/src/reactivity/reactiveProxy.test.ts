import { describe, expect, it, vi } from 'vitest'
import { createReactiveViewModel } from './reactiveProxy'

describe('reactiveProxy', () => {
  describe('createReactiveViewModel', () => {
    it('should create a reactive proxy of the object', () => {
      const target = { count: 0 }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      expect(proxy.count).toBe(0)
      expect(onChange).not.toHaveBeenCalled()
    })

    it('should call onChange when a property is modified', () => {
      const target = { count: 0 }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.count = 5

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(proxy.count).toBe(5)
    })

    it('should call onChange multiple times for multiple changes', () => {
      const target = { count: 0, name: '' }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.count = 1
      proxy.count = 2
      proxy.name = 'test'

      expect(onChange).toHaveBeenCalledTimes(3)
    })

    it('should allow adding new properties', () => {
      const target: any = { count: 0 }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.newProp = 'new'

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(proxy.newProp).toBe('new')
    })

    it('should handle nested objects', () => {
      const target = { user: { name: 'John', age: 30 } }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.user = { name: 'Jane', age: 25 }

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(proxy.user.name).toBe('Jane')
    })

    it('should preserve the type of assigned value', () => {
      const target = { count: 0, flag: false, text: '' }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.count = 42
      proxy.flag = true
      proxy.text = 'hello'

      expect(typeof proxy.count).toBe('number')
      expect(typeof proxy.flag).toBe('boolean')
      expect(typeof proxy.text).toBe('string')
    })

    it('should detect changes in nested object properties', () => {
      const target = { user: { name: 'John', age: 30 } }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.user.name = 'Jane'

      expect(onChange).toHaveBeenCalled()
      expect(proxy.user.name).toBe('Jane')
    })

    it('should detect changes in deeply nested objects', () => {
      const target = {
        data: {
          nested: {
            deep: {
              value: 42,
            },
          },
        },
      }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.data.nested.deep.value = 100

      expect(onChange).toHaveBeenCalled()
      expect(proxy.data.nested.deep.value).toBe(100)
    })

    it('should detect array index assignments', () => {
      const target = { items: ['a', 'b', 'c'] }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.items[0] = 'x'

      expect(onChange).toHaveBeenCalled()
      expect(proxy.items[0]).toBe('x')
    })

    it('should detect array method mutations', () => {
      const target = { items: [1, 2, 3] }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.items.push(4)

      expect(onChange).toHaveBeenCalled()
      expect(proxy.items).toHaveLength(4)
      expect(proxy.items[3]).toBe(4)
    })

    it('should detect changes in objects inside arrays', () => {
      const target = {
        users: [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 },
        ],
      }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.users[0].name = 'Alicia'

      expect(onChange).toHaveBeenCalled()
      expect(proxy.users[0].name).toBe('Alicia')
    })

    it('should detect nested array mutations', () => {
      const target = {
        user: {
          tags: ['tag1', 'tag2'],
        },
      }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.user.tags.push('tag3')

      expect(onChange).toHaveBeenCalled()
      expect(proxy.user.tags).toHaveLength(3)
    })

    it('should detect nested array index assignments', () => {
      const target = {
        user: {
          tags: ['tag1', 'tag2'],
        },
      }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.user.tags[0] = 'newTag'

      expect(onChange).toHaveBeenCalled()
      expect(proxy.user.tags[0]).toBe('newTag')
    })

    it('should not call onChange if value is the same', () => {
      const target = { count: 5 }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.count = 5

      expect(onChange).not.toHaveBeenCalled()
    })

    it('should handle array splice correctly', () => {
      const target = { items: [1, 2, 3, 4] }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.items.splice(1, 2)

      expect(onChange).toHaveBeenCalled()
      expect(proxy.items).toEqual([1, 4])
    })

    it('should handle array sort correctly', () => {
      const target = { items: [3, 1, 2] }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.items.sort()

      expect(onChange).toHaveBeenCalled()
      expect(proxy.items).toEqual([1, 2, 3])
    })

    it('should handle array reverse correctly', () => {
      const target = { items: [1, 2, 3] }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.items.reverse()

      expect(onChange).toHaveBeenCalled()
      expect(proxy.items).toEqual([3, 2, 1])
    })

    it('should handle property deletion', () => {
      const target: any = { a: 1, b: 2 }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      delete proxy.b

      expect(onChange).toHaveBeenCalled()
      expect(proxy.b).toBeUndefined()
      expect('b' in proxy).toBe(false)
    })

    it('should handle circular references without stack overflow', () => {
      const target: any = { name: 'root' }
      target.self = target

      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      expect(proxy.name).toBe('root')
      expect(proxy.self).toBeDefined()

      proxy.name = 'changed'
      expect(onChange).toHaveBeenCalled()
    })

    it('should make objects added via push reactive', () => {
      const target = { items: [] as Array<{ value: number }> }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.items.push({ value: 1 })
      onChange.mockClear()

      proxy.items[0].value = 2

      expect(onChange).toHaveBeenCalled()
      expect(proxy.items[0].value).toBe(2)
    })

    it('should handle $set helper method', () => {
      const target: any = { items: ['a', 'b', 'c'] }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.$set(proxy.items, 1, 'x')

      expect(onChange).toHaveBeenCalled()
      expect(proxy.items[1]).toBe('x')
    })

    it('should handle $delete helper method', () => {
      const target: any = { a: 1, b: 2 }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.$delete(proxy, 'b')

      expect(onChange).toHaveBeenCalled()
      expect(proxy.b).toBeUndefined()
      expect('b' in proxy).toBe(false)
    })

    it('should handle $raw to access original object', () => {
      const target = { count: 0 }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      const raw = proxy.$raw

      expect(raw).toBe(target)
    })

    it('should not trigger onChange when modifying $raw', () => {
      const target = { count: 0 }
      const onChange = vi.fn()
      const proxy = createReactiveViewModel(target, onChange)

      proxy.$raw.count = 5

      expect(onChange).not.toHaveBeenCalled()
      expect(target.count).toBe(5)
    })
  })
})
