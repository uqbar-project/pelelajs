import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  InvalidBindingSyntaxError,
  InvalidDOMStructureError,
  InvalidPropertyTypeError,
  PropertyValidationError,
} from '../errors/index'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { clearComponentRegistry, defineComponent } from '../registry/componentRegistry'
import {
  createExtendedViewModel,
  isBindingAttribute,
  isCustomComponent,
  renderForEachBindings,
  setupForEachBindings,
  setupSingleForEachBinding,
} from './bindForEach'
import { getOptionValue } from './optionValues'
import { setupBindings } from './setupBindings'

describe('bindForEach', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  describe('setupForEachBindings', () => {
    it('should parse for-each expression correctly', () => {
      container.innerHTML = `
        <div for-each="user of users">
          <span bind-content="user.name"></span>
        </div>
      `

      const viewModel = { users: [] }
      const bindings = setupForEachBindings(container, viewModel)

      expect(bindings).toHaveLength(1)
      expect(bindings[0].itemName).toBe('user')
      expect(bindings[0].collectionName).toBe('users')
    })

    it('should remove template element from DOM', () => {
      container.innerHTML = `
        <ul>
          <li for-each="item of items">Item</li>
        </ul>
      `

      const viewModel = { items: [] }
      setupForEachBindings(container, viewModel)

      const li = container.querySelector('li')
      expect(li).toBeNull()
    })

    it('should create placeholder comment', () => {
      container.innerHTML = `
        <div for-each="item of items"></div>
      `

      const viewModel = { items: [] }
      setupForEachBindings(container, viewModel)

      const comment = Array.from(container.childNodes).find(
        (node) => node.nodeType === Node.COMMENT_NODE,
      )
      expect(comment).toBeDefined()
      expect(comment?.textContent).toContain('for-each: item of items')
    })

    it('should throw PropertyValidationError if collection property does not exist', () => {
      container.innerHTML = '<div for-each="item of missing"></div>'
      const viewModel = {}

      expect(() => {
        setupForEachBindings(container, viewModel)
      }).toThrow(PropertyValidationError)
    })

    it('should throw InvalidBindingSyntaxError for invalid expression', () => {
      container.innerHTML = '<div for-each="invalid"></div>'
      const viewModel = { invalid: [] }

      expect(() => {
        setupForEachBindings(container, viewModel)
      }).toThrow(InvalidBindingSyntaxError)
    })

    it('should throw InvalidPropertyTypeError for non-array collection', () => {
      container.innerHTML = '<div for-each="item of notArray"></div>'
      const viewModel = { notArray: 'string' }

      expect(() => {
        setupForEachBindings(container, viewModel)
      }).toThrow(InvalidPropertyTypeError)
    })

    it('should ignore elements with empty for-each', () => {
      container.innerHTML = '<div for-each=""></div>'
      const viewModel = { items: [] }

      const bindings = setupForEachBindings(container, viewModel)

      expect(bindings).toHaveLength(0)
    })

    it('should ignore elements with whitespace-only for-each', () => {
      container.innerHTML = '<div for-each="   "></div>'
      const viewModel = { items: [] }

      const bindings = setupForEachBindings(container, viewModel)

      expect(bindings).toHaveLength(0)
    })

    it('should throw InvalidDOMStructureError when element has no parent node', () => {
      const element = document.createElement('div')
      element.setAttribute('for-each', 'item of items')

      const viewModel = { items: [] }

      expect(() => {
        setupSingleForEachBinding(element, viewModel)
      }).toThrowError(InvalidDOMStructureError)
      expect(() => {
        setupSingleForEachBinding(element, viewModel)
      }).toThrowError(/element has no parent node/)
    })

    it('should make the item variable read-only through proxy (no index)', () => {
      const itemRef = { current: 'initial' }
      const viewModel = { items: ['initial'] }
      const extendedViewModel = createExtendedViewModel({
        parentViewModel: viewModel,
        itemName: 'item',
        itemRef,
        indexName: null,
        indexRef: { current: 0 },
      })

      // item is read-only — assignment has no effect
      extendedViewModel.item = 'updated'
      expect(itemRef.current).toBe('initial')
    })

    describe('isBindingAttribute', () => {
      it('should accept framework binding prefixes', () => {
        expect(isBindingAttribute('bind-content')).toBe(true)
        expect(isBindingAttribute('bind-class')).toBe(true)
        expect(isBindingAttribute('link-value')).toBe(true)
        expect(isBindingAttribute('prop-name')).toBe(true)
        expect(isBindingAttribute('click')).toBe(true)
        expect(isBindingAttribute('if')).toBe(true)
        expect(isBindingAttribute('for-each')).toBe(true)
        expect(isBindingAttribute('index')).toBe(true)
      })

      it('should reject standard HTML attributes with hyphens', () => {
        expect(isBindingAttribute('aria-label')).toBe(false)
        expect(isBindingAttribute('aria-hidden')).toBe(false)
        expect(isBindingAttribute('data-test')).toBe(false)
        expect(isBindingAttribute('data-id')).toBe(false)
        expect(isBindingAttribute('role')).toBe(false)
        expect(isBindingAttribute('xml:lang')).toBe(false)
      })

      it('should reject custom kebab-case props', () => {
        expect(isBindingAttribute('custom-prop')).toBe(false)
        expect(isBindingAttribute('my-attribute')).toBe(false)
      })
    })

    describe('isCustomComponent', () => {
      it('should return true for registered components with hyphen in tag name', () => {
        class TestVM {
          value = ''
        }
        defineComponent('custom-component', TestVM, '<component view-model="TestVM"></component>')

        const element = document.createElement('custom-component')
        expect(isCustomComponent(element)).toBe(true)
      })

      it('should return false for standard HTML elements', () => {
        const div = document.createElement('div')
        const span = document.createElement('span')
        expect(isCustomComponent(div)).toBe(false)
        expect(isCustomComponent(span)).toBe(false)
      })

      it('should return false for unregistered custom elements', () => {
        const element = document.createElement('unregistered-comp')
        expect(isCustomComponent(element)).toBe(false)
      })
    })

    it('should handle setting nested properties through proxy', () => {
      const itemRef = { current: { name: 'initial' } }
      const viewModel = { items: [{ name: 'initial' }] }
      const extendedViewModel = createExtendedViewModel({
        parentViewModel: viewModel,
        itemName: 'item',
        itemRef,
        indexName: null,
        indexRef: { current: 0 },
      })

      // Test proxy set handler for nested property (line 51)
      extendedViewModel['item.name'] = 'updated'
      // The proxy should return true for nested property paths without modifying itemRef
      expect(itemRef.current).toEqual({ name: 'initial' })
    })

    it('should capture external dependencies from nested if and for-each bindings', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span if="searchQuery"></span>
        </div>
      `
      const viewModel = { items: ['a', 'b'], searchQuery: 'test' }
      const binding = setupSingleForEachBinding(
        container.querySelector('[for-each]') as HTMLElement,
        viewModel,
      )

      expect(binding).not.toBeNull()
      expect(binding!.extraDependencies).toContain('searchQuery')
    })

    it('should handle setting parent viewModel properties through proxy', () => {
      const itemRef = { current: 1 }
      const viewModel = { items: [1], parentProp: 'initial' }
      const extendedViewModel = createExtendedViewModel({
        parentViewModel: viewModel,
        itemName: 'item',
        itemRef,
        indexName: null,
        indexRef: { current: 0 },
      })

      // Test proxy set handler for parent property (lines 52-53)
      extendedViewModel.parentProp = 'updated'
      expect(viewModel.parentProp).toBe('updated')
    })

    it('should map value bindings to real elements', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <input bind-value="item.value">
        </div>
      `

      const viewModel = { items: [{ value: 'test' }] }
      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const input = container.querySelector('input')
      expect(input?.value).toBe('test')
    })

    it('should map style bindings to real elements', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-style="item.style">Text</span>
        </div>
      `

      const viewModel = { items: [{ style: { color: 'red' } }] }
      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const span = container.querySelector('span')
      expect(span?.style.color).toBe('red')
    })
  })

  describe('renderForEachBindings', () => {
    afterEach(() => {
      clearComponentRegistry()
    })

    it('should render elements for initial array', () => {
      container.innerHTML = `
        <div for-each="user of users">
          <span bind-content="user.name"></span>
        </div>
      `

      const viewModel = {
        users: [{ name: 'Alice' }, { name: 'Bob' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans).toHaveLength(2)
      expect(spans[0].innerHTML).toBe('Alice')
      expect(spans[1].innerHTML).toBe('Bob')
    })

    it('should add new elements when array grows', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-content="item.text"></span>
        </div>
      `

      const viewModel = {
        items: [{ text: 'First' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      expect(container.querySelectorAll('span')).toHaveLength(1)

      viewModel.items.push({ text: 'Second' })
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans).toHaveLength(2)
      expect(spans[0].innerHTML).toBe('First')
      expect(spans[1].innerHTML).toBe('Second')
    })

    it('should remove elements when array shrinks', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-content="item.text"></span>
        </div>
      `

      const viewModel = {
        items: [{ text: 'First' }, { text: 'Second' }, { text: 'Third' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      expect(container.querySelectorAll('span')).toHaveLength(3)

      viewModel.items.pop()
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans).toHaveLength(2)
      expect(spans[0].innerHTML).toBe('First')
      expect(spans[1].innerHTML).toBe('Second')
    })

    it('should handle empty arrays', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-content="item.text"></span>
        </div>
      `

      const viewModel = { items: [] as Array<{ text: string }> }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      expect(container.querySelectorAll('span')).toHaveLength(0)
    })

    it('should access nested item properties', () => {
      container.innerHTML = `
        <div for-each="user of users">
          <span bind-content="user.profile.email"></span>
        </div>
      `

      const viewModel = {
        users: [{ profile: { email: 'alice@test.com' } }, { profile: { email: 'bob@test.com' } }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans[0].innerHTML).toBe('alice@test.com')
      expect(spans[1].innerHTML).toBe('bob@test.com')
    })

    it('should support nested bindings like bind-if', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span if="item.visible" bind-content="item.text"></span>
        </div>
      `

      const viewModel = {
        items: [
          { text: 'Visible', visible: true },
          { text: 'Hidden', visible: false },
        ],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans[0].style.display).not.toBe('none')
      expect(spans[1].style.display).toBe('none')
    })

    it('should update existing elements when items change', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-content="item.text"></span>
        </div>
      `

      const viewModel = {
        items: [{ text: 'Initial' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      viewModel.items[0].text = 'Updated'
      renderForEachBindings(bindings, viewModel)

      const span = container.querySelector('span')
      expect(span?.innerHTML).toBe('Updated')
    })

    it('should handle list items', () => {
      container.innerHTML = `
        <ul>
          <li for-each="tipo of tipos">
            <span bind-content="tipo.descripcion"></span>
          </li>
        </ul>
      `

      const viewModel = {
        tipos: [
          { descripcion: 'Tipo A', value: 1 },
          { descripcion: 'Tipo B', value: 2 },
        ],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const listItems = container.querySelectorAll('li')
      expect(listItems).toHaveLength(2)
      expect(listItems[0].querySelector('span')?.innerHTML).toBe('Tipo A')
      expect(listItems[1].querySelector('span')?.innerHTML).toBe('Tipo B')
    })

    it('should handle table rows', () => {
      container.innerHTML = `
        <table>
          <tbody>
            <tr for-each="user of users">
              <td bind-content="user.id"></td>
              <td bind-content="user.name"></td>
            </tr>
          </tbody>
        </table>
      `

      const viewModel = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const rows = container.querySelectorAll('tr')
      expect(rows).toHaveLength(2)

      const firstRowCells = rows[0].querySelectorAll('td')
      expect(firstRowCells[0].innerHTML).toBe('1')
      expect(firstRowCells[1].innerHTML).toBe('Alice')
    })

    it('should access parent viewModel properties', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-content="prefix"></span>
          <span bind-content="item.text"></span>
        </div>
      `

      const viewModel = {
        prefix: 'Item:',
        items: [{ text: 'First' }, { text: 'Second' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const divs = container.querySelectorAll('div')
      expect(divs[0].querySelectorAll('span')[0].innerHTML).toBe('Item:')
      expect(divs[0].querySelectorAll('span')[1].innerHTML).toBe('First')
      expect(divs[1].querySelectorAll('span')[0].innerHTML).toBe('Item:')
      expect(divs[1].querySelectorAll('span')[1].innerHTML).toBe('Second')
    })

    it('should support if binding on same element as for-each', () => {
      container.innerHTML = `
        <ul>
          <li for-each="item of items" if="item.visible">
            <span bind-content="item.text"></span>
          </li>
        </ul>
      `

      const viewModel = {
        items: [
          { text: 'Visible', visible: true },
          { text: 'Hidden', visible: false },
          { text: 'Also Visible', visible: true },
        ],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const listItems = container.querySelectorAll('li')
      expect(listItems).toHaveLength(3)
      expect(listItems[0].style.display).not.toBe('none')
      expect(listItems[1].style.display).toBe('none')
      expect(listItems[2].style.display).not.toBe('none')
    })

    it('should support bind-value on same element as for-each', () => {
      container.innerHTML = `
        <select>
          <option for-each="tipo of tipos" bind-content="tipo.descripcion"></option>
        </select>
      `

      const viewModel = {
        tipos: [
          { descripcion: 'Tipo A', value: 1 },
          { descripcion: 'Tipo B', value: 2 },
          { descripcion: 'Tipo C', value: 3 },
        ],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const options = container.querySelectorAll('option')
      expect(options).toHaveLength(3)
      expect(options[0].innerHTML).toBe('Tipo A')
      expect(options[1].innerHTML).toBe('Tipo B')
      expect(options[2].innerHTML).toBe('Tipo C')
    })

    it('should support multiple bindings on same element as for-each', () => {
      container.innerHTML = `
        <div>
          <span for-each="item of items" if="item.visible" bind-content="item.text" bind-class="item.className"></span>
        </div>
      `

      const viewModel = {
        items: [
          { text: 'First', visible: true, className: 'highlight' },
          { text: 'Second', visible: false, className: 'normal' },
          { text: 'Third', visible: true, className: 'highlight' },
        ],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans).toHaveLength(3)

      expect(spans[0].style.display).not.toBe('none')
      expect(spans[0].innerHTML).toBe('First')
      expect(spans[0].className).toBe('highlight')

      expect(spans[1].style.display).toBe('none')
      expect(spans[1].innerHTML).toBe('Second')

      expect(spans[2].style.display).not.toBe('none')
      expect(spans[2].innerHTML).toBe('Third')
      expect(spans[2].className).toBe('highlight')
    })

    it('should work with select and option elements', () => {
      container.innerHTML = `
        <select>
          <option for-each="tipo of tipos" bind-content="tipo.descripcion"></option>
        </select>
      `

      const viewModel = {
        tipos: [
          { descripcion: 'Opción 1' },
          { descripcion: 'Opción 2' },
          { descripcion: 'Opción 3' },
        ],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const select = container.querySelector('select')
      const options = select?.querySelectorAll('option')

      expect(options).toBeDefined()
      expect(options?.length).toBe(3)
      expect(options?.[0].innerHTML).toBe('Opción 1')
      expect(options?.[1].innerHTML).toBe('Opción 2')
      expect(options?.[2].innerHTML).toBe('Opción 3')
    })

    it('should setup event listeners for elements inside for-each loop', () => {
      container.innerHTML = `
        <ul>
          <li for-each="item of items">
            <button click="handleItemClick" bind-content="item.name"></button>
          </li>
        </ul>
      `

      const handleItemClick = vi.fn()
      const viewModel = {
        items: [{ name: 'Item 1' }, { name: 'Item 2' }],
        handleItemClick,
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const buttons = container.querySelectorAll('button')
      buttons[0].click()
      buttons[1].click()

      expect(handleItemClick).toHaveBeenCalledTimes(2)
    })

    it('should initialize components inside for-each loop', () => {
      class ItemVM {
        name = ''
      }
      defineComponent(
        'list-item',
        ItemVM,
        '<component view-model="ItemVM"><span bind-content="name"></span></component>',
      )

      container.innerHTML = `
        <div for-each="item of items">
          <list-item prop-name="item.name"></list-item>
        </div>
      `

      const viewModel = {
        items: [{ name: 'Item A' }, { name: 'Item B' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans).toHaveLength(2)
      expect(spans[0].innerHTML).toBe('Item A')
      expect(spans[1].innerHTML).toBe('Item B')
    })

    it('should be reactive for components inside for-each loop when parent property changes', () => {
      class ItemVM {
        name = ''
        selectedId = -1
        get isSelected() {
          return this.name === `Item ${this.selectedId}`
        }
        get itemClasses() {
          return { active: this.isSelected }
        }
      }
      defineComponent(
        'list-item-reactive',
        ItemVM,
        `
        <component view-model="ItemVM">
          <span bind-class="itemClasses" bind-content="name"></span>
        </component>
      `,
      )

      container.innerHTML = `
        <div for-each="item of items">
          <list-item-reactive prop-name="item.name" prop-selected-id="parentSelectedId"></list-item-reactive>
        </div>
      `

      let render: (path?: string) => void = () => {}
      const parentVM = createReactiveViewModel(
        {
          items: [{ name: 'Item 1' }, { name: 'Item 2' }],
          parentSelectedId: 1,
        },
        (path: string) => {
          render(path)
        },
      )

      render = setupBindings(container, parentVM)

      const spans = container.querySelectorAll('span')
      expect(spans[0].classList.contains('active')).toBe(true)
      expect(spans[1].classList.contains('active')).toBe(false)

      parentVM.parentSelectedId = 2

      expect(spans[0].classList.contains('active')).toBe(false)
      expect(spans[1].classList.contains('active')).toBe(true)
    })
  })

  describe('index attribute in for-each', () => {
    it('should expose the index variable in the for-each scope', () => {
      container.innerHTML = `
        <ul>
          <li for-each="item of items" index="i">
            <span bind-content="item.name"></span>
            <span bind-content="i"></span>
          </li>
        </ul>
      `

      const viewModel = {
        items: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const listItems = container.querySelectorAll('li')
      expect(listItems).toHaveLength(3)
      expect(listItems[0].querySelectorAll('span')[1].innerHTML).toBe('0')
      expect(listItems[1].querySelectorAll('span')[1].innerHTML).toBe('1')
      expect(listItems[2].querySelectorAll('span')[1].innerHTML).toBe('2')
    })

    it('should update index values when the array grows', () => {
      container.innerHTML = `
        <ul>
          <li for-each="item of items" index="i">
            <span bind-content="i"></span>
          </li>
        </ul>
      `

      const viewModel = { items: [{ name: 'Alice' }] }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      expect(container.querySelector('li span')?.innerHTML).toBe('0')

      viewModel.items.push({ name: 'Bob' })
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('li span')
      expect(spans[0].innerHTML).toBe('0')
      expect(spans[1].innerHTML).toBe('1')
    })

    it('should keep index values consistent when the array shrinks', () => {
      container.innerHTML = `
        <ul>
          <li for-each="item of items" index="i">
            <span bind-content="i"></span>
          </li>
        </ul>
      `

      const viewModel = { items: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }] }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      viewModel.items.pop()
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('li span')
      expect(spans).toHaveLength(2)
      expect(spans[0].innerHTML).toBe('0')
      expect(spans[1].innerHTML).toBe('1')
    })

    it('should make the index variable read-only (assignment has no effect)', () => {
      const itemRef = { current: 'item' }
      const indexRef = { current: 0 }
      const viewModel = { items: ['item'] }
      const extendedViewModel = createExtendedViewModel({
        parentViewModel: viewModel,
        itemName: 'item',
        itemRef,
        indexName: 'i',
        indexRef,
      })

      extendedViewModel.i = 99
      expect(indexRef.current).toBe(0)
    })

    it('should make the item variable read-only (assignment has no effect)', () => {
      const itemRef = { current: 'original' }
      const indexRef = { current: 0 }
      const viewModel = { items: ['original'] }
      const extendedViewModel = createExtendedViewModel({
        parentViewModel: viewModel,
        itemName: 'item',
        itemRef,
        indexName: 'i',
        indexRef,
      })

      extendedViewModel.item = 'mutated'
      expect(itemRef.current).toBe('original')
    })

    it('should return correct property descriptors via proxy traps', () => {
      const itemRef = { current: { nested: 'value' } }
      const indexRef = { current: 0 }
      const viewModel = { items: [], parentProp: 'parent-value' }
      const extendedViewModel = createExtendedViewModel({
        parentViewModel: viewModel,
        itemName: 'item',
        itemRef,
        indexName: 'i',
        indexRef,
      })

      // Test descriptor for indexName
      const indexDesc = Object.getOwnPropertyDescriptor(extendedViewModel, 'i')
      expect(indexDesc).toEqual({
        configurable: true,
        enumerable: true,
        value: undefined,
        writable: false,
      })

      // Test descriptor for itemName
      const itemDesc = Object.getOwnPropertyDescriptor(extendedViewModel, 'item')
      expect(itemDesc).toEqual({
        configurable: true,
        enumerable: true,
        value: undefined,
        writable: false,
      })

      // Test descriptor for nested property path on itemName
      const nestedDesc = Object.getOwnPropertyDescriptor(extendedViewModel, 'item.nested')
      expect(nestedDesc).toEqual({
        configurable: true,
        enumerable: true,
        value: undefined,
        writable: false,
      })

      // Test descriptor for parent property
      const parentDesc = Object.getOwnPropertyDescriptor(extendedViewModel, 'parentProp')
      expect(parentDesc).toBeDefined()
      expect(parentDesc?.value).toBe('parent-value')
    })

    it('should work without index attribute (backward compatible)', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-content="item.text"></span>
        </div>
      `

      const viewModel = { items: [{ text: 'Hello' }, { text: 'World' }] }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans[0].innerHTML).toBe('Hello')
      expect(spans[1].innerHTML).toBe('World')
    })

    it('should remove the index attribute from rendered DOM elements', () => {
      container.innerHTML = `
        <ul>
          <li for-each="item of items" index="i">
            <span bind-content="item.name"></span>
          </li>
        </ul>
      `

      const viewModel = { items: [{ name: 'Alice' }] }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const renderedLi = container.querySelector('li')
      expect(renderedLi?.hasAttribute('index')).toBe(false)
    })

    it('should not register index as an external dependency', () => {
      container.innerHTML = `
        <div for-each="item of items" index="i">
          <span bind-content="item.name"></span>
        </div>
      `
      const viewModel = { items: [{ name: 'Alice' }] }
      const binding = setupSingleForEachBinding(
        container.querySelector('[for-each]') as HTMLElement,
        viewModel,
      )

      expect(binding).not.toBeNull()
      expect(binding!.extraDependencies).not.toContain('i')
    })

    it('should not produce false positives in dependency normalization when first segment matches as prefix but not exactly', () => {
      container.innerHTML = `
        <div for-each="item of userItems">
          <span bind-content="username"></span>
        </div>
      `
      const viewModel = { userItems: [], username: 'test' }
      const binding = setupSingleForEachBinding(
        container.querySelector('[for-each]') as HTMLElement,
        viewModel,
      )

      expect(binding).not.toBeNull()
      expect(binding!.extraDependencies).toContain('username')
      expect(binding!.extraDependencies).not.toContain('user')
    })

    it('should ignore empty or whitespace-only index attribute', () => {
      container.innerHTML = `
        <div for-each="item of items" index="   ">
          <span bind-content="item.name"></span>
        </div>
      `
      const viewModel = { items: [{ name: 'Alice' }] }
      const binding = setupSingleForEachBinding(
        container.querySelector('[for-each]') as HTMLElement,
        viewModel,
      )

      expect(binding).not.toBeNull()
      expect(binding!.indexName).toBeNull()
    })

    it('should throw InvalidBindingSyntaxError if index is not a valid JS identifier', () => {
      container.innerHTML = `
        <div for-each="item of items" index="foo-bar">
          <span bind-content="item.name"></span>
        </div>
      `
      const viewModel = { items: [{ name: 'Alice' }] }
      expect(() => {
        setupSingleForEachBinding(container.querySelector('[for-each]') as HTMLElement, viewModel)
      }).toThrow(InvalidBindingSyntaxError)
    })

    it('should throw InvalidBindingSyntaxError if index starts with a number (0foo)', () => {
      container.innerHTML = `
        <div for-each="item of items" index="0foo">
          <span bind-content="item.name"></span>
        </div>
      `
      const viewModel = { items: [{ name: 'Alice' }] }
      expect(() => {
        setupSingleForEachBinding(container.querySelector('[for-each]') as HTMLElement, viewModel)
      }).toThrow(InvalidBindingSyntaxError)
    })

    it('should throw InvalidBindingSyntaxError if index is only numbers (123)', () => {
      container.innerHTML = `
        <div for-each="item of items" index="123">
          <span bind-content="item.name"></span>
        </div>
      `
      const viewModel = { items: [{ name: 'Alice' }] }
      expect(() => {
        setupSingleForEachBinding(container.querySelector('[for-each]') as HTMLElement, viewModel)
      }).toThrow(InvalidBindingSyntaxError)
    })
  })

  describe('Issue #113 - nested paths and option value', () => {
    it('should support nested paths in for-each collection', () => {
      container.innerHTML = `
        <div>
          <span for-each="value of parent.nested.values" bind-content="value"></span>
        </div>
      `

      const viewModel = {
        parent: {
          nested: {
            values: [10, 20, 30],
          },
        },
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans).toHaveLength(3)
      expect(spans[0].textContent).toBe('10')
      expect(spans[1].textContent).toBe('20')
      expect(spans[2].textContent).toBe('30')
    })

    it('should react to changes in nested for-each collection', () => {
      container.innerHTML = `
        <div>
          <span for-each="value of parent.nested.values" bind-content="value"></span>
        </div>
      `

      const viewModel = {
        parent: {
          nested: {
            values: [10, 20],
          },
        },
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      let spans = container.querySelectorAll('span')
      expect(spans).toHaveLength(2)

      viewModel.parent.nested.values.push(30)
      renderForEachBindings(bindings, viewModel)

      spans = container.querySelectorAll('span')
      expect(spans).toHaveLength(3)
    })

    it('should set index-based value on options when item is an object', () => {
      container.innerHTML = `
        <select>
          <option for-each="type of types" bind-content="type.description"></option>
        </select>
      `

      const viewModel = {
        types: [
          { description: 'Type A', value: 1 },
          { description: 'Type B', value: 2 },
        ],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const options = container.querySelectorAll('option')
      expect(options).toHaveLength(2)
      expect(options[0].textContent).toBe('Type A')
      expect(options[0].value).toBe('0')
      expect(options[1].textContent).toBe('Type B')
      expect(options[1].value).toBe('1')
    })

    it('should set option value to string when item is not object', () => {
      container.innerHTML = `
        <select bind-value="selected">
          <option for-each="item of values" bind-content="item"></option>
        </select>
      `
      const viewModel = { values: [1, 2, 3], selected: null }

      setupBindings(container, viewModel)

      const options = container.querySelectorAll('option')
      expect(options).toHaveLength(3)
      expect(options[0].value).toBe('1')
      expect(options[1].value).toBe('2')
      expect(options[2].value).toBe('3')
    })

    it('should preserve class instance reference through WeakMap when option is selected', () => {
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
        types: [typeA, typeB],
        selectedType: null as BetType | null,
      }

      setupBindings(container, viewModel)

      const options = container.querySelectorAll('option')
      expect(options).toHaveLength(2)
      expect(getOptionValue(options[0] as HTMLOptionElement)).toBe(typeA)
      expect(getOptionValue(options[1] as HTMLOptionElement)).toBe(typeB)
    })

    it('should access nested properties of item in for-each', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-content="item.name"></span>
        </div>
      `
      const viewModel = { items: [{ name: 'Item 1' }, { name: 'Item 2' }] }

      setupBindings(container, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans).toHaveLength(2)
      expect(spans[0].textContent).toBe('Item 1')
      expect(spans[1].textContent).toBe('Item 2')
    })

    it('should access deeply nested properties of item in for-each', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-content="item.details.name"></span>
        </div>
      `
      const viewModel = {
        items: [{ details: { name: 'Item 1' } }, { details: { name: 'Item 2' } }],
      }

      setupBindings(container, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans).toHaveLength(2)
      expect(spans[0].textContent).toBe('Item 1')
      expect(spans[1].textContent).toBe('Item 2')
    })

    it('should bind to nested properties of item in for-each', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <input bind-value="item.name" />
        </div>
      `
      const viewModel = { items: [{ name: 'Item 1' }, { name: 'Item 2' }] }

      setupBindings(container, viewModel)

      const inputs = container.querySelectorAll('input')
      expect(inputs).toHaveLength(2)
      expect(inputs[0].value).toBe('Item 1')
      expect(inputs[1].value).toBe('Item 2')
    })

    it('should update nested properties of item in for-each', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <input bind-value="item.name" />
        </div>
      `
      const viewModel = { items: [{ name: 'Item 1' }, { name: 'Item 2' }] }

      setupBindings(container, viewModel)

      const inputs = container.querySelectorAll('input')
      inputs[0].value = 'Updated Item 1'
      inputs[0].dispatchEvent(new Event('input'))

      expect(viewModel.items[0].name).toBe('Updated Item 1')
    })
  })

  describe('Issue #131 - bind-src within for-each', () => {
    it('should render bind-src with simple item properties', () => {
      container.innerHTML = `
        <div for-each="person of people">
          <img bind-src="person.image" />
        </div>
      `

      const viewModel = {
        people: [{ image: 'image1.png' }, { image: 'image2.png' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const images = container.querySelectorAll('img')
      expect(images).toHaveLength(2)
      expect(images[0].getAttribute('src')).toBe('image1.png')
      expect(images[1].getAttribute('src')).toBe('image2.png')
    })

    it('should render bind-src with nested item properties', () => {
      container.innerHTML = `
        <div for-each="person of people">
          <img bind-src="person.profile.avatar" />
        </div>
      `

      const viewModel = {
        people: [{ profile: { avatar: 'avatar1.png' } }, { profile: { avatar: 'avatar2.png' } }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const images = container.querySelectorAll('img')
      expect(images).toHaveLength(2)
      expect(images[0].getAttribute('src')).toBe('avatar1.png')
      expect(images[1].getAttribute('src')).toBe('avatar2.png')
    })

    it('should update bind-src when item property changes', () => {
      container.innerHTML = `
        <div for-each="person of people">
          <img bind-src="person.image" />
        </div>
      `

      const viewModel = {
        people: [{ image: 'old.png' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const img = container.querySelector('img')!
      expect(img.getAttribute('src')).toBe('old.png')

      viewModel.people[0].image = 'new.png'
      renderForEachBindings(bindings, viewModel)

      expect(img.getAttribute('src')).toBe('new.png')
    })

    it('should handle null and undefined values in bind-src', () => {
      container.innerHTML = `
        <div for-each="person of people">
          <img bind-src="person.image" />
        </div>
      `

      const viewModel = {
        people: [{ image: 'initial.png' as string | null | undefined }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const img = container.querySelector('img')!
      expect(img.getAttribute('src')).toBe('initial.png')

      viewModel.people[0].image = null
      renderForEachBindings(bindings, viewModel)
      expect(img.getAttribute('src')).toBeNull()

      viewModel.people[0].image = undefined
      renderForEachBindings(bindings, viewModel)
      expect(img.getAttribute('src')).toBeNull()
    })

    it('should handle bind-src when array grows', () => {
      container.innerHTML = `
        <div for-each="person of people">
          <img bind-src="person.image" />
        </div>
      `

      const viewModel = {
        people: [{ image: 'image1.png' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      expect(container.querySelectorAll('img')).toHaveLength(1)

      viewModel.people.push({ image: 'image2.png' })
      renderForEachBindings(bindings, viewModel)

      const images = container.querySelectorAll('img')
      expect(images).toHaveLength(2)
      expect(images[0].getAttribute('src')).toBe('image1.png')
      expect(images[1].getAttribute('src')).toBe('image2.png')
    })

    it('should handle bind-src when array shrinks', () => {
      container.innerHTML = `
        <div for-each="person of people">
          <img bind-src="person.image" />
        </div>
      `

      const viewModel = {
        people: [{ image: 'image1.png' }, { image: 'image2.png' }, { image: 'image3.png' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      expect(container.querySelectorAll('img')).toHaveLength(3)

      viewModel.people.pop()
      renderForEachBindings(bindings, viewModel)

      const images = container.querySelectorAll('img')
      expect(images).toHaveLength(2)
      expect(images[0].getAttribute('src')).toBe('image1.png')
      expect(images[1].getAttribute('src')).toBe('image2.png')
    })

    it('should render bind-src with index attribute', () => {
      container.innerHTML = `
        <div for-each="person of people" index="i">
          <img bind-src="person.image" />
          <span bind-content="i"></span>
        </div>
      `

      const viewModel = {
        people: [{ image: 'image1.png' }, { image: 'image2.png' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const images = container.querySelectorAll('img')
      expect(images).toHaveLength(2)
      expect(images[0].getAttribute('src')).toBe('image1.png')
      expect(images[1].getAttribute('src')).toBe('image2.png')

      const spans = container.querySelectorAll('span')
      expect(spans[0].textContent).toBe('0')
      expect(spans[1].textContent).toBe('1')
    })
  })
})
