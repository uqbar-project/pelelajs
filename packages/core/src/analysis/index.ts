import * as ts from 'typescript'
import { isNumberLiteral, parseBooleanLiteral } from '../commons/typeCasting'
import { ViewModelSourceNotFoundError } from '../errors/ViewModelSourceNotFoundError'
import type { ConstKind, ConstTypeInfo, ScalarKind } from '../types'

export type { ConstKind, ConstTypeInfo, ScalarKind } from '../types'

export interface ViewModelModuleAnalysis {
  exportedNames: string[] | null
  declaredNames: string[]
  classNames: string[]
  functionNames: string[]
}

export type ViewModelPropertyTypes = Record<string, ConstKind | ConstTypeInfo>

const UNAUTHORIZED_PROPERTY_NAMES = new Set(['__proto__', 'constructor', 'prototype'])

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

function unique<T>(values: T[]): T[] {
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

/**
 * Suggests a view model class name from the module itself instead of guessing
 * from the file name. There is a confident suggestion only when the module
 * exports exactly one class.
 */
export function suggestViewModelClassName(analysis: ViewModelModuleAnalysis): string {
  const exportedNames = analysis.exportedNames
  if (exportedNames === null) {
    return ''
  }
  const exportedClasses = analysis.classNames.filter((className) =>
    exportedNames.includes(className),
  )
  return exportedClasses.length === 1 ? exportedClasses[0] : ''
}

/**
 * A resolved TypeScript program plus the checker and entry source file needed to
 * read view model property types.
 */
export interface ViewModelProgramContext {
  program: ts.Program
  checker: ts.TypeChecker
  sourceFile: ts.SourceFile
}

const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
}

export function resolveCompilerOptions(searchPath: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(searchPath, ts.sys.fileExists)
  if (configPath === undefined) return DEFAULT_COMPILER_OPTIONS

  const parsedConfig = ts.getParsedCommandLineOfConfigFile(configPath, undefined, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: () => undefined,
  })

  // A file that fails to parse yields no usable option besides the file path
  // itself, so it falls back to the defaults instead of an empty program.
  const declaredKeys =
    parsedConfig === undefined
      ? []
      : Object.keys(parsedConfig.options).filter((key) => key !== 'configFilePath')
  if (parsedConfig === undefined || declaredKeys.length === 0) return DEFAULT_COMPILER_OPTIONS
  return parsedConfig.options
}

export function createViewModelProgramContext(tsPath: string): ViewModelProgramContext {
  const program = ts.createProgram([tsPath], resolveCompilerOptions(tsPath))
  const sourceFile = program.getSourceFile(tsPath)

  if (sourceFile === undefined) {
    throw new ViewModelSourceNotFoundError({ tsPath })
  }

  return { program, checker: program.getTypeChecker(), sourceFile }
}

export function createViewModelProgramContextFromProgram(
  program: ts.Program,
  tsPath: string,
): ViewModelProgramContext {
  const sourceFile = program.getSourceFile(tsPath)
  if (sourceFile === undefined) {
    throw new ViewModelSourceNotFoundError({ tsPath })
  }
  return { program, checker: program.getTypeChecker(), sourceFile }
}

function isNullishType(type: ts.Type): boolean {
  const nullishFlags = ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void
  return (type.flags & nullishFlags) !== 0
}

/**
 * Maps a resolved type onto the const kind Pelela can coerce a `const-*`
 * attribute value into. `any` and `unknown` are deliberately `unknown`: the
 * runtime falls back to `typeof target` when the declared kind is unknown.
 */
export function classifyType(type: ts.Type): ConstKind {
  if (isNullishType(type)) return 'unknown'

  if (type.isUnion()) {
    const distinctKinds = unique(
      type.types.filter((member) => !isNullishType(member)).map(classifyType),
    )
    if (distinctKinds.length === 0) return 'unknown'
    if (distinctKinds.includes('other')) return 'other'
    return distinctKinds.length === 1 ? distinctKinds[0] : 'unknown'
  }

  if (type.flags & ts.TypeFlags.Any) return 'unknown'
  if (type.flags & ts.TypeFlags.Unknown) return 'unknown'

  if (type.flags & ts.TypeFlags.StringLike) return 'string'
  if (type.flags & ts.TypeFlags.NumberLike) return 'number'
  if (type.flags & ts.TypeFlags.BooleanLike) return 'boolean'

  return 'other'
}

