import * as assert from 'node:assert'
import * as vscode from 'vscode'

export function createMockDocument(lines: string[], uriPath?: string): vscode.TextDocument {
  return {
    lineCount: lines.length,
    lineAt: (lineIndex: number) => ({ text: lines[lineIndex] }),
    uri: vscode.Uri.file(uriPath ?? 'test.pelela'),
    languageId: 'pelela',
  } as unknown as vscode.TextDocument
}

export function assertDiagnostic(
  diagnostic: vscode.Diagnostic,
  expectedMessage: string,
  expectedSeverity: vscode.DiagnosticSeverity
): void {
  assert.strictEqual(diagnostic.message, expectedMessage)
  assert.strictEqual(diagnostic.severity, expectedSeverity)
}
