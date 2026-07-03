import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import * as vscode from 'vscode'
import { provideHover } from '../../src/providers/hoverProvider'

function mockDocument(attributeName: string): vscode.TextDocument {
  const lineText = `<div ${attributeName}="value">`
  return {
    lineAt: (_line: number) => ({ text: lineText }),
    getText: (_range?: vscode.Range) => attributeName,
    getWordRangeAtPosition: (_position: vscode.Position) =>
      new vscode.Range(
        new vscode.Position(0, lineText.indexOf(attributeName)),
        new vscode.Position(0, lineText.indexOf(attributeName) + attributeName.length)
      ),
  } as unknown as vscode.TextDocument
}

const mockToken = { isCancellationRequested: false } as vscode.CancellationToken

describe('hoverProvider', () => {
  it('should show help for index attribute', () => {
    const result = provideHover(mockDocument('index'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(
      result.contents,
      'Pelela: specifies the index variable name in a for-each loop'
    )
  })

  it('should show help for prop- attributes', () => {
    const result = provideHover(mockDocument('prop-producto'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(
      result.contents,
      'Pelela: one-way binding to pass data to a child component (parent → child)'
    )
  })

  it('should show help for link- attributes', () => {
    const result = provideHover(mockDocument('link-valor'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(
      result.contents,
      'Pelela: two-way binding between parent and child component (parent ↔ child)'
    )
  })

  it('should show help for const- attributes', () => {
    const result = provideHover(mockDocument('const-total'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, 'Pelela: constant value binding to a child component')
  })

  it('should return null for unknown attributes', () => {
    const result = provideHover(mockDocument('bind-content'), new vscode.Position(0, 0), mockToken)
    assert.strictEqual(result, null)
  })

  it('should return null when no word is found', () => {
    const document = {
      getWordRangeAtPosition: () => undefined,
      getText: () => '',
    } as unknown as vscode.TextDocument

    const result = provideHover(document, new vscode.Position(0, 0), mockToken)
    assert.strictEqual(result, null)
  })
})
