import { beforeEach, describe, expect, it } from 'vitest'
import {
  ComponentHierarchyTracker,
  getGlobalComponentTracker,
  resetGlobalComponentTracker,
} from './nestedComponents'
import { CircularComponentError } from '../errors/index'

describe('nestedComponents', () => {
  describe('ComponentHierarchyTracker', () => {
    let tracker: ComponentHierarchyTracker

    beforeEach(() => {
      tracker = new ComponentHierarchyTracker()
    })

    it('should track component entry and exit', () => {
      expect(tracker.getCurrentDepth()).toBe(0)

      tracker.enterComponent('ComponentA')
      expect(tracker.getCurrentDepth()).toBe(1)

      tracker.enterComponent('ComponentB')
      expect(tracker.getCurrentDepth()).toBe(2)

      tracker.exitComponent()
      expect(tracker.getCurrentDepth()).toBe(1)

      tracker.exitComponent()
      expect(tracker.getCurrentDepth()).toBe(0)
    })

    it('should detect circular dependencies', () => {
      tracker.enterComponent('ComponentA')
      tracker.enterComponent('ComponentB')

      expect(() => tracker.enterComponent('ComponentA')).toThrow(CircularComponentError)
    })

    it('should provide component chain', () => {
      tracker.enterComponent('ComponentA')
      tracker.enterComponent('ComponentB')
      tracker.enterComponent('ComponentC')

      const chain = tracker.getComponentChain()
      expect(chain).toEqual(['ComponentA', 'ComponentB', 'ComponentC'])
    })

    it('should check if component is in hierarchy', () => {
      tracker.enterComponent('ComponentA')
      tracker.enterComponent('ComponentB')

      expect(tracker.isInHierarchy('ComponentA')).toBe(true)
      expect(tracker.isInHierarchy('ComponentB')).toBe(true)
      expect(tracker.isInHierarchy('ComponentC')).toBe(false)
    })

    it('should allow same component at different levels after exit', () => {
      tracker.enterComponent('ComponentA')
      tracker.enterComponent('ComponentB')
      tracker.exitComponent()
      tracker.exitComponent()

      expect(() => tracker.enterComponent('ComponentA')).not.toThrow()
    })
  })

  describe('globalComponentTracker', () => {
    beforeEach(() => {
      resetGlobalComponentTracker()
    })

    it('should maintain global state', () => {
      const tracker1 = getGlobalComponentTracker()
      const tracker2 = getGlobalComponentTracker()

      expect(tracker1).toBe(tracker2)

      tracker1.enterComponent('ComponentA')
      expect(tracker2.getCurrentDepth()).toBe(1)
    })

    it('should reset global tracker', () => {
      const tracker = getGlobalComponentTracker()

      tracker.enterComponent('ComponentA')
      tracker.enterComponent('ComponentB')
      expect(tracker.getCurrentDepth()).toBe(2)

      resetGlobalComponentTracker()
      expect(tracker.getCurrentDepth()).toBe(0)
    })
  })
})

