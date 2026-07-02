import * as fs from 'node:fs'
import * as path from 'node:path'
import * as ts from 'typescript'

export interface ViewModelMembers {
  properties: string[]
  methods: string[]
}

function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8')
}

function createSourceFile(filePath: string): ts.SourceFile {
  const content = readFileContent(filePath)
  return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)
}

function getDeclarationName(node: { name?: ts.DeclarationName }): string | null {
  const declarationName = node.name
  if (!declarationName) return null
  if (ts.isIdentifier(declarationName)) return declarationName.text
  return null
}

function isRelevantMember(classMember: ts.ClassElement): boolean {
  return ts.isPropertyDeclaration(classMember) || ts.isGetAccessor(classMember) || ts.isMethodDeclaration(classMember)
}

function isStaticMember(classMember: ts.ClassElement): boolean {
  return (ts.getCombinedModifierFlags(classMember) & ts.ModifierFlags.Static) !== 0
}

function getMemberInfo(
  classMember: ts.ClassElement,
): { name: string; kind: 'property' | 'method' } | null {
  const name = getDeclarationName(classMember)
  if (!name) return null
  if (name === 'constructor' || name === 'if') return null
  if (ts.isMethodDeclaration(classMember)) return { name, kind: 'method' }
  return { name, kind: 'property' }
}

export function extractViewModelMembers(typescriptFilePath: string): ViewModelMembers {
  const sourceFile = createSourceFile(typescriptFilePath)
  const initialMembers: ViewModelMembers = { properties: [], methods: [] }

  const classDeclaration = sourceFile.statements.find(
    (statement): statement is ts.ClassDeclaration => ts.isClassDeclaration(statement),
  )
  if (!classDeclaration) return initialMembers

  return classDeclaration.members
    .filter(isRelevantMember)
    .filter((classMember) => !isStaticMember(classMember))
    .map(getMemberInfo)
    .filter((memberInfo): memberInfo is { name: string; kind: 'property' | 'method' } => memberInfo !== null)
    .reduce(
      (accumulator, { name, kind }) => {
        if (kind === 'method') {
          accumulator.methods.push(name)
        } else {
          accumulator.properties.push(name)
        }
        return accumulator
      },
      initialMembers,
    )
}

export function extractNestedProperties(
  typescriptFilePath: string,
  propertyPaths: string[],
): string[] {
  if (propertyPaths.length === 0) return []
  const sourceFile = createSourceFile(typescriptFilePath)

  const rootPropertyName = propertyPaths[0]
  const rootPropertyDeclaration = findPropertyDeclaration(sourceFile, rootPropertyName)
  if (!rootPropertyDeclaration) return []

  const startingNode = rootPropertyDeclaration.type ?? rootPropertyDeclaration.initializer
  if (!startingNode) return []

  const remainingPaths = propertyPaths.slice(1)
  return resolveNestedProperty(startingNode, remainingPaths, sourceFile, typescriptFilePath)
}

function findPropertyDeclaration(
  sourceFile: ts.SourceFile,
  propertyName: string,
): ts.PropertyDeclaration | undefined {
  const classDeclaration = sourceFile.statements.find(
    (statement): statement is ts.ClassDeclaration => ts.isClassDeclaration(statement),
  )
  if (!classDeclaration) return undefined
  return classDeclaration.members.find(
    (member): member is ts.PropertyDeclaration =>
      ts.isPropertyDeclaration(member) && getDeclarationName(member) === propertyName,
  )
}

function resolveNestedProperty(
  node: ts.Node,
  remainingPaths: string[],
  sourceFile: ts.SourceFile,
  filePath: string,
): string[] {
  if (remainingPaths.length === 0) {
    return extractPropertyNamesFromType(node, sourceFile, filePath)
  }

  const [currentPath, ...restOfPaths] = remainingPaths
  const childNode = resolvePropertyType(node, currentPath, sourceFile, filePath)
  if (!childNode) return []
  return resolveNestedProperty(childNode, restOfPaths, sourceFile, filePath)
}

