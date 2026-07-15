import * as fs from 'node:fs'
import * as path from 'node:path'
import * as ts from 'typescript'

export interface ViewModelMembers {
  properties: string[]
  methods: string[]
}

interface SourceFileCacheEntry {
  sourceFile: ts.SourceFile
  mtimeMs: number
}

const sourceFileCache = new Map<string, SourceFileCacheEntry>()

function getCachedSourceFile(filePath: string): ts.SourceFile {
  try {
    const stats = fs.statSync(filePath)
    const cacheEntry = sourceFileCache.get(filePath)

    if (cacheEntry && cacheEntry.mtimeMs === stats.mtimeMs) {
      return cacheEntry.sourceFile
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)
    sourceFileCache.set(filePath, { sourceFile, mtimeMs: stats.mtimeMs })
    return sourceFile
  } catch {
    sourceFileCache.delete(filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)
  }
}

function getDeclarationName(node: { name?: ts.DeclarationName }): string | null {
  const declarationName = node.name
  if (!declarationName) return null
  if (ts.isIdentifier(declarationName)) return declarationName.text
  return null
}

function isRelevantMember(classMember: ts.ClassElement): boolean {
  return (
    ts.isPropertyDeclaration(classMember) ||
    ts.isGetAccessor(classMember) ||
    ts.isMethodDeclaration(classMember)
  )
}

function isStaticMember(classMember: ts.ClassElement): boolean {
  return (ts.getCombinedModifierFlags(classMember) & ts.ModifierFlags.Static) !== 0
}

function getMemberInfo(
  classMember: ts.ClassElement
): { name: string; kind: 'property' | 'method' } | null {
  const name = getDeclarationName(classMember)
  if (!name) return null
  if (name === 'constructor' || name === 'if') return null
  if (ts.isMethodDeclaration(classMember)) return { name, kind: 'method' }
  return { name, kind: 'property' }
}

function getClassName(declaration: ts.ClassDeclaration): string {
  return declaration.name?.text ?? ''
}

function collectViewModelMembers(
  classDeclaration: ts.ClassDeclaration,
  visited: Set<string>
): ViewModelMembers {
  const className = getClassName(classDeclaration)
  if (visited.has(className)) return { properties: [], methods: [] }
  visited.add(className)

  const paramProperties = getParameterPropertyNames(classDeclaration)
  const directMembers = classDeclaration.members
    .filter(isRelevantMember)
    .filter((classMember) => !isStaticMember(classMember))
    .map(getMemberInfo)
    .filter(
      (memberInfo): memberInfo is { name: string; kind: 'property' | 'method' } =>
        memberInfo !== null
    )
    .reduce(
      (accumulator, { name, kind }) => {
        if (kind === 'method') {
          accumulator.methods.push(name)
        } else {
          accumulator.properties.push(name)
        }
        return accumulator
      },
      { properties: [...paramProperties], methods: [] as string[] }
    )

  const extendsClause = classDeclaration.heritageClauses?.find(
    (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword
  )

  if (extendsClause && extendsClause.types.length > 0) {
    const baseType = extendsClause.types[0]
    if (ts.isIdentifier(baseType.expression)) {
      const baseClassName = baseType.expression.text
      const baseSourceFile = classDeclaration.getSourceFile()
      const baseClass = getClassDeclaration(baseSourceFile, baseClassName, baseSourceFile.fileName)
      if (baseClass) {
        const baseMembers = collectViewModelMembers(baseClass, visited)
        return {
          properties: [...new Set([...directMembers.properties, ...baseMembers.properties])],
          methods: [...new Set([...directMembers.methods, ...baseMembers.methods])],
        }
      }
    }
  }

  return directMembers
}

export function extractViewModelMembers(
  typescriptFilePath: string,
  className: string
): ViewModelMembers {
  const sourceFile = getCachedSourceFile(typescriptFilePath)

  const classDeclaration = getClassDeclaration(sourceFile, className, typescriptFilePath, true)
  if (!classDeclaration) return { properties: [], methods: [] }

  return collectViewModelMembers(classDeclaration, new Set<string>())
}

function isClassExportedDirectly(classDeclaration: ts.ClassDeclaration): boolean {
  return (
    classDeclaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
    false
  )
}

function isClassExportedViaSpecifier(sourceFile: ts.SourceFile, className: string): boolean {
  return sourceFile.statements
    .filter((statement): statement is ts.ExportDeclaration => ts.isExportDeclaration(statement))
    .some((statement) => {
      const clause = statement.exportClause
      if (!clause || !ts.isNamedExports(clause)) return false
      return clause.elements.some(
        (element) => (element.propertyName ?? element.name).text === className
      )
    })
}

function isExportedClassDeclaration(
  classDeclaration: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  className: string
): boolean {
  const hasDefaultExport = classDeclaration.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword
  )
  if (hasDefaultExport) return false

  return (
    isClassExportedDirectly(classDeclaration) || isClassExportedViaSpecifier(sourceFile, className)
  )
}

