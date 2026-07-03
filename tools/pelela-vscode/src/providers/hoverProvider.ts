import * as vscode from 'vscode'

const ATTRIBUTE_HELP: Record<string, string> = {
  'prop-': 'Pelela: one-way binding to pass data to a child component (parent → child)',
  'link-': 'Pelela: two-way binding between parent and child component (parent ↔ child)',
  'const-': 'Pelela: constant value binding to a child component',
  index: 'Pelela: specifies the index variable name in a for-each loop',
}

export function provideHover(
  document: vscode.TextDocument,
  position: vscode.Position,
  _token: vscode.CancellationToken
): vscode.Hover | null {
  const wordRange = document.getWordRangeAtPosition(position)
  if (!wordRange) return null

  const word = document.getText(wordRange)

  const match = Object.entries(ATTRIBUTE_HELP).find(([prefix]) => word.startsWith(prefix))
  if (!match) return null

  return new vscode.Hover(match[1])
}

export function createHoverProvider(): vscode.Disposable {
  return vscode.languages.registerHoverProvider(
    { language: 'pelela', scheme: 'file' },
    { provideHover }
  )
}
