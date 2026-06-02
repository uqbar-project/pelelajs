import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import * as vscode from 'vscode'
import { addPelelaAttributeCompletions } from '../../src/providers/completionProvider'

describe('completionProvider - Pelela Attributes', () => {
  it('should return correct CompletionItem for "const-*" attributes', () => {
    const items: vscode.CompletionItem[] = []
    addPelelaAttributeCompletions(items)

    const constItem = items.find((item) => item.label === 'const-')
    assert.ok(constItem, 'const- completion item should exist')

    // Verify insertText
    assert.ok(constItem.insertText instanceof vscode.SnippetString)
    assert.strictEqual(
      (constItem.insertText as vscode.SnippetString).value,
      // biome-ignore lint/suspicious/noTemplateCurlyInString: VSCode snippet syntax
      'const-${1:field-name}="${2:value}"'
    )

    // Verify detail
    assert.strictEqual(constItem.detail, 'Pelela: valor constante para un componente')

    // Verify sortText
    assert.ok(
      constItem.sortText?.startsWith('!0_'),
      `sortText should start with !0_, but was ${constItem.sortText}`
    )
    assert.strictEqual(constItem.sortText, '!0_const-')
  })
})
