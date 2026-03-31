import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import {
  calculateBraceDepth,
  findMemberMatch,
  isClassDeclaration,
  isInterfaceDeclaration,
  isObjectLiteralStart,
} from '../../src/utils/parsingUtils'

describe('parsingUtils', () => {
  describe('calculateBraceDepth', () => {
    it('debería retornar 0 para una línea con llaves balanceadas', () => {
      assert.strictEqual(calculateBraceDepth('{ }'), 0)
      assert.strictEqual(calculateBraceDepth('{{ }}'), 0)
    })

    it('debería retornar un número positivo para llaves abiertas de más', () => {
      assert.strictEqual(calculateBraceDepth('{'), 1)
      assert.strictEqual(calculateBraceDepth('{{'), 2)
      assert.strictEqual(calculateBraceDepth('{{ }'), 1)
    })

    it('debería retornar un número negativo para llaves cerradas de más', () => {
      assert.strictEqual(calculateBraceDepth('}'), -1)
      assert.strictEqual(calculateBraceDepth('}}'), -2)
      assert.strictEqual(calculateBraceDepth('{ }}'), -1)
    })

    it('debería retornar 0 si no hay llaves', () => {
      assert.strictEqual(calculateBraceDepth('export class MyClass'), 0)
    })
  })

  describe('isInterfaceDeclaration', () => {
    it('debería retornar true para declaraciones de interfaz válidas', () => {
      assert.ok(isInterfaceDeclaration('interface MyInterface'))
      assert.ok(isInterfaceDeclaration('export interface MyInterface'))
      assert.ok(isInterfaceDeclaration('  interface MyInterface'))
    })

    it('debería retornar false para otras declaraciones', () => {
      assert.strictEqual(isInterfaceDeclaration('class MyClass'), false)
      assert.strictEqual(isInterfaceDeclaration('const interfaceName = "..."'), false)
    })
  })

  describe('isClassDeclaration', () => {
    it('debería retornar true para declaraciones de clase válidas', () => {
      assert.ok(isClassDeclaration('class MyClass'))
      assert.ok(isClassDeclaration('export class MyClass'))
      assert.ok(isClassDeclaration('  class MyClass'))
    })

    it('debería retornar false para otras declaraciones', () => {
      assert.strictEqual(isClassDeclaration('interface MyInterface'), false)
      assert.strictEqual(isClassDeclaration('const className = "..."'), false)
    })
  })

  describe('isObjectLiteralStart', () => {
    it('debería retornar true si contiene asignación o dos puntos y una llave de apertura', () => {
      assert.ok(isObjectLiteralStart('prop = {'))
      assert.ok(isObjectLiteralStart('prop: {'))
      assert.ok(isObjectLiteralStart('  nested: {'))
    })

    it('debería retornar false si no cumple las condiciones', () => {
      assert.strictEqual(isObjectLiteralStart('prop = 5'), false)
      assert.strictEqual(isObjectLiteralStart('class MyClass {'), false) // No tiene : ni =
    })
  })

  describe('findMemberMatch', () => {
    it('debería detectar propiedades simples', () => {
      const match = findMemberMatch('  public name: string')
      assert.ok(match)
      assert.strictEqual(match?.name, 'name')
      assert.strictEqual(match?.type, 'property')
    })

    it('debería detectar propiedades privadas', () => {
      const match = findMemberMatch('  private _id = 1')
      assert.ok(match)
      assert.strictEqual(match?.name, '_id')
      assert.strictEqual(match?.type, 'property')
    })

    it('debería detectar getters como propiedades', () => {
      const match = findMemberMatch('  get fullName() {')
      assert.ok(match)
      assert.strictEqual(match?.name, 'fullName')
      assert.strictEqual(match?.type, 'property')
    })

    it('debería detectar métodos', () => {
      const match = findMemberMatch('  save(data: any) {')
      assert.ok(match)
      assert.strictEqual(match?.name, 'save')
      assert.strictEqual(match?.type, 'method')
    })

    it('debería ignorar constructores', () => {
      const match = findMemberMatch('  constructor() {')
      assert.strictEqual(match, null)
    })

    it('debería ignorar palabras clave como if', () => {
      const match = findMemberMatch('  if (condition) {')
      assert.strictEqual(match, null)
    })

    it('debería retornar null para líneas que no son miembros', () => {
      assert.strictEqual(findMemberMatch('import { something } from "somewhere"'), null)
      assert.strictEqual(findMemberMatch('  return this.name'), null)
    })
  })
})