function getClassDeclaration(
  sourceFile: ts.SourceFile,
  className: string,
  filePath: string,
  requireExport: boolean = false
): ts.ClassDeclaration | undefined {
  const classDeclarations = sourceFile.statements.filter(
    (statement): statement is ts.ClassDeclaration => ts.isClassDeclaration(statement)
  )

  const namedClass = classDeclarations.find(
    (classDeclaration) =>
      classDeclaration.name !== undefined && classDeclaration.name.text === className
  )
  if (namedClass) {
    if (!requireExport || isExportedClassDeclaration(namedClass, sourceFile, className)) {
      return namedClass
    }
    return undefined
  }

  if (!requireExport) {
    const deepDeclaration = findDeclarationDeep(className, sourceFile, filePath, new Set<string>())
    if (deepDeclaration && ts.isClassDeclaration(deepDeclaration)) return deepDeclaration
  }

  return undefined
}

export function isExportedClass(typescriptFilePath: string, className: string): boolean {
  const sourceFile = getCachedSourceFile(typescriptFilePath)
  return getClassDeclaration(sourceFile, className, typescriptFilePath, true) !== undefined
}

function findPropertyTypeNode(
  sourceFile: ts.SourceFile,
  propertyName: string,
  className: string,
  filePath: string,
  visited: Set<string> = new Set<string>()
): ts.Node | undefined {
  if (visited.has(className)) return undefined
  visited.add(className)

  const classDeclaration = getClassDeclaration(sourceFile, className, filePath)
  if (!classDeclaration) return undefined

  const prop = classDeclaration.members.find(
    (member): member is ts.PropertyDeclaration =>
      ts.isPropertyDeclaration(member) && getDeclarationName(member) === propertyName
  )
  if (prop) return prop.type ?? prop.initializer

  const paramType = getParameterPropertyType(classDeclaration, propertyName)
  if (paramType) return paramType

  const getter = classDeclaration.members.find(
    (member): member is ts.GetAccessorDeclaration =>
      ts.isGetAccessorDeclaration(member) && getDeclarationName(member) === propertyName
  )
  if (getter) {
    if (getter.type) return getter.type
    if (getter.body) {
      const returnStatement = getter.body.statements.find((stmt): stmt is ts.ReturnStatement =>
        ts.isReturnStatement(stmt)
      )
      if (returnStatement?.expression) return returnStatement.expression
    }
    return undefined
  }

  const extendsClause = classDeclaration.heritageClauses?.find(
    (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword
  )
  if (extendsClause && extendsClause.types.length > 0) {
    const baseType = extendsClause.types[0]
    if (ts.isIdentifier(baseType.expression)) {
      const baseClassName = baseType.expression.text
      const baseSourceFile = classDeclaration.getSourceFile()
      return findPropertyTypeNode(baseSourceFile, propertyName, baseClassName, filePath, visited)
    }
  }

  return undefined
}

export function extractNestedProperties(
  typescriptFilePath: string,
  propertyPaths: string[],
  className: string
): string[] {
  if (propertyPaths.length === 0) return []
  const sourceFile = getCachedSourceFile(typescriptFilePath)

  const rootPropertyName = propertyPaths[0]
  const startingNode = findPropertyTypeNode(
    sourceFile,
    rootPropertyName,
    className,
    typescriptFilePath
  )
  if (!startingNode) return []

  const remainingPaths = propertyPaths.slice(1)
  return resolveNestedProperty(startingNode, remainingPaths, sourceFile, typescriptFilePath)
}

function resolveToNode(
  node: ts.Node,
  remainingPaths: string[],
  sourceFile: ts.SourceFile,
  filePath: string
): ts.Node | undefined {
  if (remainingPaths.length === 0) return node
  const [currentPath, ...restOfPaths] = remainingPaths
  const childNode = resolvePropertyType(node, currentPath, sourceFile, filePath)
  if (!childNode) return undefined
  return resolveToNode(childNode, restOfPaths, sourceFile, filePath)
}

function resolveNestedProperty(
  node: ts.Node,
  remainingPaths: string[],
  sourceFile: ts.SourceFile,
  filePath: string
): string[] {
  const resolved = resolveToNode(node, remainingPaths, sourceFile, filePath)
  if (!resolved) return []
  return extractPropertyNamesFromType(resolved, sourceFile, filePath)
}

export function pathExists(
  typescriptFilePath: string,
  propertyPaths: string[],
  className: string
): boolean {
  if (propertyPaths.length === 0) return false
  const sourceFile = getCachedSourceFile(typescriptFilePath)
  const rootPropertyName = propertyPaths[0]
  const startingNode = findPropertyTypeNode(
    sourceFile,
    rootPropertyName,
    className,
    typescriptFilePath
  )
  if (!startingNode) return false
  const remainingPaths = propertyPaths.slice(1)
  const finalNode = resolveToNode(startingNode, remainingPaths, sourceFile, typescriptFilePath)
  return finalNode !== undefined
}

const BUILTIN_CLASSES: Record<string, string[]> = {
  Array: Object.getOwnPropertyNames(Array.prototype),
  String: Object.getOwnPropertyNames(String.prototype),
  Number: Object.getOwnPropertyNames(Number.prototype),
  Boolean: Object.getOwnPropertyNames(Boolean.prototype),
}

const BUILTIN_RETURN_TYPES: Record<string, ts.SyntaxKind> = {
  length: ts.SyntaxKind.NumberKeyword,
}

function keywordNodeFromKind(kind: ts.KeywordTypeSyntaxKind): ts.KeywordTypeNode {
  return ts.factory.createKeywordTypeNode(kind)
}

const COMPARISON_OPERATORS = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
])

