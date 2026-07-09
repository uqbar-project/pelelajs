import * as vscode from 'vscode'
import { t } from '../i18n/index'

export function makeDiagnostic(
  range: vscode.Range,
  messageKey: string,
  params: Record<string, string>,
  severity: vscode.DiagnosticSeverity
): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(range, t(messageKey, params), severity)
  diagnostic.source = 'pelela'
  return diagnostic
}