function extractPropertyNamesFromType(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  filePath: string,
): string[] {
  if (ts.isObjectLiteralExpression(node)) {
    return extractPropertyNamesFromObjectLiteral(node)
  }
  if (ts.isTypeReferenceNode(node)) {
    return extractPropertyNamesFromTypeReference(node, sourceFile, filePath)
  }
  if (ts.isArrayTypeNode(node)) {
    return extractPropertyNamesFromType(node.elementType, sourceFile, filePath)
  }
  if (ts.isTypeLiteralNode(node)) {
    return extractPropertyNamesFromTypeLiteral(node)
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
  filePath: string,
): string[] {
  const declaration = resolveTypeReference(node, sourceFile, filePath)
  if (!declaration) return []
  return membersFromDeclaration(declaration)
}

function extractPropertyNamesFromTypeLiteral(node: ts.TypeLiteralNode): string[] {
  return node.members
    .filter((typeMember): typeMember is ts.PropertySignature => ts.isPropertySignature(typeMember))
    .map((typeMember) => (typeMember.name && ts.isIdentifier(typeMember.name) ? typeMember.name.text : ''))
    .filter((name) => name !== '')
}

function resolvePropertyType(
  node: ts.Node,
  propertyName: string,
  sourceFile: ts.SourceFile,
  filePath: string,
): ts.Node | undefined {
  if (ts.isObjectLiteralExpression(node)) {
    return resolvePropertyInObjectLiteral(node, propertyName)
  }
  if (ts.isTypeReferenceNode(node)) {
    return resolvePropertyInTypeReference(node, propertyName, sourceFile, filePath)
  }
  return undefined
}

function resolvePropertyInObjectLiteral(
  node: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Node | undefined {
  const propertyAssignment = node.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && property.name && ts.isIdentifier(property.name) && property.name.text === propertyName,
  )
  return propertyAssignment?.initializer
}

function resolvePropertyInTypeReference(
  node: ts.TypeReferenceNode,
  propertyName: string,
  sourceFile: ts.SourceFile,
  filePath: string,
): ts.Node | undefined {
  const declaration = resolveTypeReference(node, sourceFile, filePath)
  if (!declaration) return undefined
  if (ts.isTypeAliasDeclaration(declaration)) return undefined
  const member = declaration.members.find(
    (declarationMember): declarationMember is ts.PropertySignature | ts.PropertyDeclaration =>
      (ts.isPropertySignature(declarationMember) || ts.isPropertyDeclaration(declarationMember)) &&
      getDeclarationName(declarationMember) === propertyName,
  )
  if (!member) return undefined
  return member.type ?? (ts.isPropertyDeclaration(member) ? member.initializer : undefined)
}

function resolveTypeReference(
  typeNode: ts.TypeReferenceNode,
  sourceFile: ts.SourceFile,
  filePath: string,
): ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration | undefined {
  if (!ts.isIdentifier(typeNode.typeName)) return undefined
  const typeName = typeNode.typeName.text
  const localDeclaration = findDeclaration(sourceFile, typeName)
  if (localDeclaration) return localDeclaration
  return findCrossFileDeclaration(typeName, sourceFile, filePath)
}

function findDeclaration(
  sourceFile: ts.SourceFile,
  name: string,
): ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration | undefined {
  return sourceFile.statements.find(
    (statement): statement is ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration =>
      (ts.isInterfaceDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) &&
      statement.name?.text === name,
  )
}

function membersFromDeclaration(
  declaration: ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration,
): string[] {
  if (ts.isTypeAliasDeclaration(declaration)) return []
  return declaration.members
    .filter((declarationMember): declarationMember is ts.PropertySignature | ts.PropertyDeclaration =>
      ts.isPropertySignature(declarationMember) || ts.isPropertyDeclaration(declarationMember),
    )
    .map((declarationMember) => (declarationMember.name && ts.isIdentifier(declarationMember.name) ? declarationMember.name.text : ''))
    .filter((name) => name !== '')
}

function findCrossFileDeclaration(
  typeName: string,
  sourceFile: ts.SourceFile,
  filePath: string,
): ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration | undefined {
  const importDeclaration = sourceFile.statements.find(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      statement.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (importedElement) => importedElement.name.text === typeName,
      ),
  )
  if (!importDeclaration) return undefined

  if (!ts.isStringLiteral(importDeclaration.moduleSpecifier)) return undefined
  const moduleSpecifier = importDeclaration.moduleSpecifier.text
  const resolvedPath = resolveModulePath(filePath, moduleSpecifier)
  if (!resolvedPath) return undefined

  const importedSourceFile = createSourceFile(resolvedPath)
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
  interfaceName: string,
): string[] {
  const sourceFile = ts.createSourceFile('temp.ts', fullFileContent, ts.ScriptTarget.Latest, true)
  const declaration = sourceFile.statements.find(
    (statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name?.text === interfaceName,
  )
  if (!declaration) return []
  return declaration.members
    .filter((interfaceMember): interfaceMember is ts.PropertySignature => ts.isPropertySignature(interfaceMember))
    .map((interfaceMember) => (interfaceMember.name && ts.isIdentifier(interfaceMember.name) ? interfaceMember.name.text : ''))
    .filter((name) => name !== '')
}