function extractPropertyNamesFromType(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  filePath: string
): string[] {
  if (ts.isArrayLiteralExpression(node)) {
    return BUILTIN_CLASSES.Array
  }
  if (ts.isObjectLiteralExpression(node)) {
    return extractPropertyNamesFromObjectLiteral(node)
  }
  if (ts.isTypeReferenceNode(node)) {
    if (
      ts.isIdentifier(node.typeName) &&
      node.typeName.text === 'Array' &&
      node.typeArguments !== undefined &&
      node.typeArguments.length === 1
    ) {
      return BUILTIN_CLASSES.Array
    }
    return extractPropertyNamesFromTypeReference(node, sourceFile, filePath)
  }
  if (ts.isArrayTypeNode(node)) {
    return BUILTIN_CLASSES.Array
  }
  if (ts.isTypeLiteralNode(node)) {
    return extractPropertyNamesFromTypeLiteral(node)
  }
  if (ts.isUnionTypeNode(node)) {
    const nonNullTypes = node.types.filter(
      (unionMember) =>
        unionMember.kind !== ts.SyntaxKind.NullKeyword &&
        unionMember.kind !== ts.SyntaxKind.UndefinedKeyword
    )
    if (nonNullTypes.length === 0) return []
    return extractPropertyNamesFromType(nonNullTypes[0], sourceFile, filePath)
  }
  if (ts.isNewExpression(node)) {
    if (ts.isIdentifier(node.expression)) {
      const typeRef = ts.factory.createTypeReferenceNode(node.expression, undefined)
      return extractPropertyNamesFromTypeReference(typeRef, sourceFile, filePath)
    }
    return []
  }
  if (ts.isBinaryExpression(node)) {
    if (COMPARISON_OPERATORS.has(node.operatorToken.kind)) {
      return BUILTIN_CLASSES.Boolean
    }
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return extractPropertyNamesFromType(node.right, sourceFile, filePath)
    }
    if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      return extractPropertyNamesFromType(node.left, sourceFile, filePath)
    }
    return []
  }
  if (node.kind === ts.SyntaxKind.StringKeyword) {
    return BUILTIN_CLASSES.String
  }
  if (node.kind === ts.SyntaxKind.NumberKeyword) {
    return BUILTIN_CLASSES.Number
  }
  if (node.kind === ts.SyntaxKind.BooleanKeyword) {
    return BUILTIN_CLASSES.Boolean
  }
  return []
}

function extractPropertyNamesFromObjectLiteral(node: ts.ObjectLiteralExpression): string[] {
  return node.properties
    .filter((property): property is ts.PropertyAssignment => ts.isPropertyAssignment(property))
    .map((property) => (property.name && ts.isIdentifier(property.name) ? property.name.text : ''))
    .filter((name) => name !== '')
}