/**
 * Coercion priority for heterogeneous scalar unions. Numbers and booleans only
 * match their literal shape, so they are tried before strings: `const-value="42"`
 * on a `number | string` property stays numeric instead of collapsing into text.
 */
const SCALAR_KIND_ORDER: ScalarKind[] = ['number', 'boolean', 'string']

function orderScalarKinds(kinds: ScalarKind[]): ScalarKind[] {
  return [...kinds].sort(
    (left, right) => SCALAR_KIND_ORDER.indexOf(left) - SCALAR_KIND_ORDER.indexOf(right),
  )
}

/**
 * Canonical value order following the coercion priority. The checker does not
 * preserve declaration order across different type flags (intrinsics come
 * first), so sorting here keeps `typeMap` payloads and error messages stable.
 */
function orderAllowedValues(
  values: Array<string | number | boolean>,
): Array<string | number | boolean> {
  return unique(values).sort(
    (left, right) =>
      SCALAR_KIND_ORDER.indexOf(getScalarKindOfLiteralValue(left)) -
      SCALAR_KIND_ORDER.indexOf(getScalarKindOfLiteralValue(right)),
  )
}

function getScalarKindOfLiteralValue(value: string | number | boolean): ScalarKind {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'string'
}

function getLiteralValue(
  type: ts.Type,
  checker: ts.TypeChecker,
): string | number | boolean | undefined {
  if (isEnumLiteralMember(type)) return undefined
  if ((type.flags & ts.TypeFlags.StringLiteral) !== 0) {
    return (type as ts.StringLiteralType).value
  }
  if ((type.flags & ts.TypeFlags.NumberLiteral) !== 0) {
    return (type as ts.NumberLiteralType).value
  }
  if ((type.flags & ts.TypeFlags.BooleanLiteral) !== 0) {
    return checker.typeToString(type) === 'true'
  }
  return undefined
}

/**
 * Enum members keep their coarse kind on purpose: their literal values stay a
 * completion and diagnostic concern (`checkConstValue`), not a `typeMap`
 * payload. Collapsing them here keeps every enum consumer unchanged.
 */
function isEnumLiteralMember(type: ts.Type): boolean {
  return type.symbol !== undefined && (type.symbol.flags & ts.SymbolFlags.EnumMember) !== 0
}

function isScalarKind(kind: ConstKind): kind is ScalarKind {
  return kind === 'number' || kind === 'boolean' || kind === 'string'
}

/**
 * TypeScript models `boolean` as the union of its two literals, so a plain
 * boolean property would otherwise look like a literal union. Enumerating both
 * values adds no information and would serialize every boolean as a descriptor,
 * so the full pair collapses back to its coarse kind. A lone `true` or `false`
 * literal keeps its `allowedValues`.
 */
function isFullBooleanPair(values: Array<string | number | boolean>): boolean {
  return values.length === 2 && values.includes(true) && values.includes(false)
}

function describeUnionMembers(
  members: readonly ts.Type[],
  checker: ts.TypeChecker,
): ConstKind | ConstTypeInfo {
  const literalValues = members.map((member) => getLiteralValue(member, checker))
  const definedValues = literalValues.filter(
    (value): value is string | number | boolean => value !== undefined,
  )
  if (definedValues.length === members.length) {
    const literalKinds = orderScalarKinds(unique(definedValues.map(getScalarKindOfLiteralValue)))
    if (literalKinds.length === 1) {
      if (isFullBooleanPair(unique(definedValues))) return 'boolean'
      return { kind: literalKinds[0], allowedValues: orderAllowedValues(definedValues) }
    }
    return {
      kind: 'unknown',
      allowedKinds: literalKinds,
      allowedValues: orderAllowedValues(definedValues),
    }
  }

  const distinctKinds = unique(members.map(classifyType))
  if (distinctKinds.includes('other')) return 'other'
  if (distinctKinds.length === 1) return distinctKinds[0]
  // TypeScript absorbs `any` and `unknown` in unions and nullish members are
  // filtered above, so a mixed remainder can only hold scalar kinds.
  return { kind: 'unknown', allowedKinds: orderScalarKinds(distinctKinds.filter(isScalarKind)) }
}

