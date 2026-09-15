import * as ts from 'typescript'
import type { ConstKind } from '../types'

export interface ViewModelModuleAnalysis {
  exportedNames: string[] | null
  declaredNames: string[]
  classNames: string[]
  functionNames: string[]
}

export type ViewModelPropertyTypes = Record<string, ConstKind>

const UNAUTHORIZED_PROPERTY_NAMES = new Set(['__proto__', 'constructor', 'prototype'])

const NULLABLE_KEYWORDS = new Set([ts.SyntaxKind.NullKeyword, ts.SyntaxKind.UndefinedKeyword])

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
  // biome-ignore lint/suspicious/noUnnecessaryConditions: ts.canHaveModifiers is a compiler-API type guard; Biome's type checker models it as always falsy (false positive)
  const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined
  return modifiers?.some((modifier) => modifier.kind === kind) ?? false
}

function getStatementExport(statement: ts.Statement): StatementExport {
  if (ts.isExportDeclaration(statement)) {
    if (statement.isTypeOnly) {
      return { hasReExport: false, names: [] }
    }
    if (statement.exportClause === undefined) {
      return { hasReExport: true, names: [] }
    }
    if (ts.isNamedExports(statement.exportClause)) {
      return {
        hasReExport: false,
        names: statement.exportClause.elements
          .filter((specifier) => !specifier.isTypeOnly)
          .map((specifier) => specifier.name.text),
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

function getFunctionNames(statement: ts.Statement): string[] {
  if (ts.isFunctionDeclaration(statement)) {
    return statement.name === undefined ? [] : [statement.name.text]
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .filter(
        (declaration) =>
          declaration.initializer !== undefined &&
          (ts.isArrowFunction(declaration.initializer) ||
            ts.isFunctionExpression(declaration.initializer)),
      )
      .map((declaration) => declaration.name)
      .filter(ts.isIdentifier)
      .map((identifier) => identifier.text)
  }
  return []
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
  const functionNames = unique(sourceFile.statements.flatMap(getFunctionNames))
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

function getMemberDeclarationName(node: { name?: ts.DeclarationName }): string | null {
  const name = node.name
  return name !== undefined && ts.isIdentifier(name) ? name.text : null
}

function unwrapConstExpression(expression: ts.Expression): ts.Expression {
  let currentExpression = expression
  while (
    ts.isParenthesizedExpression(currentExpression) ||
    ts.isAsExpression(currentExpression) ||
    ts.isTypeAssertionExpression(currentExpression) ||
    ts.isSatisfiesExpression(currentExpression) ||
    ts.isNonNullExpression(currentExpression)
  ) {
    currentExpression = currentExpression.expression
  }
  return currentExpression
}

function getConstKindFromTypeNode(typeNode: ts.TypeNode): ConstKind {
  if (typeNode.kind === ts.SyntaxKind.UnionType) {
    const unionNode = typeNode as ts.UnionTypeNode
    const nonNullMembers = unionNode.types.filter(
      (unionMember) => !NULLABLE_KEYWORDS.has(unionMember.kind),
    )
    if (nonNullMembers.length === 0) return 'unknown'
    return getConstKindFromTypeNode(nonNullMembers[0])
  }

  switch (typeNode.kind) {
    case ts.SyntaxKind.NumberKeyword:
      return 'number'
    case ts.SyntaxKind.BooleanKeyword:
      return 'boolean'
    case ts.SyntaxKind.StringKeyword:
      return 'string'
    default:
      return 'other'
  }
}

function getConstKindFromExpression(expression: ts.Expression): ConstKind {
  const unwrapped = unwrapConstExpression(expression)
  if (unwrapped.kind === ts.SyntaxKind.NumericLiteral) return 'number'
  if (ts.isStringLiteral(unwrapped)) return 'string'
  if (
    unwrapped.kind === ts.SyntaxKind.TrueKeyword ||
    unwrapped.kind === ts.SyntaxKind.FalseKeyword
  ) {
    return 'boolean'
  }
  if (
    ts.isPrefixUnaryExpression(unwrapped) &&
    unwrapped.operator === ts.SyntaxKind.MinusToken &&
    unwrapped.operand.kind === ts.SyntaxKind.NumericLiteral
  ) {
    return 'number'
  }
  if (
    ts.isObjectLiteralExpression(unwrapped) ||
    ts.isArrayLiteralExpression(unwrapped) ||
    ts.isNewExpression(unwrapped)
  ) {
    return 'other'
  }
  return 'unknown'
}

function getConstKindFromDeclaration(
  typeNode: ts.TypeNode | undefined,
  initializer: ts.Expression | undefined,
): ConstKind {
  if (typeNode !== undefined) {
    const typeKind = getConstKindFromTypeNode(typeNode)
    if (typeKind !== 'unknown') return typeKind
  }
  if (initializer !== undefined) return getConstKindFromExpression(initializer)
  return 'unknown'
}

function getConstKindFromGetter(getter: ts.GetAccessorDeclaration): ConstKind {
  if (getter.type !== undefined) {
    const typeKind = getConstKindFromTypeNode(getter.type)
    if (typeKind !== 'unknown') return typeKind
  }
  const returnStatement = getter.body?.statements.find(
    (statement): statement is ts.ReturnStatement => ts.isReturnStatement(statement),
  )
  if (returnStatement?.expression !== undefined) {
    return getConstKindFromExpression(returnStatement.expression)
  }
  return 'unknown'
}

function isStaticMember(classMember: ts.ClassElement): boolean {
  return (ts.getCombinedModifierFlags(classMember) & ts.ModifierFlags.Static) !== 0
}

function hasRestrictedAccessModifier(
  modifiers: ts.NodeArray<ts.ModifierLike> | undefined,
): boolean {
  return (
    modifiers?.some(
      (modifier) =>
        modifier.kind === ts.SyntaxKind.PrivateKeyword ||
        modifier.kind === ts.SyntaxKind.ProtectedKeyword,
    ) ?? false
  )
}

function isParameterProperty(parameter: ts.ParameterDeclaration): boolean {
  return (
    parameter.modifiers?.some(
      (modifier) =>
        modifier.kind === ts.SyntaxKind.PublicKeyword ||
        modifier.kind === ts.SyntaxKind.ProtectedKeyword ||
        modifier.kind === ts.SyntaxKind.PrivateKeyword ||
        modifier.kind === ts.SyntaxKind.ReadonlyKeyword,
    ) ?? false
  )
}

function getParameterPropertyTypes(classDeclaration: ts.ClassDeclaration): ViewModelPropertyTypes {
  const constructorDeclaration = classDeclaration.members.find(
    (member): member is ts.ConstructorDeclaration => ts.isConstructorDeclaration(member),
  )
  if (constructorDeclaration === undefined) return {}

  const result: ViewModelPropertyTypes = {}
  constructorDeclaration.parameters.forEach((parameter) => {
    const name = getMemberDeclarationName(parameter)
    if (name === null || !isParameterProperty(parameter)) return
    if (hasRestrictedAccessModifier(parameter.modifiers)) return
    if (!UNAUTHORIZED_PROPERTY_NAMES.has(name)) {
      result[name] =
        parameter.type === undefined ? 'unknown' : getConstKindFromTypeNode(parameter.type)
    }
  })
  return result
}

function getOwnPropertyTypes(classDeclaration: ts.ClassDeclaration): ViewModelPropertyTypes {
  const result: ViewModelPropertyTypes = {}

  const assignType = (name: string, kind: ConstKind): void => {
    if (!UNAUTHORIZED_PROPERTY_NAMES.has(name)) {
      result[name] = kind
    }
  }

  classDeclaration.members.forEach((classMember) => {
    if (isStaticMember(classMember)) return
    const name = getMemberDeclarationName(classMember)
    if (name === null) return

    if (ts.isPropertyDeclaration(classMember)) {
      if (hasRestrictedAccessModifier(classMember.modifiers)) return
      assignType(name, getConstKindFromDeclaration(classMember.type, classMember.initializer))
    } else if (ts.isGetAccessorDeclaration(classMember)) {
      if (hasRestrictedAccessModifier(classMember.modifiers)) return
      assignType(name, getConstKindFromGetter(classMember))
    }
  })

  return { ...result, ...getParameterPropertyTypes(classDeclaration) }
}

function getClassDeclaration(
  sourceFile: ts.SourceFile,
  className: string,
): ts.ClassDeclaration | undefined {
  return sourceFile.statements.find(
    (statement): statement is ts.ClassDeclaration =>
      ts.isClassDeclaration(statement) && statement.name?.text === className,
  )
}

function getExtendsClassName(classDeclaration: ts.ClassDeclaration): string | null {
  const extendsClause = classDeclaration.heritageClauses?.find(
    (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
  )
  const baseType = extendsClause?.types[0]
  if (baseType === undefined) return null
  if (ts.isIdentifier(baseType.expression)) return baseType.expression.text
  if (ts.isPropertyAccessExpression(baseType.expression)) return baseType.expression.name.text
  return null
}

function collectViewModelPropertyTypes(
  sourceFile: ts.SourceFile,
  className: string,
  visited: Set<string>,
): ViewModelPropertyTypes {
  const classDeclaration = getClassDeclaration(sourceFile, className)
  if (classDeclaration === undefined || visited.has(className)) return {}

  visited.add(className)
  const baseClassName = getExtendsClassName(classDeclaration)
  const baseTypes =
    baseClassName === null ? {} : collectViewModelPropertyTypes(sourceFile, baseClassName, visited)

  return { ...baseTypes, ...getOwnPropertyTypes(classDeclaration) }
}

export function extractViewModelPropertyTypes(
  tsSource: string,
  className: string,
): ViewModelPropertyTypes {
  const sourceFile = ts.createSourceFile('viewModel.ts', tsSource, ts.ScriptTarget.Latest, true)
  return collectViewModelPropertyTypes(sourceFile, className, new Set<string>())
}