function extractPropertyNamesFromTypeReference(
  node: ts.TypeReferenceNode,
  sourceFile: ts.SourceFile,
  filePath: string
): string[] {
  const declaration = resolveTypeReference(node, sourceFile, filePath)
  if (!declaration) return []
  if (ts.isTypeAliasDeclaration(declaration)) {
    return extractPropertyNamesFromType(declaration.type, sourceFile, filePath)
  }
  return membersFromDeclaration(declaration)
}

function extractPropertyNamesFromTypeLiteral(node: ts.TypeLiteralNode): string[] {
  return node.members
    .filter((typeMember) => typeMember.name !== undefined && ts.isIdentifier(typeMember.name))
    .map((typeMember) => (typeMember.name as ts.Identifier).text)
}

function resolvePropertyType(
  node: ts.Node,
  propertyName: string,
  sourceFile: ts.SourceFile,
  filePath: string
): ts.Node | undefined {
  if (ts.isArrayLiteralExpression(node)) {
    if (BUILTIN_CLASSES.Array.includes(propertyName)) {
      const returnKind = BUILTIN_RETURN_TYPES[propertyName]
      return returnKind ? keywordNodeFromKind(returnKind as ts.KeywordTypeSyntaxKind) : node
    }
    if (node.elements.length > 0) {
      return resolvePropertyType(node.elements[0], propertyName, sourceFile, filePath)
    }
    return undefined
  }
  if (ts.isObjectLiteralExpression(node)) {
    return resolvePropertyInObjectLiteral(node, propertyName)
  }
  if (ts.isTypeReferenceNode(node)) {
    if (
      ts.isIdentifier(node.typeName) &&
      node.typeName.text === 'Array' &&
      node.typeArguments !== undefined &&
      node.typeArguments.length === 1
    ) {
      if (BUILTIN_CLASSES.Array.includes(propertyName)) {
        const returnKind = BUILTIN_RETURN_TYPES[propertyName]
        return returnKind ? keywordNodeFromKind(returnKind as ts.KeywordTypeSyntaxKind) : node
      }
      return resolvePropertyType(node.typeArguments[0], propertyName, sourceFile, filePath)
    }
    return resolvePropertyInTypeReference(node, propertyName, sourceFile, filePath)
  }
  if (ts.isArrayTypeNode(node)) {
    if (BUILTIN_CLASSES.Array.includes(propertyName)) {
      const returnKind = BUILTIN_RETURN_TYPES[propertyName]
      return returnKind ? keywordNodeFromKind(returnKind as ts.KeywordTypeSyntaxKind) : node
    }
    return resolvePropertyType(node.elementType, propertyName, sourceFile, filePath)
  }
  if (ts.isTypeLiteralNode(node)) {
    return resolvePropertyInTypeLiteral(node, propertyName)
  }
  if (ts.isUnionTypeNode(node)) {
    const nonNullTypes = node.types.filter(
      (unionMember) =>
        unionMember.kind !== ts.SyntaxKind.NullKeyword &&
        unionMember.kind !== ts.SyntaxKind.UndefinedKeyword
    )
    const first = nonNullTypes[0]
    if (!first) return undefined
    return resolvePropertyType(first, propertyName, sourceFile, filePath)
  }
  if (ts.isNewExpression(node)) {
    if (ts.isIdentifier(node.expression)) {
      const typeRef = ts.factory.createTypeReferenceNode(node.expression, undefined)
      return resolvePropertyInTypeReference(typeRef, propertyName, sourceFile, filePath)
    }
    return undefined
  }
  if (ts.isBinaryExpression(node)) {
    if (COMPARISON_OPERATORS.has(node.operatorToken.kind)) {
      if (BUILTIN_CLASSES.Boolean.includes(propertyName)) {
        const returnKind = BUILTIN_RETURN_TYPES[propertyName]
        return returnKind ? keywordNodeFromKind(returnKind as ts.KeywordTypeSyntaxKind) : node
      }
      return undefined
    }
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return resolvePropertyType(node.right, propertyName, sourceFile, filePath)
    }
    if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      const left = resolvePropertyType(node.left, propertyName, sourceFile, filePath)
      if (left) return left
      return resolvePropertyType(node.right, propertyName, sourceFile, filePath)
    }
    return undefined
  }
  if (node.kind === ts.SyntaxKind.StringKeyword && BUILTIN_CLASSES.String.includes(propertyName)) {
    const returnKind = BUILTIN_RETURN_TYPES[propertyName]
    return returnKind ? keywordNodeFromKind(returnKind as ts.KeywordTypeSyntaxKind) : node
  }
  return undefined
}

