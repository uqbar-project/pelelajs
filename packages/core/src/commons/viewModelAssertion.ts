import { type DeclaredAs, ViewModelExportError } from '../errors/ViewModelExportError'

const RUNTIME_TS_FILE_PATH = 'runtime'
const UNKNOWN_VIEW_MODEL_NAME = 'Unknown'

export function getNonClassDeclaredAs(creator: unknown): DeclaredAs | undefined {
  if (typeof creator !== 'function') {
    return 'Object'
  }
  if (/^\s*class\b/.test(Function.prototype.toString.call(creator))) {
    return undefined
  }
  return 'Function'
}

/**
 * Fails fast when a value registered or routed as a view model is not a class.
 * Missing names fall back to "Unknown" and runtime-only values to "runtime",
 * mirroring the values defineComponent already reported.
 */
export function assertViewModelIsClass(
  creator: unknown,
  viewModelName = UNKNOWN_VIEW_MODEL_NAME,
  tsFilePath = RUNTIME_TS_FILE_PATH,
): void {
  const declaredAs = getNonClassDeclaredAs(creator)
  if (declaredAs !== undefined) {
    throw new ViewModelExportError({
      kind: 'notAClass',
      viewModelName,
      tsFilePath,
      declaredAs,
    })
  }
}
