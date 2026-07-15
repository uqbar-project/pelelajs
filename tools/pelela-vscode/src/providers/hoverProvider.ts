import * as vscode from 'vscode'
import { t } from '../i18n/index'

const ATTRIBUTE_HELP: Record<string, string> = {
  'view-model': t('hover.viewModelHelp'),
  click: t('hover.clickHelp'),
  enter: t('hover.enterHelp'),
  if: t('hover.ifHelp'),
  'for-each': t('hover.forEachHelp'),
  index: t('hover.indexHelp'),
  'bind-alt': t('hover.bindAltHelp'),
  'bind-class': t('hover.bindClassHelp'),
  'bind-content': t('hover.bindContentHelp'),
  'bind-enabled': t('hover.bindEnabledHelp'),
  'bind-src': t('hover.bindSrcHelp'),
  'bind-style': t('hover.bindStyleHelp'),
  'bind-value': t('hover.bindValueHelp'),
  'prop-': t('hover.propHelp'),
  'link-': t('hover.linkHelp'),
  'const-': t('hover.constHelp'),
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
