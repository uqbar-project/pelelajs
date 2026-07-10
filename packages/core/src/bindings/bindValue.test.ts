import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initializeI18n } from '../commons/i18n'
import { PropertyValidationError, UnsupportedElementError } from '../errors/index'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { testHelpers } from '../test/helpers'
import { renderForEachBindings, setupForEachBindings } from './bindForEach'
import { renderValueBindings, setupValueBindings } from './bindValue'

describe('bindValue', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = testHelpers.createTestContainer()
  })

  afterEach(() => {
    testHelpers.cleanupTestContainer(container)
  })

  describe('setupValueBindings', () => {
    it('should collect input elements with bind-value', () => {
      container.innerHTML = `
        <input bind-value="name" />
        <textarea bind-value="description"></textarea>
      `

      const viewModel = { name: '', description: '' }
      const bindings = setupValueBindings(container, viewModel)

      expect(bindings).toHaveLength(2)
    })

    it('should throw error for non-input elements', () => {
      container.innerHTML = '<span bind-value="text"></span>'
      const viewModel = { text: '' }

      expect(() => setupValueBindings(container, viewModel)).toThrow(
        new UnsupportedElementError('span', '<span bind-value="text"></span>'),
      )
    })

    it('should throw error for div elements', () => {
      container.innerHTML = '<div bind-value="text"></div>'
      const viewModel = { text: '' }

      expect(() => setupValueBindings(container, viewModel)).toThrow(
        new UnsupportedElementError('div', '<div bind-value="text"></div>'),
      )
    })

    it('should throw error for p elements', () => {
      container.innerHTML = '<p bind-value="text"></p>'
      const viewModel = { text: '' }

      expect(() => setupValueBindings(container, viewModel)).toThrow(
        new UnsupportedElementError('p', '<p bind-value="text"></p>'),
      )
    })

    it('should setup event listeners on inputs', () => {
      container.innerHTML = '<input bind-value="name" />'
      const viewModel = { name: 'initial' }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = 'updated'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.name).toBe('updated')
    })

    it('should convert numeric values in inputs', () => {
      container.innerHTML = '<input bind-value="count" />'
      const viewModel = { count: 0 }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = '42'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.count).toBe(42)
    })

    it('should handle invalid numeric values', () => {
      container.innerHTML = '<input bind-value="count" />'
      const viewModel = { count: 0 }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = 'invalid'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.count).toBe(0)
    })

    it('should accept commas as decimal separator in Spanish', () => {
      initializeI18n('es')
      container.innerHTML = '<input bind-value="price" />'
      const viewModel = { price: 0 }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = '10,5'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.price).toBe(10.5)
    })

    it('should handle thousands separators in Spanish', () => {
      initializeI18n('es')
      container.innerHTML = '<input bind-value="price" />'
      const viewModel = { price: 0 }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = '1.234,56'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.price).toBe(1234.56)
    })

    it('should accept dots as decimal separator in English', () => {
      initializeI18n('en')
      container.innerHTML = '<input bind-value="price" />'
      const viewModel = { price: 0 }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = '10.5'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.price).toBe(10.5)
    })

    it('should handle thousands separators in English', () => {
      initializeI18n('en')
      container.innerHTML = '<input bind-value="price" />'
      const viewModel = { price: 0 }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = '1,234.56'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.price).toBe(1234.56)
    })

    it('should handle spaces in numeric input', () => {
      initializeI18n('en')
      container.innerHTML = '<input bind-value="price" />'
      const viewModel = { price: 0 }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = ' 1 234 . 56 '
      input.dispatchEvent(new Event('input'))

      expect(viewModel.price).toBe(1234.56)
    })

    it('should throw error if property does not exist', () => {
      container.innerHTML = '<span bind-value="missing"></span>'
      const viewModel = {}

      expect(() => {
        setupValueBindings(container, viewModel)
      }).toThrow(PropertyValidationError)
    })

    it('should ignore elements with empty bind-value', () => {
      container.innerHTML = '<span bind-value=""></span>'
      const viewModel = { prop: 'value' }

      const bindings = setupValueBindings(container, viewModel)

      expect(bindings).toHaveLength(0)
    })

    it('should ignore elements with whitespace-only bind-value', () => {
      container.innerHTML = '<span bind-value="   "></span>'
      const viewModel = { prop: 'value' }

      const bindings = setupValueBindings(container, viewModel)

      expect(bindings).toHaveLength(0)
    })

    it('should setup event listeners on checkboxes', () => {
      container.innerHTML = '<input type="checkbox" bind-value="isActive" />'
      const viewModel = { isActive: false }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.checked = true
      input.dispatchEvent(new Event('change'))

      expect(viewModel.isActive).toBe(true)
    })

    it('should update nested checkbox binding in repeated structures', () => {
      container.innerHTML = '<input type="checkbox" bind-value="bet.active" />'
      const viewModel = { bet: { active: false } }

      const bindings = setupValueBindings(container, viewModel)
      const input = container.querySelector('input')!

      input.checked = true
      input.dispatchEvent(new Event('change'))

      expect(viewModel.bet.active).toBe(true)

      viewModel.bet.active = false
      renderValueBindings(bindings, viewModel)
      expect(input.checked).toBe(false)
    })
  })

  describe('renderValueBindings', () => {
    it('should update value of inputs', () => {
      container.innerHTML = '<input bind-value="name" />'
      const viewModel = { name: 'John' }
      const bindings = setupValueBindings(container, viewModel)

      viewModel.name = 'Jane'
      renderValueBindings(bindings, viewModel)

      const input = container.querySelector('input')!
      expect(input.value).toBe('Jane')
    })

    it('should handle null and undefined values', () => {
      container.innerHTML = '<input bind-value="text" />'
      const viewModel: { text: unknown } = { text: 'initial' }
      const bindings = setupValueBindings(container, viewModel)

      viewModel.text = null
      renderValueBindings(bindings, viewModel)
      expect(container.querySelector('input')!.value).toBe('')

      viewModel.text = undefined
      renderValueBindings(bindings, viewModel)
      expect(container.querySelector('input')!.value).toBe('')
    })

    it('should convert numbers to strings', () => {
      container.innerHTML = '<input bind-value="count" />'
      const viewModel = { count: 42 }
      const bindings = setupValueBindings(container, viewModel)

      renderValueBindings(bindings, viewModel)

      expect(container.querySelector('input')!.value).toBe('42')
    })

    it('should not update input if value has not changed', () => {
      container.innerHTML = '<input bind-value="name" />'
      const viewModel = { name: 'John' }
      const bindings = setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = 'John'

      renderValueBindings(bindings, viewModel)

      expect(input.value).toBe('John')
    })

    it('should update checked state for checkboxes', () => {
      container.innerHTML = '<input type="checkbox" bind-value="isActive" />'
      const viewModel = { isActive: false }
      const bindings = setupValueBindings(container, viewModel)

      viewModel.isActive = true
      renderValueBindings(bindings, viewModel)

      const input = container.querySelector('input')!
      expect(input.checked).toBe(true)

      viewModel.isActive = false
      renderValueBindings(bindings, viewModel)

      expect(input.checked).toBe(false)
    })

    it('should handle invalid JSON string when current value is object', () => {
      container.innerHTML = '<input bind-value="data" />'
      const viewModel = { data: { key: 'value' } }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = 'invalid json'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.data).toBe('invalid json')
    })

    it('should parse valid devalue strings into objects when current value is object', () => {
      container.innerHTML = '<input bind-value="data" />'
      const viewModel = { data: { key: 'initial' } }

      setupValueBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.value = '[{"key":1},"updated"]'
      input.dispatchEvent(new Event('input'))

      expect(viewModel.data).toEqual({ key: 'updated' })
    })

    it('should stringify objects when rendering in input', () => {
      container.innerHTML = '<input bind-value="data" />'
      const viewModel = { data: { key: 'value' } }
      const bindings = setupValueBindings(container, viewModel)

      renderValueBindings(bindings, viewModel)

      const input = container.querySelector('input')!
      expect(input.value).toBe('[{"key":1},"value"]')
    })
  })

  describe('SELECT with WeakMap binding', () => {
    it('should update viewModel with original object reference when option is selected', () => {
      container.innerHTML = `
        <select bind-value="selectedType">
          <option for-each="type of types" bind-content="type.description"></option>
        </select>
      `

      const viewModel = {
        types: [
          { description: 'Type A', id: 1 },
          { description: 'Type B', id: 2 },
        ],
        selectedType: null as { description: string; id: number } | null,
      }

      const forEachBindings = setupForEachBindings(container, viewModel)
      const valueBindings = setupValueBindings(container, viewModel)
      renderForEachBindings(forEachBindings, viewModel)
      renderValueBindings(valueBindings, viewModel)

      const select = container.querySelector('select')!
      select.selectedIndex = 0
      select.dispatchEvent(new Event('input'))

      expect(viewModel.selectedType).toBe(viewModel.types[0])
    })

    it('should select the correct option when rendering with a matching object reference', () => {
      container.innerHTML = `
        <select bind-value="selectedType">
          <option for-each="type of types" bind-content="type.description"></option>
        </select>
      `

      const viewModel = {
        types: [
          { description: 'Type A', id: 1 },
          { description: 'Type B', id: 2 },
        ],
        selectedType: null as { description: string; id: number } | null,
      }

      const forEachBindings = setupForEachBindings(container, viewModel)
      const valueBindings = setupValueBindings(container, viewModel)
      renderForEachBindings(forEachBindings, viewModel)

      viewModel.selectedType = viewModel.types[1]
      renderValueBindings(valueBindings, viewModel)

      const select = container.querySelector('select')!
      expect(select.selectedIndex).toBe(1)
    })

    it('should preserve class instance methods after select event', () => {
      container.innerHTML = `
        <select bind-value="selectedType">
          <option for-each="type of types" bind-content="type.description"></option>
        </select>
      `

      class BetType {
        constructor(
          public description: string,
          public multiplier: number,
        ) {}

        getLabel(): string {
          return `${this.description} x${this.multiplier}`
        }
      }

      const typeA = new BetType('Type A', 2)
      const typeB = new BetType('Type B', 3)

      const viewModel = {
        types: [typeA, typeB] as BetType[],
        selectedType: null as BetType | null,
      }

      const forEachBindings = setupForEachBindings(container, viewModel)
      const valueBindings = setupValueBindings(container, viewModel)
      renderForEachBindings(forEachBindings, viewModel)
      renderValueBindings(valueBindings, viewModel)

      const select = container.querySelector('select')!
      select.selectedIndex = 1
      select.dispatchEvent(new Event('input'))

      expect(viewModel.selectedType).toBe(typeB)
      expect(viewModel.selectedType?.getLabel()).toBe('Type B x3')
    })

    it('should match option when ViewModel value is POJO and options have class instances with same properties', () => {
      container.innerHTML = `
        <select bind-value="selectedType">
          <option for-each="type of types" bind-content="type.description"></option>
        </select>
      `

      class BetType {
        constructor(
          public description: string,
          public multiplier: number,
        ) {}
      }

      const typeA = new BetType('Type A', 2)
      const typeB = new BetType('Type B', 3)

      const viewModel = {
        types: [typeA, typeB] as BetType[],
        selectedType: { description: 'Type B', multiplier: 3 } as BetType,
      }

      const forEachBindings = setupForEachBindings(container, viewModel)
      const valueBindings = setupValueBindings(container, viewModel)
      renderForEachBindings(forEachBindings, viewModel)
      renderValueBindings(valueBindings, viewModel)

      const select = container.querySelector('select')!
      expect(select.selectedIndex).toBe(1)
    })

    it('should match option when both ViewModel value and options are POJOs with same properties', () => {
      container.innerHTML = `
        <select bind-value="selectedType">
          <option for-each="type of types" bind-content="type.description"></option>
        </select>
      `

      const typeA = { description: 'Type A', multiplier: 2 }
      const typeB = { description: 'Type B', multiplier: 3 }

      const viewModel = {
        types: [typeA, typeB] as (typeof typeB)[],
        selectedType: { description: 'Type B', multiplier: 3 },
      }

      const forEachBindings = setupForEachBindings(container, viewModel)
      const valueBindings = setupValueBindings(container, viewModel)
      renderForEachBindings(forEachBindings, viewModel)
      renderValueBindings(valueBindings, viewModel)

      const select = container.querySelector('select')!
      expect(select.selectedIndex).toBe(1)
    })

    it('should handle textarea elements', () => {
      container.innerHTML = '<textarea bind-value="description"></textarea>'
      const viewModel = { description: 'initial' }

      setupValueBindings(container, viewModel)

      const textarea = container.querySelector('textarea')!
      textarea.value = 'updated'
      textarea.dispatchEvent(new Event('input'))

      expect(viewModel.description).toBe('updated')
    })

    it('should render textarea values', () => {
      container.innerHTML = '<textarea bind-value="description"></textarea>'
      const viewModel = { description: 'initial' }
      const bindings = setupValueBindings(container, viewModel)

      viewModel.description = 'updated'
      renderValueBindings(bindings, viewModel)

      const textarea = container.querySelector('textarea')!
      expect(textarea.value).toBe('updated')
    })

    it('should handle select with static options (no for-each)', () => {
      container.innerHTML = `
        <select bind-value="selectedValue">
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </select>
      `
      const viewModel = { selectedValue: 'a' }
      const bindings = setupValueBindings(container, viewModel)

      renderValueBindings(bindings, viewModel)

      const select = container.querySelector('select')!
      expect(select.value).toBe('a')
    })

    it('should update viewModel when static option is selected', () => {
      container.innerHTML = `
        <select bind-value="selectedValue">
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </select>
      `
      const viewModel = { selectedValue: 'a' }

      setupValueBindings(container, viewModel)

      const select = container.querySelector('select')!
      select.value = 'b'
      select.dispatchEvent(new Event('input'))

      expect(viewModel.selectedValue).toBe('b')
    })

    it('should preserve numeric type when selecting a static option', () => {
      container.innerHTML = `
        <select bind-value="selectedValue">
          <option value="1">Monotributo</option>
          <option value="2">Responsable Inscripto</option>
        </select>
      `
      const viewModel = { selectedValue: 1 }

      setupValueBindings(container, viewModel)

      const select = container.querySelector('select')!
      select.value = '2'
      select.dispatchEvent(new Event('input'))

      expect(viewModel.selectedValue).toBe(2)
      expect(typeof viewModel.selectedValue).toBe('number')
    })

    it('should handle select with no matching option', () => {
      container.innerHTML = `
        <select bind-value="selectedValue">
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </select>
      `
      const viewModel = { selectedValue: 'c' }
      const bindings = setupValueBindings(container, viewModel)

      renderValueBindings(bindings, viewModel)

      const select = container.querySelector('select')!
      expect(select.selectedIndex).toBe(-1)
    })

    it('should handle select with no selected option gracefully during input event', () => {
      container.innerHTML = `
        <select bind-value="selectedType">
          <option value="1">Type A</option>
        </select>
      `
      const viewModel = { selectedType: { id: 1 } }
      setupValueBindings(container, viewModel)

      const select = container.querySelector('select')!
      // Force selectedIndex to -1
      select.selectedIndex = -1

      expect(() => {
        select.dispatchEvent(new Event('input'))
      }).not.toThrow()

      expect(viewModel.selectedType).toBeUndefined()
    })

    it('should select correct option by identity when class has non-enumerable properties', () => {
      container.innerHTML = `
        <select bind-value="selectedMultiplier">
          <option for-each="m of multipliers" bind-content="m.label"></option>
        </select>
      `

      class Multiplier {
        readonly label!: string
        readonly factor!: number
        constructor(label: string, factor: number) {
          Object.defineProperty(this, 'label', { value: label, enumerable: false })
          Object.defineProperty(this, 'factor', { value: factor, enumerable: false })
        }
        getLabel(): string {
          return `${this.label} x${this.factor}`
        }
      }

      const low = new Multiplier('Low', 2)
      const medium = new Multiplier('Medium', 5)

      const viewModel = createReactiveViewModel(
        { multipliers: [low, medium], selectedMultiplier: medium },
        () => {},
      )

      const forEachBindings = setupForEachBindings(container, viewModel)
      const valueBindings = setupValueBindings(container, viewModel)
      renderForEachBindings(forEachBindings, viewModel)
      renderValueBindings(valueBindings, viewModel)

      const select = container.querySelector('select')!
      expect(select.selectedIndex).toBe(1)

      select.selectedIndex = 0
      select.dispatchEvent(new Event('input'))

      renderForEachBindings(forEachBindings, viewModel)
      renderValueBindings(valueBindings, viewModel)

      expect(select.selectedIndex).toBe(0)
      expect(viewModel.selectedMultiplier.getLabel()).toBe('Low x2')
    })
  })
})
