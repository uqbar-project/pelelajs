const assert = require('node:assert')
const {
  getCurrentAttributeName,
  isInsideTag,
  isStartingTag,
  getAttributeValueMatch,
  findForEachInElement,
  parseForEachExpression,
  parsePropertyPath,
} = require('../../src/parsers/documentParser')

describe('documentParser', () => {
  describe('getCurrentAttributeName', () => {
    it('debería extraer el nombre del atributo antes del cursor en un atributo con comillas', () => {
      const result = getCurrentAttributeName('<div bind-value="test', 21)
      assert.strictEqual(result, 'bind-value')
    })

    it('debería retornar null si no hay atributo antes del cursor', () => {
      const result = getCurrentAttributeName('<div ', 5)
      assert.strictEqual(result, null)
    })

    it('debería extraer atributos con guiones', () => {
      const result = getCurrentAttributeName('<div bind-class="active', 23)
      assert.strictEqual(result, 'bind-class')
    })

    it('debería manejar espacios alrededor del signo igual', () => {
      const result = getCurrentAttributeName('<div click = "handler', 21)
      assert.strictEqual(result, 'click')
    })
  })

  describe('isInsideTag', () => {
    it('debería retornar true si está dentro de un tag', () => {
      const result = isInsideTag('<div ')
      assert.strictEqual(result, true)
    })

    it('debería retornar true si está dentro de un tag con atributos', () => {
      const result = isInsideTag('<div class="test" ')
      assert.strictEqual(result, true)
    })

    it('debería retornar false si no está dentro de un tag', () => {
      const result = isInsideTag('some text')
      assert.strictEqual(result, false)
    })

    it('debería retornar false si el tag está cerrado', () => {
      const result = isInsideTag('<div>some text')
      assert.strictEqual(result, false)
    })
  })

  describe('isStartingTag', () => {
    it('debería retornar true al comenzar un tag', () => {
      const result = isStartingTag('<d')
      assert.strictEqual(result, true)
    })

    it('debería retornar true con un tag completo sin cerrar', () => {
      const result = isStartingTag('<div')
      assert.strictEqual(result, true)
    })

    it('debería retornar false si hay un espacio después del nombre del tag', () => {
      const result = isStartingTag('<div ')
      assert.strictEqual(result, false)
    })

    it('debería retornar false si no está en un tag', () => {
      const result = isStartingTag('texto normal')
      assert.strictEqual(result, false)
    })
  })

  describe('getAttributeValueMatch', () => {
    it('debería extraer el valor del atributo antes del cursor', () => {
      const result = getAttributeValueMatch('bind-value="test.prop')
      assert.strictEqual(result, 'test.prop')
    })

    it('debería retornar null si no hay valor de atributo', () => {
      const result = getAttributeValueMatch('<div bind-value')
      assert.strictEqual(result, null)
    })

    it('debería manejar valores vacíos', () => {
      const result = getAttributeValueMatch('bind-value="')
      assert.strictEqual(result, '')
    })

    it('debería manejar espacios alrededor del signo igual', () => {
      const result = getAttributeValueMatch('bind-value = "test')
      assert.strictEqual(result, 'test')
    })
  })

  describe('parseForEachExpression', () => {
    it('debería parsear una expresión for-each válida', () => {
      const result = parseForEachExpression('for-each="item of items"')
      assert.deepStrictEqual(result, {
        itemName: 'item',
        collectionName: 'items',
      })
    })

    it('debería parsear con comillas simples', () => {
      const result = parseForEachExpression("for-each='product of products'")
      assert.deepStrictEqual(result, {
        itemName: 'product',
        collectionName: 'products',
      })
    })

    it('debería parsear la sintaxis con índice', () => {
      const result = parseForEachExpression('for-each="(item, index) of items"')
      assert.deepStrictEqual(result, {
        itemName: 'item',
        indexName: 'index',
        collectionName: 'items',
      })
    })

    it('debería parsear la sintaxis con índice personalizado', () => {
      const result = parseForEachExpression("for-each='(user, i) of users'")
      assert.deepStrictEqual(result, {
        itemName: 'user',
        indexName: 'i',
        collectionName: 'users',
      })
    })

    it('debería retornar null si la expresión es inválida', () => {
      const result = parseForEachExpression('for-each="invalid"')
      assert.strictEqual(result, null)
    })

    it('debería retornar null si la expresión con índice es inválida', () => {
      const result = parseForEachExpression('for-each="(item index) of items"')
      assert.strictEqual(result, null)
    })

    it('debería manejar espacios extra', () => {
      const result = parseForEachExpression('for-each="item of items"')
      assert.deepStrictEqual(result, {
        itemName: 'item',
        collectionName: 'items',
      })
    })
  })

  describe('findForEachInElement', () => {
    it('debería encontrar for-each con índice e incluir posiciones', () => {
      const lines = [
        '<div>',
        '  <span for-each="(item, idx) of items" bind-value="item.name"></span>',
        '</div>',
      ]
      const fakeDocument = {
        lineAt(index) {
          return { text: lines[index] }
        },
      }

      const result = findForEachInElement(fakeDocument, 1)
      assert.strictEqual(result.itemName, 'item')
      assert.strictEqual(result.indexName, 'idx')
      assert.strictEqual(result.collectionName, 'items')
      assert.strictEqual(result.line, 1)
      assert.ok(typeof result.itemPos === 'number')
      assert.ok(typeof result.indexPos === 'number')
    })

    it('debería encontrar for-each sin índice manteniendo compatibilidad', () => {
      const lines = [
        '<div>',
        '  <span for-each="item of items" bind-value="item.name"></span>',
        '</div>',
      ]
      const fakeDocument = {
        lineAt(index) {
          return { text: lines[index] }
        },
      }

      const result = findForEachInElement(fakeDocument, 1)
      assert.strictEqual(result.itemName, 'item')
      assert.strictEqual(result.collectionName, 'items')
      assert.strictEqual(result.indexName, undefined)
      assert.strictEqual(result.indexPos, undefined)
    })

    it('debería calcular itemPos dentro del valor de for-each y no en otros atributos', () => {
      const lines = [
        '<div>',
        '  <span class="item" for-each="(item, index) of items" bind-value="item.name"></span>',
        '</div>',
      ]
      const fakeDocument = {
        lineAt(index) {
          return { text: lines[index] }
        },
      }

      const result = findForEachInElement(fakeDocument, 1)
      const classItemPos = lines[1].indexOf('item')
      assert.ok(typeof result.itemPos === 'number')
      assert.ok(result.itemPos > classItemPos)
      assert.strictEqual(lines[1].slice(result.itemPos, result.itemPos + 4), 'item')
    })

    it('debería calcular indexPos dentro del valor de for-each aunque exista index en atributos previos', () => {
      const lines = [
        '<div>',
        '  <span data-index="index" for-each="(item, index) of items" bind-value="index"></span>',
        '</div>',
      ]
      const fakeDocument = {
        lineAt(index) {
          return { text: lines[index] }
        },
      }

      const result = findForEachInElement(fakeDocument, 1)
      const dataIndexPos = lines[1].indexOf('index')
      assert.ok(typeof result.indexPos === 'number')
      assert.ok(result.indexPos > dataIndexPos)
      assert.strictEqual(lines[1].slice(result.indexPos, result.indexPos + 5), 'index')
    })

    it('debería calcular posiciones correctamente con for-each entre comillas simples', () => {
      const lines = [
        '<div>',
        "  <span class='item' for-each='(item, idx) of items' bind-value='item.name'></span>",
        '</div>',
      ]
      const fakeDocument = {
        lineAt(index) {
          return { text: lines[index] }
        },
      }

      const result = findForEachInElement(fakeDocument, 1)
      assert.strictEqual(result.itemName, 'item')
      assert.strictEqual(result.indexName, 'idx')
      assert.strictEqual(lines[1].slice(result.itemPos, result.itemPos + 4), 'item')
      assert.strictEqual(lines[1].slice(result.indexPos, result.indexPos + 3), 'idx')
    })
  })

  describe('parsePropertyPath', () => {
    it('debería parsear un path simple con punto al final', () => {
      const result = parsePropertyPath('user.')
      assert.deepStrictEqual(result, ['user'])
    })

    it('debería parsear un path anidado', () => {
      const result = parsePropertyPath('user.address.')
      assert.deepStrictEqual(result, ['user', 'address'])
    })

    it('debería parsear un path profundamente anidado', () => {
      const result = parsePropertyPath('user.address.street.')
      assert.deepStrictEqual(result, ['user', 'address', 'street'])
    })

    it('debería retornar null si no termina con punto', () => {
      const result = parsePropertyPath('user')
      assert.strictEqual(result, null)
    })

    it('debería retornar null para string vacío', () => {
      const result = parsePropertyPath('')
      assert.strictEqual(result, null)
    })
  })
})
