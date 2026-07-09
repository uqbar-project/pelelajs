import * as vscode from 'vscode'
import { t } from '../i18n/index'
import type { TranslationSchema } from '../i18n/translationSchema'

type DiagnosticMessageKey = `diagnostics.${keyof TranslationSchema['diagnostics']}`

export function makeDiagnostic(
  range: vscode.Range,
  messageKey: DiagnosticMessageKey,
  params: Record<string, string>,
  severity: vscode.DiagnosticSeverity
): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(range, t(messageKey, params), severity)
  diagnostic.source = 'pelela'
  return diagnostic
}
