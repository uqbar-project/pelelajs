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
    it('should return 0 for a line with balanced braces', () => {
      assert.strictEqual(calculateBraceDepth('{ }'), 0)
      assert.strictEqual(calculateBraceDepth('{{ }}'), 0)
    })

    it('should return a positive number for extra opening braces', () => {
      assert.strictEqual(calculateBraceDepth('{'), 1)
      assert.strictEqual(calculateBraceDepth('{{'), 2)
      assert.strictEqual(calculateBraceDepth('{{ }'), 1)
    })

    it('should return a negative number for extra closing braces', () => {
      assert.strictEqual(calculateBraceDepth('}'), -1)
      assert.strictEqual(calculateBraceDepth('}}'), -2)
      assert.strictEqual(calculateBraceDepth('{ }}'), -1)
    })

    it('should return 0 if there are no braces', () => {
      assert.strictEqual(calculateBraceDepth('export class MyClass'), 0)
    })
  })

  describe('isInterfaceDeclaration', () => {
    it('should return true for valid interface declarations', () => {
      assert.ok(isInterfaceDeclaration('interface MyInterface'))
      assert.ok(isInterfaceDeclaration('export interface MyInterface'))
      assert.ok(isInterfaceDeclaration('  interface MyInterface'))
    })

    it('should return false for other declarations', () => {
      assert.strictEqual(isInterfaceDeclaration('class MyClass'), false)
      assert.strictEqual(isInterfaceDeclaration('const interfaceName = "..."'), false)
    })
  })

  describe('isClassDeclaration', () => {
    it('should return true for valid class declarations', () => {
      assert.ok(isClassDeclaration('class MyClass'))
      assert.ok(isClassDeclaration('export class MyClass'))
      assert.ok(isClassDeclaration('  class MyClass'))
    })

    it('should return false for other declarations', () => {
      assert.strictEqual(isClassDeclaration('interface MyInterface'), false)
      assert.strictEqual(isClassDeclaration('const className = "..."'), false)
    })
  })

  describe('isObjectLiteralStart', () => {
    it('should return true if it contains an assignment or colon and an opening brace', () => {
      assert.ok(isObjectLiteralStart('prop = {'))
      assert.ok(isObjectLiteralStart('prop: {'))
      assert.ok(isObjectLiteralStart('  nested: {'))
    })

    it('should return false if the conditions are not met', () => {
      assert.strictEqual(isObjectLiteralStart('prop = 5'), false)
      assert.strictEqual(isObjectLiteralStart('class MyClass {'), false) // Has neither : nor =
    })
  })

  describe('findMemberMatch', () => {
    it('should detect simple properties', () => {
      const match = findMemberMatch('  public name: string')
      assert.ok(match)
      assert.strictEqual(match?.name, 'name')
      assert.strictEqual(match?.type, 'property')
    })

    it('should detect private properties', () => {
      const match = findMemberMatch('  private _id = 1')
      assert.ok(match)
      assert.strictEqual(match?.name, '_id')
      assert.strictEqual(match?.type, 'property')
    })

    it('should detect getters as properties', () => {
      const match = findMemberMatch('  get fullName() {')
      assert.ok(match)
      assert.strictEqual(match?.name, 'fullName')
      assert.strictEqual(match?.type, 'property')
    })

    it('should detect methods', () => {
      const match = findMemberMatch('  save(data: any) {')
      assert.ok(match)
      assert.strictEqual(match?.name, 'save')
      assert.strictEqual(match?.type, 'method')
    })

    it('should ignore constructors', () => {
      const match = findMemberMatch('  constructor() {')
      assert.strictEqual(match, null)
    })

    it('should ignore keywords like if', () => {
      const match = findMemberMatch('  if (condition) {')
      assert.strictEqual(match, null)
    })

    it('should return null for lines that are not members', () => {
      assert.strictEqual(findMemberMatch('import { something } from "somewhere"'), null)
      assert.strictEqual(findMemberMatch('  return this.name'), null)
    })
  })
})
