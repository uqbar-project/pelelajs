import * as ts from 'typescript'

export interface ViewModelModuleAnalysis {
  exportedNames: string[] | null
  declaredNames: string[]
  classNames: string[]
  functionNames: string[]
}

export type DeclaredAs = 'Function' | 'Object'

export type ViewModelIssue =
  | { kind: 'ok' }
  | { kind: 'missingExport'; viewModelName: string }
  | { kind: 'wrongCase'; viewModelName: string; expectedName: string }
  | { kind: 'notFound'; viewModelName: string; suggestedName: string }
  | { kind: 'notAClass'; viewModelName: string; declaredAs: DeclaredAs }

export interface StatementExport {
  hasReExport: boolean
  names: string[]
}

function getDeclarationNames(statement: ts.Statement): string[] {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .map((declaration) => declaration.name)
      .filter(ts.isIdentifier)
      .map((identifier) => identifier.text)
  }

  const isNamedDeclaration =
    ts.isClassDeclaration(statement) ||
    ts.isFunctionDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  const declaredName = isNamedDeclaration ? statement.name?.text : undefined

  return declaredName ? [declaredName] : []
}

function hasModifier(statement: ts.Statement, kind: ts.SyntaxKind): boolean {
  const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined
  return modifiers?.some((modifier) => modifier.kind === kind) ?? false
}

function getStatementExport(statement: ts.Statement): StatementExport {
  if (ts.isExportDeclaration(statement)) {
    if (statement.exportClause === undefined) {
      return { hasReExport: true, names: [] }
    }
    if (ts.isNamedExports(statement.exportClause)) {
      return {
        hasReExport: false,
        names: statement.exportClause.elements.map((specifier) => specifier.name.text),
      }
    }
    return { hasReExport: false, names: [] }
  }

  if (
    hasModifier(statement, ts.SyntaxKind.ExportKeyword) &&
    !hasModifier(statement, ts.SyntaxKind.DefaultKeyword)
  ) {
    return { hasReExport: false, names: getDeclarationNames(statement) }
  }

  return { hasReExport: false, names: [] }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function getClassName(statement: ts.Statement): string | undefined {
  return ts.isClassDeclaration(statement) ? statement.name?.text : undefined
}

function getFunctionName(statement: ts.Statement): string | undefined {
  return ts.isFunctionDeclaration(statement) ? statement.name?.text : undefined
}

export function analyzeViewModelModule(tsSource: string): ViewModelModuleAnalysis {
  const sourceFile = ts.createSourceFile('viewModel.ts', tsSource, ts.ScriptTarget.Latest, true)
  const statementExports = sourceFile.statements.map(getStatementExport)

  const declaredNames = unique(sourceFile.statements.flatMap(getDeclarationNames))
  const classNames = unique(
    sourceFile.statements.flatMap((statement) => {
      const className = getClassName(statement)
      return className ? [className] : []
    }),
  )
  const functionNames = unique(
    sourceFile.statements.flatMap((statement) => {
      const functionName = getFunctionName(statement)
      return functionName ? [functionName] : []
    }),
  )
  const hasReExport = statementExports.some((statementExport) => statementExport.hasReExport)
  const exportedNames = hasReExport
    ? []
    : unique(statementExports.flatMap((statementExport) => statementExport.names))

  return {
    exportedNames: hasReExport ? null : exportedNames,
    declaredNames,
    classNames,
    functionNames,
  }
}

export function pascalCaseFromFileName(fileName: string): string {
  const camelCaseName = fileName.replace(/[-.]([a-z])/g, (_, letter: string) =>
    letter.toUpperCase(),
  )
  return camelCaseName.length === 0
    ? camelCaseName
    : camelCaseName[0].toUpperCase() + camelCaseName.slice(1)
}

export function classifyViewModelIssue(
  analysis: ViewModelModuleAnalysis,
  viewModelName: string,
  suggestedName: string,
): ViewModelIssue {
  if (analysis.exportedNames === null || analysis.exportedNames.includes(viewModelName)) {
    const isDeclaredAsNonClass =
      analysis.declaredNames.includes(viewModelName) && !analysis.classNames.includes(viewModelName)
    if (isDeclaredAsNonClass) {
      const declaredAs = analysis.functionNames.includes(viewModelName) ? 'Function' : 'Object'
      return { kind: 'notAClass', viewModelName, declaredAs }
    }
    return { kind: 'ok' }
  }

  if (analysis.declaredNames.includes(viewModelName)) {
    return { kind: 'missingExport', viewModelName }
  }

  const caseInsensitiveExport = analysis.exportedNames.find(
    (exportedName) => exportedName.toLowerCase() === viewModelName.toLowerCase(),
  )
  if (caseInsensitiveExport) {
    return { kind: 'wrongCase', viewModelName, expectedName: caseInsensitiveExport }
  }

  const hasCaseInsensitiveDeclaration = analysis.declaredNames.some(
    (declaredName) => declaredName.toLowerCase() === viewModelName.toLowerCase(),
  )
  if (hasCaseInsensitiveDeclaration) {
    return { kind: 'missingExport', viewModelName }
  }

  return { kind: 'notFound', viewModelName, suggestedName }
}