function resolvePropertyInTypeLiteral(
  node: ts.TypeLiteralNode,
  propertyName: string
): ts.Node | undefined {
  const member = node.members.find(
    (member) =>
      member.name !== undefined && ts.isIdentifier(member.name) && member.name.text === propertyName
  )
  if (!member) return undefined
  if (ts.isPropertySignature(member)) return member.type
  if (ts.isMethodSignature(member)) return member.type
  return undefined
}

function resolvePropertyInObjectLiteral(
  node: ts.ObjectLiteralExpression,
  propertyName: string
): ts.Node | undefined {
  const propertyAssignment = node.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) &&
      property.name &&
      ts.isIdentifier(property.name) &&
      property.name.text === propertyName
  )
  return propertyAssignment?.initializer
}

function resolvePropertyInTypeReference(
  node: ts.TypeReferenceNode,
  propertyName: string,
  sourceFile: ts.SourceFile,
  filePath: string
): ts.Node | undefined {
  const declaration = resolveTypeReference(node, sourceFile, filePath)
  if (!declaration) return undefined
  if (ts.isTypeAliasDeclaration(declaration)) {
    return resolvePropertyType(declaration.type, propertyName, sourceFile, filePath)
  }
  const member = declaration.members.find(
    (declarationMember): declarationMember is ts.PropertySignature | ts.PropertyDeclaration =>
      (ts.isPropertySignature(declarationMember) || ts.isPropertyDeclaration(declarationMember)) &&
      getDeclarationName(declarationMember) === propertyName
  )
  if (member) {
    return member.type ?? (ts.isPropertyDeclaration(member) ? member.initializer : undefined)
  }
  if (ts.isClassDeclaration(declaration)) {
    const paramType = getParameterPropertyType(declaration, propertyName)
    if (paramType) return paramType

    const getter = declaration.members.find(
      (getterMember): getterMember is ts.GetAccessorDeclaration =>
        ts.isGetAccessorDeclaration(getterMember) &&
        getDeclarationName(getterMember) === propertyName
    )
    if (getter) {
      if (getter.type) return getter.type
      if (getter.body) {
        const returnStatement = getter.body.statements.find((stmt): stmt is ts.ReturnStatement =>
          ts.isReturnStatement(stmt)
        )
        if (returnStatement?.expression) return returnStatement.expression
      }
      return undefined
    }
  }
  return undefined
}

function getImportStatements(sourceFile: ts.SourceFile): ts.ImportDeclaration[] {
  return sourceFile.statements.filter((statement): statement is ts.ImportDeclaration =>
    ts.isImportDeclaration(statement)
  )
}

function resolveTypeReference(
  typeNode: ts.TypeReferenceNode,
  sourceFile: ts.SourceFile,
  filePath: string
): ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration | undefined {
  if (!ts.isIdentifier(typeNode.typeName)) return undefined
  const typeName = typeNode.typeName.text
  const localDeclaration = findDeclaration(sourceFile, typeName)
  if (localDeclaration) return localDeclaration
  const crossFileDeclaration = findCrossFileDeclaration(typeName, sourceFile, filePath)
  if (crossFileDeclaration) return crossFileDeclaration
  return findDeclarationDeep(typeName, sourceFile, filePath, new Set<string>())
}

function findDeclarationDeep(
  typeName: string,
  sourceFile: ts.SourceFile,
  filePath: string,
  visited: Set<string>
): ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration | undefined {
  if (visited.has(filePath)) return undefined
  visited.add(filePath)

  for (const importDecl of getImportStatements(sourceFile)) {
    if (!ts.isStringLiteral(importDecl.moduleSpecifier)) continue
    const resolvedPath = resolveModulePath(filePath, importDecl.moduleSpecifier.text)
    if (!resolvedPath || visited.has(resolvedPath)) continue

    const importedFile = getCachedSourceFile(resolvedPath)
    const declaration = findDeclaration(importedFile, typeName)
    if (declaration) return declaration

    const deeper = findDeclarationDeep(typeName, importedFile, resolvedPath, visited)
    if (deeper) return deeper
  }

  return undefined
}

function findDeclaration(
  sourceFile: ts.SourceFile,
  name: string
): ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration | undefined {
  return sourceFile.statements.find(
    (
      statement
    ): statement is ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration =>
      (ts.isInterfaceDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement)) &&
      statement.name?.text === name
  )
}

