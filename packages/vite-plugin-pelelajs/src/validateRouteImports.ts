import { ViewModelExportError } from 'pelelajs'
import {
  analyzeViewModelModule,
  classifyViewModelIssue,
  suggestViewModelClassName,
} from 'pelelajs/analysis'
import * as ts from 'typescript'

export interface ResolvedRouteImport {
  tsPath: string
  tsSource: string
}

export interface ValidateRouteImportsParams {
  sourceCode: string
  filePath: string
  resolveFile: (importSpecifier: string, fromFilePath: string) => ResolvedRouteImport | null
  errorFn: (error: ViewModelExportError) => void
}

interface ImportedReference {
  importedName: string
  moduleSpecifier: string
}

function extractReferencesFromImport(statement: ts.Statement): ImportedReference[] {
  // biome-ignore lint/suspicious/noUnnecessaryConditions: ts.isImportDeclaration is a compiler-API type guard; Biome's type checker models it as always falsy (false positive)
  if (!ts.isImportDeclaration(statement)) {
    return []
  }
  const importClause = statement.importClause
  if (importClause === undefined || importClause.isTypeOnly) {
    return []
  }
  const namedBindings = importClause.namedBindings
  // biome-ignore lint/suspicious/noUnnecessaryConditions: ts.isNamedImports is a compiler-API type guard; Biome's type checker models it as always falsy (false positive)
  if (namedBindings === undefined || !ts.isNamedImports(namedBindings)) {
    return []
  }
  if (!ts.isStringLiteral(statement.moduleSpecifier)) {
    return []
  }
  const moduleSpecifier = statement.moduleSpecifier.text
  return namedBindings.elements
    .filter((element) => !element.isTypeOnly)
    .map((element) => ({
      // The name looked up in the target module is the original export
      // (propertyName when aliased), never the local alias.
      importedName: element.propertyName?.text ?? element.name.text,
      moduleSpecifier,
    }))
}

function reportImportIssue(
  reference: ImportedReference,
  resolution: ResolvedRouteImport,
  errorFn: (error: ViewModelExportError) => void,
): void {
  const analysis = analyzeViewModelModule(resolution.tsSource)
  const issue = classifyViewModelIssue(
    analysis,
    reference.importedName,
    suggestViewModelClassName(analysis),
  )
  if (issue.kind === 'ok' || issue.kind === 'notAClass') {
    return
  }
  const tsFilePath = resolution.tsPath.replace(/^\.\//, '')
  errorFn(new ViewModelExportError({ ...issue, tsFilePath }))
}

/**
 * Fails fast on view-model imports that would break the browser ESM graph
 * before the router runs. Non-class declarations import fine and reach the
 * router, whose runtime guard reports them on Pelela's error page instead.
 * Unresolvable specifiers are left to Vite and TypeScript.
 */
export function validateRouteImports(params: ValidateRouteImportsParams): void {
  const { sourceCode, filePath, resolveFile, errorFn } = params
  const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true)

  sourceFile.statements
    .flatMap(extractReferencesFromImport)
    .map((reference) => ({
      reference,
      resolution: resolveFile(reference.moduleSpecifier, filePath),
    }))
    .filter(
      (item): item is { reference: ImportedReference; resolution: ResolvedRouteImport } =>
        item.resolution !== null,
    )
    .forEach(({ reference, resolution }) => {
      reportImportIssue(reference, resolution, errorFn)
    })
}
