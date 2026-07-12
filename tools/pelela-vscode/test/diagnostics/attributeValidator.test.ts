import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import * as vscode from 'vscode'
import {
  validateTagRestrictions,
  validateUnknownAttributes,
} from '../../src/diagnostics/attributeValidator'
import { scanDocument } from '../../src/diagnostics/scanDocument'
import type { TagInfo } from '../../src/diagnostics/types'
import { t } from '../../src/i18n/index'
import { assertDiagnostic, createMockDocument } from './testHelpers'

function prepareTags(lines: string[]): TagInfo[] {
  const document = createMockDocument(lines)
  return scanDocument(document)
}

describe('attributeValidator', () => {
  describe('validateUnknownAttributes', () => {
    it('allows standard HTML attribute', () => {
      const tags = prepareTags(['<div id="main">'])
      assert.strictEqual(validateUnknownAttributes(tags).length, 0)
    })

    it('allows Pelela attribute', () => {
      const tags = prepareTags(['<div bind-content="name">'])
      assert.strictEqual(validateUnknownAttributes(tags).length, 0)
    })

    it('allows Pelela prefix-based attributes', () => {
      const tags = prepareTags([
        '<div prop-title="hello">',
        '<div link-value="world">',
        '<div const-foo="bar">',
      ])
      assert.strictEqual(validateUnknownAttributes(tags).length, 0)
    })

    it('allows data-* attribute', () => {
      const tags = prepareTags(['<div data-custom="value">'])
      assert.strictEqual(validateUnknownAttributes(tags).length, 0)
    })

    it('allows aria-* attribute', () => {
      const tags = prepareTags(['<div aria-label="close">'])
      assert.strictEqual(validateUnknownAttributes(tags).length, 0)
    })

    it('flags unknown attribute as Warning severity', () => {
      const tags = prepareTags(['<div foo="bar">'])
      const diagnostics = validateUnknownAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.unknownAttribute', { name: 'foo' }),
        vscode.DiagnosticSeverity.Warning
      )
    })

    it('flags multiple unknown attributes on the same tag', () => {
      const tags = prepareTags(['<div foo="bar" baz="qux">'])
      const diagnostics = validateUnknownAttributes(tags)
      assert.strictEqual(diagnostics.length, 2)
    })

    it('ignores standard attributes when unknown ones are present', () => {
      const tags = prepareTags(['<div id="main" foo="bar">'])
      const diagnostics = validateUnknownAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.unknownAttribute', { name: 'foo' }),
        vscode.DiagnosticSeverity.Warning
      )
    })
  })

  describe('validateTagRestrictions', () => {
    it('allows prefix-based attributes on any tag', () => {
      const tags = prepareTags([
        '<custom-element prop-title="hello" link-value="world" const-foo="bar">',
      ])
      assert.strictEqual(validateTagRestrictions(tags).length, 0)
    })

    it('allows bind-alt on img', () => {
      const tags = prepareTags(['<img bind-alt="description">'])
      assert.strictEqual(validateTagRestrictions(tags).length, 0)
    })

    it('rejects bind-alt on div', () => {
      const tags = prepareTags(['<div bind-alt="description">'])
      const diagnostics = validateTagRestrictions(tags)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.attributeNotAllowed', { name: 'bind-alt', tag: 'div' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('allows bind-src on img', () => {
      const tags = prepareTags(['<img bind-src="imageUrl">'])
      assert.strictEqual(validateTagRestrictions(tags).length, 0)
    })

    it('rejects bind-src on div', () => {
      const tags = prepareTags(['<div bind-src="imageUrl">'])
      const diagnostics = validateTagRestrictions(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('allows enter on input', () => {
      const tags = prepareTags(['<input enter="handleEnter">'])
      assert.strictEqual(validateTagRestrictions(tags).length, 0)
    })

    it('rejects enter on div', () => {
      const tags = prepareTags(['<div enter="handleEnter">'])
      const diagnostics = validateTagRestrictions(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('allows view-model on pelela', () => {
      const tags = prepareTags(['<pelela view-model="App">'])
      assert.strictEqual(validateTagRestrictions(tags).length, 0)
    })

    it('rejects view-model on div', () => {
      const tags = prepareTags(['<div view-model="App">'])
      const diagnostics = validateTagRestrictions(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('allows bind-enabled on input', () => {
      const tags = prepareTags(['<input bind-enabled="isEnabled">'])
      assert.strictEqual(validateTagRestrictions(tags).length, 0)
    })

    it('rejects bind-enabled on div', () => {
      const tags = prepareTags(['<div bind-enabled="isEnabled">'])
      const diagnostics = validateTagRestrictions(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('allows bind-value on input', () => {
      const tags = prepareTags(['<input bind-value="name">'])
      assert.strictEqual(validateTagRestrictions(tags).length, 0)
    })

    it('rejects bind-value on div', () => {
      const tags = prepareTags(['<div bind-value="name">'])
      const diagnostics = validateTagRestrictions(tags)
      assert.strictEqual(diagnostics.length, 1)
    })
  })
})