/**
 * Describes a resolved type with the serializable detail the runtime needs to
 * validate a `const-*` attribute. Plain kinds stay plain `ConstKind` strings so
 * existing `typeMap` payloads keep working; only unions that `classifyType`
 * would collapse carry `allowedKinds` or `allowedValues`. Truly unknown types
 * (`any`, `unknown`) stay bare `unknown` so the runtime keeps falling back to
 * `typeof target`.
 */
export function describeConstType(
  type: ts.Type,
  checker: ts.TypeChecker,
): ConstKind | ConstTypeInfo {
  if (type.isUnion()) {
    const members = type.types.filter((member) => !isNullishType(member))
    if (members.length === 0) return 'unknown'
    return describeUnionMembers(members, checker)
  }

  const literalValue = getLiteralValue(type, checker)
  if (literalValue !== undefined) {
    return { kind: getScalarKindOfLiteralValue(literalValue), allowedValues: [literalValue] }
  }
  return classifyType(type)
}

const SCALAR_TYPE_FLAGS =
  ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BooleanLike

/**
 * True when the type is a scalar or a union made only of scalars. Structural
 * types, generics and unsupported primitives are not scalars, which is what
 * tells a literal mismatch apart from a type no const attribute can satisfy.
 */
function isScalarType(type: ts.Type): boolean {
  if (isNullishType(type)) return true
  if (type.isUnion()) return type.types.every(isScalarType)
  return Boolean(type.flags & SCALAR_TYPE_FLAGS)
}

function isRestrictedMemberSymbol(symbol: ts.Symbol): boolean {
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
  if (declaration === undefined) return true

  // biome-ignore lint/suspicious/noUnnecessaryConditions: ts.canHaveModifiers is a compiler-API type guard; Biome's type checker models it as always falsy (false positive)
  const modifiers = ts.canHaveModifiers(declaration) ? ts.getModifiers(declaration) : undefined
  const isRestrictedAccess = modifiers?.some(
    (modifier) =>
      modifier.kind === ts.SyntaxKind.PrivateKeyword ||
      modifier.kind === ts.SyntaxKind.ProtectedKeyword,
  )
  if (isRestrictedAccess === true) return true

  return (ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Static) !== 0
}

/**
 * Only property-like members can be set from a `const-*` attribute. Methods
 * are symbols on the class type too, so they are excluded explicitly.
 */
function isPropertyLikeSymbol(symbol: ts.Symbol): boolean {
  if ((symbol.flags & ts.SymbolFlags.Method) !== 0) return false

  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
  if (declaration === undefined) return false

  return (
    ts.isPropertyDeclaration(declaration) ||
    ts.isGetAccessorDeclaration(declaration) ||
    ts.isSetAccessorDeclaration(declaration) ||
    ts.isParameter(declaration) ||
    ts.isPropertySignature(declaration)
  )
}

