import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import * as vscode from 'vscode'
import {
  validateComponentAttributes,
  validateTagRestrictions,
  validateUnknownAttributes,
} from '../../src/diagnostics/attributeValidator'
import { scanDocument } from '../../src/diagnostics/scanDocument'
import type { TagInfo } from '../../src/diagnostics/types'
import { t } from '../../src/i18n/index'
import { assertDiagnostic, createMockDocument } from './testHelpers'

// Multi-line tags use an array of strings (one element per line) instead of
// backtick template literals because createMockDocument maps lineAt(i) to
// each array element. A single multi-line string would set lineCount=1,
// breaking mock consumers that iterate by line (e.g. findForEachInElement).

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

    it('allows on-* event handler attribute', () => {
      const tags = prepareTags(['<div onclick="handler">'])
      assert.strictEqual(validateUnknownAttributes(tags).length, 0)
    })

    it('allows colspan', () => {
      const tags = prepareTags(['<td colspan="2">'])
      assert.strictEqual(validateUnknownAttributes(tags).length, 0)
    })

    it('allows controls', () => {
      const tags = prepareTags(['<video controls>'])
      assert.strictEqual(validateUnknownAttributes(tags).length, 0)
    })

    it('allows method', () => {
      const tags = prepareTags(['<form method="POST">'])
      assert.strictEqual(validateUnknownAttributes(tags).length, 0)
    })

    it('allows autofocus', () => {
      const tags = prepareTags(['<input autofocus>'])
      assert.strictEqual(validateUnknownAttributes(tags).length, 0)
    })

    it('allows contenteditable', () => {
      const tags = prepareTags(['<div contenteditable="true">'])
      assert.strictEqual(validateUnknownAttributes(tags).length, 0)
    })

    it('recognizes all listed attributes as valid', () => {
      const tags = prepareTags([
        '<div id="x" class="y" style="z" title="t" lang="en" dir="ltr" hidden tabindex="0" draggable="true">',
      ])
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

    it('allows known Pelela attribute on a multi-line tag', () => {
      const tags = prepareTags(['<div', '  bind-content="name">'])
      assert.strictEqual(validateUnknownAttributes(tags).length, 0)
    })

    it('flags unknown attribute on a multi-line tag', () => {
      const tags = prepareTags(['<div', '  foo="bar">'])
      const diagnostics = validateUnknownAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
      assert.strictEqual(diagnostics[0].range.start.line, 1)
      assert.strictEqual(diagnostics[0].range.start.character, 2)
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

  describe('validateComponentAttributes', () => {
    it('allows prop-* on a component tag', () => {
      const tags = prepareTags(['<person-row prop-title="hello">'])
      assert.strictEqual(validateComponentAttributes(tags).length, 0)
    })

    it('allows link-* on a component tag', () => {
      const tags = prepareTags(['<person-row link-value="world">'])
      assert.strictEqual(validateComponentAttributes(tags).length, 0)
    })

    it('allows const-* on a component tag', () => {
      const tags = prepareTags(['<person-row const-foo="bar">'])
      assert.strictEqual(validateComponentAttributes(tags).length, 0)
    })

    it('allows if on a component tag', () => {
      const tags = prepareTags(['<person-row if="condition">'])
      assert.strictEqual(validateComponentAttributes(tags).length, 0)
    })

    it('rejects class on a component tag', () => {
      const tags = prepareTags(['<person-row class="x">'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
      assertDiagnostic(
        diagnostics[0],
        t('diagnostics.invalidComponentAttribute', { name: 'class', tag: 'person-row' }),
        vscode.DiagnosticSeverity.Error
      )
    })

    it('rejects id on a component tag', () => {
      const tags = prepareTags(['<person-row id="x">'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('rejects style on a component tag', () => {
      const tags = prepareTags(['<person-row style="x">'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('rejects a bare HTML attribute on a component tag', () => {
      const tags = prepareTags(['<person-row value="x">'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('rejects a boolean HTML attribute on a component tag', () => {
      const tags = prepareTags(['<person-row disabled>'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('rejects bind-* attribute on a component tag', () => {
      const tags = prepareTags(['<person-row bind-value="x">'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('rejects data-* attribute on a component tag', () => {
      const tags = prepareTags(['<person-row data-custom="x">'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('rejects onclick attribute on a component tag', () => {
      const tags = prepareTags(['<person-row onclick="handler">'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('rejects click attribute on a component tag', () => {
      const tags = prepareTags(['<person-row click="handler">'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('rejects for-each attribute on a component tag', () => {
      const tags = prepareTags(['<person-row for-each="items">'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('rejects view-model attribute on a component tag', () => {
      const tags = prepareTags(['<person-row view-model="X">'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
    })

    it('rejects multiple invalid attributes on the same component tag', () => {
      const tags = prepareTags(['<person-row class="x" id="y" value="z">'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 3)
    })

    it('ignores standard HTML tags', () => {
      const tags = prepareTags(['<div class="x" id="y" onclick="handler">'])
      assert.strictEqual(validateComponentAttributes(tags).length, 0)
    })

    it('ignores the root pelela tag', () => {
      const tags = prepareTags(['<pelela view-model="App" class="x">'])
      assert.strictEqual(validateComponentAttributes(tags).length, 0)
    })

    it('ignores the root component tag', () => {
      const tags = prepareTags(['<component view-model="App" class="x">'])
      assert.strictEqual(validateComponentAttributes(tags).length, 0)
    })

    it('rejects invalid attrs and allows valid ones on a component tag', () => {
      const tags = prepareTags([
        '<person-row class="x" prop-title="hello" id="y" link-value="world">',
      ])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 2)
    })

    it('handles a multi-line component tag', () => {
      const tags = prepareTags(['<person-row', '  class="x">'])
      const diagnostics = validateComponentAttributes(tags)
      assert.strictEqual(diagnostics.length, 1)
      assert.strictEqual(diagnostics[0].range.start.line, 1)
      assert.strictEqual(diagnostics[0].range.start.character, 2)
    })

    it('does not produce duplicate diagnostics with validateTagRestrictions', () => {
      const tags = prepareTags(['<person-row bind-enabled="x">'])
      const componentDiags = validateComponentAttributes(tags)
      const restrictionDiags = validateTagRestrictions(tags)
      assert.strictEqual(componentDiags.length, 1)
      assert.strictEqual(restrictionDiags.length, 0)
    })
  })
})
