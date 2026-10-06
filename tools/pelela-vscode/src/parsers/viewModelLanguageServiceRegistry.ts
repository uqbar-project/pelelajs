import * as vscode from 'vscode'
import { ViewModelLanguageService } from './viewModelLanguageService'

/**
 * The language service must outlive a single validation pass, otherwise every
 * call pays to reload the standard library and the amortization is lost.
 */
let sharedService: ViewModelLanguageService | null = null

function resolveWorkspaceRoot(): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  return workspaceFolder?.uri.fsPath ?? process.cwd()
}

export function acquireViewModelLanguageService(): ViewModelLanguageService {
  sharedService ??= new ViewModelLanguageService(resolveWorkspaceRoot())
  return sharedService
}

export function invalidateViewModelLanguageService(tsPath: string): void {
  sharedService?.invalidate(tsPath)
}

export function disposeViewModelLanguageService(): void {
  sharedService?.dispose()
  sharedService = null
}