function getTypeOfPropertySymbol(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Type {
  const setterDeclaration = symbol.declarations?.find(ts.isSetAccessorDeclaration)
  const setterParameter = setterDeclaration?.parameters[0]
  return setterParameter === undefined
    ? checker.getTypeOfSymbol(symbol)
    : checker.getTypeAtLocation(setterParameter)
}

function getViewModelClassDeclaration(
  sourceFile: ts.SourceFile,
  className: string,
): ts.ClassDeclaration | undefined {
  return findClassInStatements(sourceFile.statements, className.split('.'))
}

function getViewModelClassType(
  context: ViewModelProgramContext,
  className: string,
): ts.Type | undefined {
  const localDeclaration = getViewModelClassDeclaration(context.sourceFile, className)
  if (localDeclaration !== undefined) {
    return context.checker.getTypeAtLocation(localDeclaration)
  }

  const moduleSymbol = context.checker.getSymbolAtLocation(context.sourceFile)
  if (moduleSymbol === undefined) return undefined

  const exportSymbol = context.checker
    .getExportsOfModule(moduleSymbol)
    .find((symbol) => symbol.getName() === className)
  if (exportSymbol === undefined) return undefined

  const classSymbol =
    exportSymbol.flags & ts.SymbolFlags.Alias
      ? context.checker.getAliasedSymbol(exportSymbol)
      : exportSymbol
  const classDeclaration = classSymbol.declarations?.find(ts.isClassDeclaration)
  return classDeclaration === undefined
    ? undefined
    : context.checker.getTypeAtLocation(classDeclaration)
}

function findClassInStatements(
  statements: readonly ts.Statement[],
  namePath: string[],
): ts.ClassDeclaration | undefined {
  const [head, ...tail] = namePath
  const statement = statements.find(
    (candidate) =>
      (ts.isClassDeclaration(candidate) || ts.isModuleDeclaration(candidate)) &&
      candidate.name?.text === head,
  )
  if (statement === undefined) return undefined
  if (tail.length === 0) return ts.isClassDeclaration(statement) ? statement : undefined
  if (!ts.isModuleDeclaration(statement)) return undefined

  const body = statement.body
  if (body === undefined || !ts.isModuleBlock(body)) return undefined
  return findClassInStatements(body.statements, tail)
}

function isCollectablePropertySymbol(symbol: ts.Symbol): boolean {
  if (UNAUTHORIZED_PROPERTY_NAMES.has(symbol.getName())) return false
  if (isRestrictedMemberSymbol(symbol)) return false
  return isPropertyLikeSymbol(symbol)
}

/**
 * Collects the declared type of every settable member of a view model class,
 * including members inherited from base classes in other modules.
 */
export function collectViewModelPropertyTypes(
  context: ViewModelProgramContext,
  className: string,
): Map<string, ts.Type> {
  const classType = getViewModelClassType(context, className)
  if (classType === undefined) return new Map<string, ts.Type>()

  return new Map(
    context.checker
      .getPropertiesOfType(classType)
      .filter(isCollectablePropertySymbol)
      .map(
        (symbol) => [symbol.getName(), getTypeOfPropertySymbol(symbol, context.checker)] as const,
      ),
  )
}

function getCollectablePropertyType(
  context: ViewModelProgramContext,
  className: string,
  propertyName: string,
): ts.Type | undefined {
  const classType = getViewModelClassType(context, className)
  if (classType === undefined) return undefined
  const propertySymbol = context.checker.getPropertyOfType(classType, propertyName)
  if (propertySymbol === undefined || !isCollectablePropertySymbol(propertySymbol)) {
    return undefined
  }

  return getTypeOfPropertySymbol(propertySymbol, context.checker)
}

/**
 * Returns properties that can accept a const attribute. Unknown types are kept
 * because the checker cannot determine whether a value is valid for them.
 */
export function extractConstValueCompletionPropertiesWithContext(
  context: ViewModelProgramContext,
  className: string,
): string[] {
  return Array.from(collectViewModelPropertyTypes(context, className))
    .filter(([, type]) => classifyType(type) === 'unknown' || isScalarType(type))
    .map(([name]) => name)
}

export function extractViewModelPropertyTypesWithContext(
  context: ViewModelProgramContext,
  className: string,
): ViewModelPropertyTypes {
  const propertyTypes = collectViewModelPropertyTypes(context, className)
  const describedTypes = Array.from(propertyTypes, ([name, type]) => [
    name,
    describeConstType(type, context.checker),
  ])
  return Object.fromEntries(describedTypes)
}

export function extractViewModelPropertyTypes(
  tsPath: string,
  className: string,
): ViewModelPropertyTypes {
  const context = createViewModelProgramContext(tsPath)
  return extractViewModelPropertyTypesWithContext(context, className)
}

/**
 * `unchecked` means the declared type carries no information a const attribute
 * can be validated against, so no diagnostic should be produced.
 */
export type ConstValueVerdict =
  | { accepted: true }
  // The declared type carries the reason, not the attribute value, so the
  // diagnostic points at the type instead of blaming the value that was passed.
  | { accepted: false; reason: 'nonLiteralType'; declaredTypeText: string }
  | { accepted: false; reason: 'literalMismatch'; expectedTypeText: string }
  | { accepted: 'unchecked' }

export interface ConstValueCheckParams {
  context: ViewModelProgramContext
  className: string
  propertyName: string
  rawValue: string
}

/**
 * String and numeric enum members are nominal types: a string enum member is
 * not the string literal it holds, so the checker rejects `Level.High` for the
 * attribute value `"high"`. At runtime a string enum member is that string and
 * the attribute assigns it directly, so the member types have to be offered as
 * candidates or every valid enum value becomes a false positive.
 */
function findEnumDeclaration(type: ts.Type): ts.EnumDeclaration | null {
  const candidates = type.isUnion() ? type.types : [type]
  const declarations = candidates.map(
    (candidate) => (candidate.aliasSymbol ?? candidate.getSymbol())?.valueDeclaration,
  )

  const enumRelated = declarations.find(
    (declaration) =>
      declaration !== undefined &&
      (ts.isEnumDeclaration(declaration) || ts.isEnumMember(declaration)),
  )
  if (enumRelated === undefined) return null

  return ts.isEnumDeclaration(enumRelated) ? enumRelated : enumRelated.parent
}

function collectEnumMembers(type: ts.Type): ts.EnumMember[] {
  const declaration = findEnumDeclaration(type)
  return declaration === null ? [] : Array.from(declaration.members)
}

function enumMemberLiteral(member: ts.EnumMember): { text: string; isString: boolean } | null {
  const initializer = member.initializer as ts.Expression | undefined
  if (initializer === undefined) return null

  // biome-ignore lint/suspicious/noUnnecessaryConditions: enum members are initialised with literal expressions, and this compiler API type guard is a real runtime check that Biome's type model cannot represent
  if (ts.isNumericLiteral(initializer)) return { text: initializer.text, isString: false }
  if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
    return { text: initializer.text, isString: true }
  }
  return null
}