function isParameterProperty(param: ts.ParameterDeclaration): boolean {
  return (
    (ts.getCombinedModifierFlags(param) &
      (ts.ModifierFlags.Public |
        ts.ModifierFlags.Protected |
        ts.ModifierFlags.Private |
        ts.ModifierFlags.Readonly)) !==
    0
  )
}

function getParameterPropertyNames(declaration: ts.ClassDeclaration): string[] {
  const ctor = declaration.members.find((member): member is ts.ConstructorDeclaration =>
    ts.isConstructorDeclaration(member)
  )
  if (!ctor) return []
  return ctor.parameters
    .filter((param) => isParameterProperty(param))
    .map((param) => (param.name && ts.isIdentifier(param.name) ? param.name.text : ''))
    .filter((name) => name !== '')
}

function getParameterPropertyType(
  declaration: ts.ClassDeclaration,
  propertyName: string
): ts.TypeNode | undefined {
  const ctor = declaration.members.find((member): member is ts.ConstructorDeclaration =>
    ts.isConstructorDeclaration(member)
  )
  if (!ctor) return undefined
  const param = ctor.parameters.find(
    (param) =>
      isParameterProperty(param) &&
      param.name !== undefined &&
      ts.isIdentifier(param.name) &&
      param.name.text === propertyName
  )
  return param?.type
}

function getAccessorNames(declaration: ts.ClassDeclaration): string[] {
  return declaration.members
    .filter((member): member is ts.GetAccessorDeclaration => ts.isGetAccessorDeclaration(member))
    .map((member) => (member.name && ts.isIdentifier(member.name) ? member.name.text : ''))
    .filter((name) => name !== '')
}

function membersFromDeclaration(
  declaration: ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration
): string[] {
  if (ts.isTypeAliasDeclaration(declaration)) return []
  const regularMembers = declaration.members
    .filter(
      (declarationMember): declarationMember is ts.PropertySignature | ts.PropertyDeclaration =>
        ts.isPropertySignature(declarationMember) || ts.isPropertyDeclaration(declarationMember)
    )
    .map((declarationMember) =>
      declarationMember.name && ts.isIdentifier(declarationMember.name)
        ? declarationMember.name.text
        : ''
    )
    .filter((name) => name !== '')

  if (ts.isClassDeclaration(declaration)) {
    return [
      ...regularMembers,
      ...getParameterPropertyNames(declaration),
      ...getAccessorNames(declaration),
    ]
  }
  return regularMembers
}

function findCrossFileDeclaration(
  typeName: string,
  sourceFile: ts.SourceFile,
  filePath: string
): ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration | undefined {
  const importDeclaration = sourceFile.statements.find(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      statement.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (importedElement) => importedElement.name.text === typeName
      )
  )
  if (!importDeclaration) return undefined

  if (!ts.isStringLiteral(importDeclaration.moduleSpecifier)) return undefined
  const moduleSpecifier = importDeclaration.moduleSpecifier.text
  const resolvedPath = resolveModulePath(filePath, moduleSpecifier)
  if (!resolvedPath) return undefined

  const importedSourceFile = getCachedSourceFile(resolvedPath)
  return findDeclaration(importedSourceFile, typeName)
}

function resolveModulePath(currentFilePath: string, moduleSpecifier: string): string | null {
  if (!moduleSpecifier.startsWith('.')) return null
  const directory = path.dirname(currentFilePath)
  const resolvedBase = path.resolve(directory, moduleSpecifier)
  const typescriptPath = `${resolvedBase}.ts`
  if (fs.existsSync(typescriptPath)) return typescriptPath
  const indexPath = path.join(resolvedBase, 'index.ts')
  if (fs.existsSync(indexPath)) return indexPath
  return null
}

export function extractInterfaceProperties(
  fullFileContent: string,
  interfaceName: string
): string[] {
  const sourceFile = ts.createSourceFile('temp.ts', fullFileContent, ts.ScriptTarget.Latest, true)
  const declaration = sourceFile.statements.find(
    (statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name?.text === interfaceName
  )
  if (!declaration) return []
  return declaration.members
    .filter((interfaceMember): interfaceMember is ts.PropertySignature =>
      ts.isPropertySignature(interfaceMember)
    )
    .map((interfaceMember) =>
      interfaceMember.name && ts.isIdentifier(interfaceMember.name) ? interfaceMember.name.text : ''
    )
    .filter((name) => name !== '')
}
