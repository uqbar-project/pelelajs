import * as vscode from 'vscode'

const ATTRIBUTE_HELP: Record<string, string> = {
  'prop-': 'Pelela: one-way binding to pass data to a child component (parent → child)',
  'link-': 'Pelela: two-way binding between parent and child component (parent ↔ child)',
  'const-': 'Pelela: constant value binding to a child component',
}

async function provideHover(
  document: vscode.TextDocument,
  position: vscode.Position,
  _token: vscode.CancellationToken
): Promise<vscode.Hover | null> {
  const wordRange = document.getWordRangeAtPosition(position)
  if (!wordRange) return null

  const word = document.getText(wordRange)

  for (const [prefix, helpText] of Object.entries(ATTRIBUTE_HELP)) {
    if (word.startsWith(prefix)) {
      return new vscode.Hover(helpText)
    }
  }

  return null
}

export function createHoverProvider(): vscode.Disposable {
  return vscode.languages.registerHoverProvider(
    { language: 'pelela', scheme: 'file' },
    { provideHover }
  )
}