function enumMemberTypesMatching(
  rawValue: string,
  type: ts.Type,
  checker: ts.TypeChecker,
): ts.Type[] {
  return collectEnumMembers(type)
    .filter((member) => enumMemberLiteral(member)?.text === rawValue)
    .map((member) => checker.getTypeAtLocation(member))
}

/**
 * Every type the raw attribute text could stand for. Attribute values are always
 * strings in a template, so `const-count="5"` must be offered to the checker as
 * the number literal 5 as well as the string "5".
 */
function candidateTypes(rawValue: string, type: ts.Type, checker: ts.TypeChecker): ts.Type[] {
  const candidates: ts.Type[] = [checker.getStringLiteralType(rawValue)]

  if (isNumberLiteral(rawValue)) {
    candidates.push(checker.getNumberLiteralType(Number(rawValue)))
  }

  const booleanLiteral = parseBooleanLiteral(rawValue.trim())
  if (booleanLiteral !== null) {
    candidates.push(booleanLiteral ? checker.getTrueType() : checker.getFalseType())
  }

  candidates.push(...enumMemberTypesMatching(rawValue, type, checker))

  return candidates
}

function toTypeText(type: ts.Type, checker: ts.TypeChecker): string {
  const enumValues = collectEnumMembers(type).flatMap((member) => {
    const literal = enumMemberLiteral(member)
    if (literal === null) return []
    return [literal.isString ? `"${literal.text}"` : literal.text]
  })
  if (enumValues.length > 0) return unique(enumValues).join(' | ')

  return checker.typeToString(type, undefined, ts.TypeFormatFlags.InTypeAlias)
}

export function checkConstValue(params: ConstValueCheckParams): ConstValueVerdict {
  const { context, className, propertyName, rawValue } = params
  const propertyType = getCollectablePropertyType(context, className, propertyName)

  if (propertyType === undefined) return { accepted: 'unchecked' }
  if (classifyType(propertyType) === 'unknown') return { accepted: 'unchecked' }
  if (!isScalarType(propertyType)) {
    return {
      accepted: false,
      reason: 'nonLiteralType',
      declaredTypeText: toTypeText(propertyType, context.checker),
    }
  }

  const isAssignable = candidateTypes(rawValue, propertyType, context.checker).some((candidate) =>
    context.checker.isTypeAssignableTo(candidate, propertyType),
  )
  if (isAssignable) return { accepted: true }

  return {
    accepted: false,
    reason: 'literalMismatch',
    expectedTypeText: toTypeText(propertyType, context.checker),
  }
}
