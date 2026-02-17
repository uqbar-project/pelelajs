import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  InvalidBindingSyntaxError,
  InvalidPropertyTypeError,
  PropertyValidationError,
} from '../errors/index'
import { renderForEachBindings, setupForEachBindings } from './bindForEach'
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
          <span bind-value="user.name"></span>
        </div>
      `

      const viewModel = { users: [] }
      const bindings = setupForEachBindings(container, viewModel)

      expect(bindings).toHaveLength(1)
      expect(bindings[0].itemName).toBe('user')
      expect(bindings[0].collectionName).toBe('users')
    })

    it('should parse for-each expression with index correctly', () => {
      container.innerHTML = `
        <div for-each="(user, index) of users">
          <span bind-value="index"></span>
          <span bind-value="user.name"></span>
        </div>
      `

      const viewModel = { users: [] }
      const bindings = setupForEachBindings(container, viewModel)

      expect(bindings).toHaveLength(1)
      expect(bindings[0].itemName).toBe('user')
      expect(bindings[0].indexName).toBe('index')
      expect(bindings[0].collectionName).toBe('users')
    })

    it('should parse for-each expression with custom index name', () => {
      container.innerHTML = `
        <div for-each="(user, i) of users">
          <span bind-value="i"></span>
          <span bind-value="user.name"></span>
        </div>
      `

      const viewModel = { users: [] }
      const bindings = setupForEachBindings(container, viewModel)

      expect(bindings).toHaveLength(1)
      expect(bindings[0].itemName).toBe('user')
      expect(bindings[0].indexName).toBe('i')
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

    it('should throw InvalidBindingSyntaxError for invalid indexed expression', () => {
      container.innerHTML = '<div for-each="(item index) of items"></div>'
      const viewModel = { items: [] }

      expect(() => {
        setupForEachBindings(container, viewModel)
      }).toThrow(InvalidBindingSyntaxError)
    })

    it('should throw InvalidBindingSyntaxError when item and index names are equal', () => {
      container.innerHTML = '<div for-each="(item, item) of items"></div>'
      const viewModel = { items: [] }

      expect(() => {
        setupForEachBindings(container, viewModel)
      }).toThrow(InvalidBindingSyntaxError)
    })

    it('should throw InvalidBindingSyntaxError when item and collection names are equal', () => {
      container.innerHTML = '<div for-each="items of items"></div>'
      const viewModel = { items: [] }

      expect(() => {
        setupForEachBindings(container, viewModel)
      }).toThrow(InvalidBindingSyntaxError)
    })

    it('should throw InvalidBindingSyntaxError when indexed item and collection names are equal', () => {
      container.innerHTML = '<div for-each="(items, i) of items"></div>'
      const viewModel = { items: [] }

      expect(() => {
        setupForEachBindings(container, viewModel)
      }).toThrow(InvalidBindingSyntaxError)
    })

    it('should throw InvalidBindingSyntaxError when index and collection names are equal', () => {
      container.innerHTML = '<div for-each="(item, items) of items"></div>'
      const viewModel = { items: [] }

      expect(() => {
        setupForEachBindings(container, viewModel)
      }).toThrow(InvalidBindingSyntaxError)
    })

    it('should create placeholder comment with index syntax', () => {
      container.innerHTML = `
        <div for-each="(item, idx) of items"></div>
      `

      const viewModel = { items: [] }
      setupForEachBindings(container, viewModel)

      const comment = Array.from(container.childNodes).find(
        (node) => node.nodeType === Node.COMMENT_NODE,
      )
      expect(comment?.textContent).toContain('for-each: (item, idx) of items')
    })

    it('should throw InvalidBindingSyntaxError for malformed index expression with trailing comma', () => {
      container.innerHTML = '<div for-each="(item,) of items"></div>'
      const viewModel = { items: [] }

      expect(() => {
        setupForEachBindings(container, viewModel)
      }).toThrow(InvalidBindingSyntaxError)
    })

    it('should throw InvalidBindingSyntaxError for unclosed parenthesis', () => {
      container.innerHTML = '<div for-each="(item, index of items"></div>'
      const viewModel = { items: [] }

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

    it('should handle element without parent node', () => {
      const element = document.createElement('div')
      element.setAttribute('for-each', 'item of items')

      const tempContainer = document.createElement('div')
      tempContainer.appendChild(element)

      const viewModel = { items: [] }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      setupForEachBindings(tempContainer, viewModel)

      consoleSpy.mockRestore()
    })
  })

  describe('renderForEachBindings', () => {
    it('should render elements for initial array', () => {
      container.innerHTML = `
        <div for-each="user of users">
          <span bind-value="user.name"></span>
        </div>
      `

      const viewModel = {
        users: [{ name: 'Alice' }, { name: 'Bob' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans).toHaveLength(2)
      expect(spans[0].textContent).toBe('Alice')
      expect(spans[1].textContent).toBe('Bob')
    })

    it('should add new elements when array grows', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-value="item.text"></span>
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
      expect(spans[0].textContent).toBe('First')
      expect(spans[1].textContent).toBe('Second')
    })

    it('should remove elements when array shrinks', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-value="item.text"></span>
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
      expect(spans[0].textContent).toBe('First')
      expect(spans[1].textContent).toBe('Second')
    })

    it('should handle empty arrays', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-value="item.text"></span>
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
          <span bind-value="user.profile.email"></span>
        </div>
      `

      const viewModel = {
        users: [{ profile: { email: 'alice@test.com' } }, { profile: { email: 'bob@test.com' } }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans[0].textContent).toBe('alice@test.com')
      expect(spans[1].textContent).toBe('bob@test.com')
    })

    it('should support nested bindings like bind-if', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span if="item.visible" bind-value="item.text"></span>
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
          <span bind-value="item.text"></span>
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
      expect(span?.textContent).toBe('Updated')
    })

    it('should render zero-based index with indexed for-each syntax', () => {
      container.innerHTML = `
        <div for-each="(item, idx) of items">
          <span bind-value="idx"></span>
          <span bind-value="item.text"></span>
        </div>
      `

      const viewModel = {
        items: [{ text: 'First' }, { text: 'Second' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const divs = container.querySelectorAll('div')
      expect(divs).toHaveLength(2)
      expect(divs[0].querySelectorAll('span')[0].textContent).toBe('0')
      expect(divs[0].querySelectorAll('span')[1].textContent).toBe('First')
      expect(divs[1].querySelectorAll('span')[0].textContent).toBe('1')
      expect(divs[1].querySelectorAll('span')[1].textContent).toBe('Second')
    })

    it('should recalculate indexes after unshift', () => {
      container.innerHTML = `
        <div for-each="(item, idx) of items">
          <span bind-value="idx"></span>
          <span bind-value="item.text"></span>
        </div>
      `

      const viewModel = {
        items: [{ text: 'A' }, { text: 'B' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      viewModel.items.unshift({ text: 'Z' })
      renderForEachBindings(bindings, viewModel)

      const divs = container.querySelectorAll('div')
      expect(divs).toHaveLength(3)
      expect(divs[0].querySelectorAll('span')[0].textContent).toBe('0')
      expect(divs[0].querySelectorAll('span')[1].textContent).toBe('Z')
      expect(divs[1].querySelectorAll('span')[0].textContent).toBe('1')
      expect(divs[1].querySelectorAll('span')[1].textContent).toBe('A')
      expect(divs[2].querySelectorAll('span')[0].textContent).toBe('2')
      expect(divs[2].querySelectorAll('span')[1].textContent).toBe('B')
    })

    it('should recalculate indexes after sort', () => {
      container.innerHTML = `
        <div for-each="(item, idx) of items">
          <span bind-value="idx"></span>
          <span bind-value="item.text"></span>
        </div>
      `

      const viewModel = {
        items: [{ text: 'B' }, { text: 'A' }, { text: 'C' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      viewModel.items.sort((a, b) => a.text.localeCompare(b.text))
      renderForEachBindings(bindings, viewModel)

      const divs = container.querySelectorAll('div')
      expect(divs).toHaveLength(3)
      expect(divs[0].querySelectorAll('span')[0].textContent).toBe('0')
      expect(divs[0].querySelectorAll('span')[1].textContent).toBe('A')
      expect(divs[1].querySelectorAll('span')[0].textContent).toBe('1')
      expect(divs[1].querySelectorAll('span')[1].textContent).toBe('B')
      expect(divs[2].querySelectorAll('span')[0].textContent).toBe('2')
      expect(divs[2].querySelectorAll('span')[1].textContent).toBe('C')
    })

    it('should update index when array shrinks', () => {
      container.innerHTML = `
        <div for-each="(item, index) of items">
          <span class="idx" bind-value="index"></span>
          <span class="text" bind-value="item.text"></span>
        </div>
      `

      const viewModel = {
        items: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      viewModel.items.shift()
      renderForEachBindings(bindings, viewModel)

      const divs = container.querySelectorAll('div')
      expect(divs).toHaveLength(2)
      expect(divs[0].querySelector('.idx')?.textContent).toBe('0')
      expect(divs[0].querySelector('.text')?.textContent).toBe('B')
      expect(divs[1].querySelector('.idx')?.textContent).toBe('1')
      expect(divs[1].querySelector('.text')?.textContent).toBe('C')
    })

    it('should assign correct indexes when array grows', () => {
      container.innerHTML = `
        <div for-each="(item, i) of items">
          <span bind-value="i"></span>
        </div>
      `

      const viewModel = {
        items: [{ text: 'A' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      viewModel.items.push({ text: 'B' }, { text: 'C' })
      renderForEachBindings(bindings, viewModel)

      const spans = container.querySelectorAll('span')
      expect(spans[0].textContent).toBe('0')
      expect(spans[1].textContent).toBe('1')
      expect(spans[2].textContent).toBe('2')
    })

    it('should handle list items', () => {
      container.innerHTML = `
        <ul>
          <li for-each="tipo of tipos">
            <span bind-value="tipo.descripcion"></span>
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
      expect(listItems[0].querySelector('span')?.textContent).toBe('Tipo A')
      expect(listItems[1].querySelector('span')?.textContent).toBe('Tipo B')
    })

    it('should handle table rows', () => {
      container.innerHTML = `
        <table>
          <tbody>
            <tr for-each="user of users">
              <td bind-value="user.id"></td>
              <td bind-value="user.name"></td>
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
      expect(firstRowCells[0].textContent).toBe('1')
      expect(firstRowCells[1].textContent).toBe('Alice')
    })

    it('should access parent viewModel properties', () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-value="prefix"></span>
          <span bind-value="item.text"></span>
        </div>
      `

      const viewModel = {
        prefix: 'Item:',
        items: [{ text: 'First' }, { text: 'Second' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const divs = container.querySelectorAll('div')
      expect(divs[0].querySelectorAll('span')[0].textContent).toBe('Item:')
      expect(divs[0].querySelectorAll('span')[1].textContent).toBe('First')
      expect(divs[1].querySelectorAll('span')[0].textContent).toBe('Item:')
      expect(divs[1].querySelectorAll('span')[1].textContent).toBe('Second')
    })

    it('should support if binding on same element as for-each', () => {
      container.innerHTML = `
        <ul>
          <li for-each="item of items" if="item.visible">
            <span bind-value="item.text"></span>
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
          <option for-each="tipo of tipos" bind-value="tipo.descripcion"></option>
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
      expect(options[0].textContent).toBe('Tipo A')
      expect(options[1].textContent).toBe('Tipo B')
      expect(options[2].textContent).toBe('Tipo C')
    })

    it('should support multiple bindings on same element as for-each', () => {
      container.innerHTML = `
        <div>
          <span for-each="item of items" if="item.visible" bind-value="item.text" bind-class="item.className"></span>
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
      expect(spans[0].textContent).toBe('First')
      expect(spans[0].className).toBe('highlight')

      expect(spans[1].style.display).toBe('none')
      expect(spans[1].textContent).toBe('Second')

      expect(spans[2].style.display).not.toBe('none')
      expect(spans[2].textContent).toBe('Third')
      expect(spans[2].className).toBe('highlight')
    })

    it('should support index with nested bindings in repeated template', () => {
      container.innerHTML = `
        <div for-each="(item, index) of items">
          <span bind-value="index"></span>
          <span if="item.visible" bind-value="item.text"></span>
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

      const divs = container.querySelectorAll('div')
      expect(divs).toHaveLength(2)
      expect(divs[0].querySelectorAll('span')[0].textContent).toBe('0')
      expect(divs[0].querySelectorAll('span')[1].textContent).toBe('Visible')
      expect(divs[0].querySelectorAll('span')[1].style.display).not.toBe('none')
      expect(divs[1].querySelectorAll('span')[0].textContent).toBe('1')
      expect(divs[1].querySelectorAll('span')[1].textContent).toBe('Hidden')
      expect(divs[1].querySelectorAll('span')[1].style.display).toBe('none')
    })

    it('should ignore writes to index and restore real index on next render', () => {
      container.innerHTML = `
        <div for-each="(item, index) of items">
          <input class="idx-input" bind-value="index" />
          <span class="idx-text" bind-value="index"></span>
          <span class="item-text" bind-value="item.text"></span>
        </div>
      `

      const viewModel = {
        items: [{ text: 'A' }, { text: 'B' }],
      }

      const bindings = setupForEachBindings(container, viewModel)
      renderForEachBindings(bindings, viewModel)

      const firstInput = container.querySelectorAll<HTMLInputElement>('.idx-input')[0]
      expect(firstInput.value).toBe('0')

      firstInput.value = '999'
      firstInput.dispatchEvent(new Event('input', { bubbles: true }))

      renderForEachBindings(bindings, viewModel)

      const idxInputs = container.querySelectorAll<HTMLInputElement>('.idx-input')
      const idxTexts = container.querySelectorAll('.idx-text')
      const itemTexts = container.querySelectorAll('.item-text')

      expect(idxInputs[0].value).toBe('0')
      expect(idxInputs[1].value).toBe('1')
      expect(idxTexts[0].textContent).toBe('0')
      expect(idxTexts[1].textContent).toBe('1')
      expect(itemTexts[0].textContent).toBe('A')
      expect(itemTexts[1].textContent).toBe('B')
    })

    it('should prioritize for-each index scope over parent property with same name', () => {
      container.innerHTML = `
        <span id="outside" bind-value="i"></span>
        <div for-each="(item, i) of items">
          <span class="inside-index" bind-value="i"></span>
          <span class="inside-item" bind-value="item.text"></span>
        </div>
      `

      const viewModel = {
        i: 999,
        items: [{ text: 'A' }, { text: 'B' }],
      }

      const render = setupBindings(container, viewModel)

      expect(container.querySelector('#outside')?.textContent).toBe('999')
      expect(container.querySelectorAll('.inside-index')[0].textContent).toBe('0')
      expect(container.querySelectorAll('.inside-index')[1].textContent).toBe('1')

      viewModel.items.unshift({ text: 'Z' })
      render('items')

      const insideIndexes = container.querySelectorAll('.inside-index')
      const insideItems = container.querySelectorAll('.inside-item')

      expect(container.querySelector('#outside')?.textContent).toBe('999')
      expect(insideIndexes[0].textContent).toBe('0')
      expect(insideIndexes[1].textContent).toBe('1')
      expect(insideIndexes[2].textContent).toBe('2')
      expect(insideItems[0].textContent).toBe('Z')
      expect(insideItems[1].textContent).toBe('A')
      expect(insideItems[2].textContent).toBe('B')
    })

    it('should work with select and option elements', () => {
      container.innerHTML = `
        <select>
          <option for-each="tipo of tipos" bind-value="tipo.descripcion"></option>
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
      expect(options?.[0].textContent).toBe('Opción 1')
      expect(options?.[1].textContent).toBe('Opción 2')
      expect(options?.[2].textContent).toBe('Opción 3')
    })
  })
})
