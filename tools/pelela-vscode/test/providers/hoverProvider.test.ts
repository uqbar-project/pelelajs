import * as assert from 'node:assert'
import { describe, it } from 'mocha'
import * as vscode from 'vscode'
import { t } from '../../src/i18n/index'
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
  it('should show help for view-model attribute', () => {
    const result = provideHover(mockDocument('view-model'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.viewModelHelp'))
  })

  it('should show help for click attribute', () => {
    const result = provideHover(mockDocument('click'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.clickHelp'))
  })

  it('should show help for enter attribute', () => {
    const result = provideHover(mockDocument('enter'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.enterHelp'))
  })

  it('should show help for if attribute', () => {
    const result = provideHover(mockDocument('if'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.ifHelp'))
  })

  it('should show help for for-each attribute', () => {
    const result = provideHover(mockDocument('for-each'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.forEachHelp'))
  })

  it('should show help for index attribute', () => {
    const result = provideHover(mockDocument('index'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.indexHelp'))
  })

  it('should show help for bind-alt attribute', () => {
    const result = provideHover(mockDocument('bind-alt'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.bindAltHelp'))
  })

  it('should show help for bind-class attribute', () => {
    const result = provideHover(mockDocument('bind-class'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.bindClassHelp'))
  })

  it('should show help for bind-content attribute', () => {
    const result = provideHover(mockDocument('bind-content'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.bindContentHelp'))
  })

  it('should show help for bind-enabled attribute', () => {
    const result = provideHover(mockDocument('bind-enabled'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.bindEnabledHelp'))
  })

  it('should show help for bind-src attribute', () => {
    const result = provideHover(mockDocument('bind-src'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.bindSrcHelp'))
  })

  it('should show help for bind-style attribute', () => {
    const result = provideHover(mockDocument('bind-style'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.bindStyleHelp'))
  })

  it('should show help for bind-value attribute', () => {
    const result = provideHover(mockDocument('bind-value'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.bindValueHelp'))
  })

  it('should show help for prop- attributes', () => {
    const result = provideHover(mockDocument('prop-producto'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.propHelp'))
  })

  it('should show help for link- attributes', () => {
    const result = provideHover(mockDocument('link-valor'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.linkHelp'))
  })

  it('should show help for const- attributes', () => {
    const result = provideHover(mockDocument('const-total'), new vscode.Position(0, 0), mockToken)
    assert.ok(result instanceof vscode.Hover)
    assert.strictEqual(result.contents, t('hover.constHelp'))
  })

  it('should return null for unknown attributes', () => {
    const result = provideHover(mockDocument('unknownAttr'), new vscode.Position(0, 0), mockToken)
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
