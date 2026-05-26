import { describe, expect, it } from 'vitest'
import { DependencyTracker } from './dependencyTracker'
import type { BindingsCollection, ComponentBinding } from './types'

describe('DependencyTracker', () => {
  describe('registerDependency', () => {
    it('should register a dependency for a binding', () => {
      const tracker = new DependencyTracker()
      const binding = {
        element: document.createElement('div'),
        propertyName: 'users',
      }

      tracker.registerDependency(binding, 'users')

      const bindings: BindingsCollection = {
        valueBindings: [binding],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [],
        componentBindings: [],
      }

      const affected = tracker.getDependentBindings('users', bindings)
      expect(affected.valueBindings).toContain(binding)
    })

    it('should register multiple dependencies for same binding', () => {
      const tracker = new DependencyTracker()
      const binding = {
        element: document.createElement('div'),
        propertyName: 'user.name',
      }

      tracker.registerDependency(binding, 'user')
      tracker.registerDependency(binding, 'user.name')

      const bindings: BindingsCollection = {
        valueBindings: [binding],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [],
        componentBindings: [],
      }

      const affectedByUser = tracker.getDependentBindings('user', bindings)
      const affectedByName = tracker.getDependentBindings('user.name', bindings)

      expect(affectedByUser.valueBindings).toContain(binding)
      expect(affectedByName.valueBindings).toContain(binding)
    })
  })

  describe('getDependentBindings', () => {
    it('should return bindings with exact path match', () => {
      const tracker = new DependencyTracker()
      const binding1 = {
        element: document.createElement('div'),
        propertyName: 'users',
        isInput: false,
      }
      const binding2 = {
        element: document.createElement('div'),
        propertyName: 'items',
      }

      tracker.registerDependency(binding1, 'users')
      tracker.registerDependency(binding2, 'items')

      const bindings: BindingsCollection = {
        valueBindings: [binding1, binding2],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [],
        componentBindings: [],
      }

      const affected = tracker.getDependentBindings('users', bindings)

      expect(affected.valueBindings).toContain(binding1)
      expect(affected.valueBindings).not.toContain(binding2)
    })

    it('should return bindings when first part of path matches', () => {
      const tracker = new DependencyTracker()
      const binding = {
        element: document.createElement('div'),
        propertyName: 'users',
      }

      tracker.registerDependency(binding, 'users')

      const bindings: BindingsCollection = {
        valueBindings: [binding],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [],
        componentBindings: [],
      }

      const affected = tracker.getDependentBindings('users.0.name', bindings)
      expect(affected.valueBindings).toContain(binding)
    })

    it('should return bindings when changed path is parent of binding path', () => {
      const tracker = new DependencyTracker()
      const binding = {
        element: document.createElement('div'),
        propertyName: 'users.0.name',
        isInput: false,
      }

      tracker.registerDependency(binding, 'users.0.name')

      const bindings: BindingsCollection = {
        valueBindings: [binding],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [],
        componentBindings: [],
      }

      const affected = tracker.getDependentBindings('users', bindings)
      expect(affected.valueBindings).toContain(binding)
    })

    it('should not return bindings for unrelated paths', () => {
      const tracker = new DependencyTracker()
      const binding1 = {
        element: document.createElement('div'),
        propertyName: 'users',
        isInput: false,
      }
      const binding2 = {
        element: document.createElement('div'),
        propertyName: 'items',
      }

      tracker.registerDependency(binding1, 'users')
      tracker.registerDependency(binding2, 'items')

      const bindings: BindingsCollection = {
        valueBindings: [binding1, binding2],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [],
        componentBindings: [],
      }

      const affected = tracker.getDependentBindings('newUserName', bindings)
      expect(affected.valueBindings).not.toContain(binding1)
      expect(affected.valueBindings).not.toContain(binding2)
    })

    it('should work with multiple binding types', () => {
      const tracker = new DependencyTracker()
      const valueBinding = {
        element: document.createElement('div'),
        propertyName: 'message',
      }
      const ifBinding = {
        element: document.createElement('div'),
        propertyName: 'show',
        originalDisplay: '',
      }
      const classBinding = {
        element: document.createElement('div'),
        propertyName: 'classes',
        staticClassName: '',
      }

      tracker.registerDependency(valueBinding, 'message')
      tracker.registerDependency(ifBinding, 'show')
      tracker.registerDependency(classBinding, 'classes')

      const bindings: BindingsCollection = {
        valueBindings: [valueBinding],
        contentBindings: [],
        ifBindings: [ifBinding],
        classBindings: [classBinding],
        styleBindings: [],
        forEachBindings: [],
        componentBindings: [],
      }

      const affectedByMessage = tracker.getDependentBindings('message', bindings)
      expect(affectedByMessage.valueBindings).toContain(valueBinding)
      expect(affectedByMessage.ifBindings).not.toContain(ifBinding)
      expect(affectedByMessage.classBindings).not.toContain(classBinding)

      const affectedByShow = tracker.getDependentBindings('show', bindings)
      expect(affectedByShow.valueBindings).not.toContain(valueBinding)
      expect(affectedByShow.ifBindings).toContain(ifBinding)
      expect(affectedByShow.classBindings).not.toContain(classBinding)
    })

    it('should handle for-each bindings', () => {
      const tracker = new DependencyTracker()
      const forEachBinding = {
        collectionName: 'users',
        itemName: 'user',
        indexName: null,
        template: document.createElement('div'),
        placeholder: document.createComment(''),
        renderedElements: [],
        previousLength: 0,
        extraDependencies: [],
      }

      tracker.registerDependency(forEachBinding, 'users')

      const bindings: BindingsCollection = {
        valueBindings: [],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [forEachBinding],
        componentBindings: [],
      }

      const affected = tracker.getDependentBindings('users', bindings)
      expect(affected.forEachBindings).toContain(forEachBinding)
    })
  })

  describe('path matching logic', () => {
    it('should match when binding path starts with changed path', () => {
      const tracker = new DependencyTracker()
      const binding = {
        element: document.createElement('div'),
        propertyName: 'user.profile.name',
      }

      tracker.registerDependency(binding, 'user.profile.name')

      const bindings: BindingsCollection = {
        valueBindings: [binding],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [],
        componentBindings: [],
      }

      const affectedByUser = tracker.getDependentBindings('user', bindings)
      const affectedByProfile = tracker.getDependentBindings('user.profile', bindings)
      const affectedByName = tracker.getDependentBindings('user.profile.name', bindings)

      expect(affectedByUser.valueBindings).toContain(binding)
      expect(affectedByProfile.valueBindings).toContain(binding)
      expect(affectedByName.valueBindings).toContain(binding)
    })

    it('should match when changed path starts with binding path', () => {
      const tracker = new DependencyTracker()
      const binding = {
        element: document.createElement('div'),
        propertyName: 'user',
      }

      tracker.registerDependency(binding, 'user')

      const bindings: BindingsCollection = {
        valueBindings: [binding],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [],
        componentBindings: [],
      }

      const affectedByName = tracker.getDependentBindings('user.name', bindings)
      const affectedByEmail = tracker.getDependentBindings('user.email', bindings)

      expect(affectedByName.valueBindings).toContain(binding)
      expect(affectedByEmail.valueBindings).toContain(binding)
    })

    it('should NOT match unrelated nested properties with same root', () => {
      const tracker = new DependencyTracker()

      const binding1 = {
        element: document.createElement('div'),
        propertyName: 'prueba.nombre',
      }
      const binding2 = {
        element: document.createElement('span'),
        propertyName: 'prueba.direccion.calle.nombre',
      }

      tracker.registerDependency(binding1, 'prueba.nombre')
      tracker.registerDependency(binding2, 'prueba.direccion.calle.nombre')

      const bindings: BindingsCollection = {
        valueBindings: [binding1, binding2],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [],
        componentBindings: [],
      }

      // Cambio en prueba.nombre → solo debe afectar binding1
      const affectedByNombre = tracker.getDependentBindings('prueba.nombre', bindings)
      expect(affectedByNombre.valueBindings).toContain(binding1)
      expect(affectedByNombre.valueBindings).not.toContain(binding2)

      // Cambio en prueba.direccion.calle.nombre → solo debe afectar binding2
      const affectedByCalleNombre = tracker.getDependentBindings(
        'prueba.direccion.calle.nombre',
        bindings,
      )
      expect(affectedByCalleNombre.valueBindings).not.toContain(binding1)
      expect(affectedByCalleNombre.valueBindings).toContain(binding2)

      // Cambio en prueba → debe afectar ambos (el padre cambió)
      const affectedByPrueba = tracker.getDependentBindings('prueba', bindings)
      expect(affectedByPrueba.valueBindings).toContain(binding1)
      expect(affectedByPrueba.valueBindings).toContain(binding2)
    })
  })

  describe('getDependentBindingsWithGetterSupport', () => {
    it('should include getter bindings for forEachBindings when a primitive property changes', () => {
      const tracker = new DependencyTracker()

      class ViewModel {
        selectedIndex = 0
        get selectedPersonName(): string {
          return this.selectedIndex === 0 ? 'Alice' : 'Bob'
        }
      }

      const viewModel = new ViewModel()
      const forEachBinding = {
        collectionName: 'people',
        itemName: 'person',
        indexName: null,
        template: document.createElement('div'),
        placeholder: document.createComment(''),
        renderedElements: [],
        previousLength: 0,
        extraDependencies: ['selectedPersonName'],
      }

      tracker.registerDependency(forEachBinding, 'people', viewModel)
      tracker.markAsGetterBinding(forEachBinding)

      const bindings: BindingsCollection = {
        valueBindings: [],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [forEachBinding],
        componentBindings: [],
      }

      // Change in primitive property should trigger getter binding
      const affected = tracker.getDependentBindingsWithGetterSupport('selectedIndex', bindings)
      expect(affected.forEachBindings).toContain(forEachBinding)
    })

    it('should include getter-marked componentBindings when a dependency of the getter changes', () => {
      const tracker = new DependencyTracker()

      class ViewModel {
        selectedIndex = 0
        get selectedPersonName(): string {
          return this.selectedIndex === 0 ? 'Alice' : 'Bob'
        }
      }

      const viewModel = new ViewModel()
      const componentBinding = {
        childViewModel: viewModel as unknown as ComponentBinding['childViewModel'],
        mappings: [{ parentKey: 'selectedPersonName', childKey: 'name' }],
      }

      tracker.registerDependency(componentBinding, 'selectedPersonName', viewModel)

      const bindings: BindingsCollection = {
        valueBindings: [],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [],
        componentBindings: [componentBinding],
      }

      const affected = tracker.getDependentBindingsWithGetterSupport('selectedIndex', bindings)
      expect(affected.componentBindings).toContain(componentBinding)
    })

    it('should include getter bindings for valueBindings when a primitive property changes', () => {
      const tracker = new DependencyTracker()

      class ViewModel {
        selectedIndex = 0
        get selectedPersonName(): string {
          return this.selectedIndex === 0 ? 'Alice' : 'Bob'
        }
      }

      const viewModel = new ViewModel()
      const valueBinding = {
        element: document.createElement('input'),
        propertyName: 'selectedPersonName',
      }

      tracker.registerDependency(valueBinding, 'selectedPersonName', viewModel)

      const bindings: BindingsCollection = {
        valueBindings: [valueBinding],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [],
        componentBindings: [],
      }

      const affected = tracker.getDependentBindingsWithGetterSupport('selectedIndex', bindings)
      expect(affected.valueBindings).toContain(valueBinding)
    })

    it('should use addGetterBindings for forEachBindings, componentBindings and valueBindings', () => {
      const tracker = new DependencyTracker()

      class ViewModel {
        totalCount = 0
        get totalPeople(): number {
          return this.totalCount * 2
        }
      }

      const viewModel = new ViewModel()
      const forEachBinding = {
        collectionName: 'items',
        itemName: 'item',
        indexName: null,
        template: document.createElement('div'),
        placeholder: document.createComment(''),
        renderedElements: [],
        previousLength: 0,
        extraDependencies: ['totalPeople'],
      }

      const componentBinding = {
        childViewModel: viewModel as unknown as ComponentBinding['childViewModel'],
        mappings: [{ parentKey: 'totalPeople', childKey: 'count' }],
      }

      const valueBinding = {
        element: document.createElement('span'),
        propertyName: 'totalPeople',
      }

      tracker.registerDependency(forEachBinding, 'items', viewModel)
      tracker.registerDependency(componentBinding, 'totalPeople', viewModel)
      tracker.registerDependency(valueBinding, 'totalPeople', viewModel)

      // forEachBinding is registered with 'items' (not a getter), so it must be
      // manually marked as a getter binding since its extraDependencies include 'totalPeople'
      tracker.markAsGetterBinding(forEachBinding)

      const bindings: BindingsCollection = {
        valueBindings: [valueBinding],
        contentBindings: [],
        ifBindings: [],
        classBindings: [],
        styleBindings: [],
        forEachBindings: [forEachBinding],
        componentBindings: [componentBinding],
      }

      // Change in primitive property should trigger all getter bindings
      const affected = tracker.getDependentBindingsWithGetterSupport('totalCount', bindings)

      expect(affected.forEachBindings).toContain(forEachBinding)
      expect(affected.componentBindings).toContain(componentBinding)
      expect(affected.valueBindings).toContain(valueBinding)
    })

    it('should mark getter during registerDependency when viewModel has getter', () => {
      const tracker = new DependencyTracker()

      class ViewModel {
        get computedValue(): string {
          return 'computed'
        }
      }

      const viewModel = new ViewModel()
      const binding = {
        element: document.createElement('div'),
        propertyName: 'computedValue',
      }

      tracker.registerDependency(binding, 'computedValue', viewModel)

      expect(tracker.isGetterBinding(binding)).toBe(true)
    })

    it('should not mark as getter when property is not a getter', () => {
      const tracker = new DependencyTracker()

      class ViewModel {
        regularValue = 'regular'
      }

      const viewModel = new ViewModel()
      const binding = {
        element: document.createElement('div'),
        propertyName: 'regularValue',
      }

      tracker.registerDependency(binding, 'regularValue', viewModel)

      expect(tracker.isGetterBinding(binding)).toBe(false)
    })
  })
})
