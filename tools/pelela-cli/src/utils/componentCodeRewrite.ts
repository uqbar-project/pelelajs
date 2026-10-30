import * as ts from 'typescript'

export interface ComponentRewriteOptions {
  oldClass: string
  newClass: string
  rewritePath: (importPath: string) => string
  isMovedComponentFile?: boolean
}

interface SourceEdit {
  start: number
  end: number
  text: string
}

function asStringLiteral(expression: ts.Expression): ts.StringLiteral | undefined {
  return ts.isStringLiteral(expression) ? expression : undefined
}

function getImportModuleSpecifier(node: ts.Node): ts.StringLiteral | undefined {
  // biome-ignore lint/suspicious/noUnnecessaryConditions: compiler-API type guard; Biome models it as always falsy (false positive)
  if (ts.isImportDeclaration(node)) {
    return asStringLiteral(node.moduleSpecifier)
  }
  return undefined
}

function getExportModuleSpecifier(node: ts.Node): ts.StringLiteral | undefined {
  if (!ts.isExportDeclaration(node) || node.moduleSpecifier === undefined) {
    return undefined
  }
  return asStringLiteral(node.moduleSpecifier)
}

function getDynamicImportModuleSpecifier(node: ts.Node): ts.StringLiteral | undefined {
  // biome-ignore lint/suspicious/noUnnecessaryConditions: compiler-API type guard; Biome models it as always falsy (false positive)
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const [firstArgument] = node.arguments
    return firstArgument && asStringLiteral(firstArgument)
  }
  return undefined
}

function getModuleSpecifier(node: ts.Node): ts.StringLiteral | undefined {
  return (
    getImportModuleSpecifier(node) ??
    getExportModuleSpecifier(node) ??
    getDynamicImportModuleSpecifier(node)
  )
}

function specifierMentionsComponent(
  specifier: ts.ImportSpecifier | ts.ExportSpecifier,
  oldClass: string,
): boolean {
  return specifier.name.text === oldClass || specifier.propertyName?.text === oldClass
}

function namedBindingsMentionsComponent(
  namedBindings: ts.NamedImports | ts.NamespaceImport,
  oldClass: string,
): boolean {
  // biome-ignore lint/suspicious/noUnnecessaryConditions: compiler-API type guard; Biome models it as always falsy (false positive)
  if (ts.isNamespaceImport(namedBindings)) {
    return namedBindings.name.text === oldClass
  }
  // biome-ignore lint/suspicious/noUnnecessaryConditions: compiler-API type guard; Biome models it as always falsy (false positive)
  if (ts.isNamedImports(namedBindings)) {
    return namedBindings.elements.some((specifier) =>
      specifierMentionsComponent(specifier, oldClass),
    )
  }
  return false
}

function importClauseMentionsComponent(clause: ts.ImportClause, oldClass: string): boolean {
  if (clause.name?.text === oldClass) return true
  if (clause.namedBindings === undefined) return false
  return namedBindingsMentionsComponent(clause.namedBindings, oldClass)
}

function namedExportsMentionsComponent(clause: ts.NamedExports, oldClass: string): boolean {
  return clause.elements.some((specifier) => specifierMentionsComponent(specifier, oldClass))
}

function mentionsComponentInClause(
  node: ts.ImportDeclaration | ts.ExportDeclaration,
  oldClass: string,
): boolean {
  // biome-ignore lint/suspicious/noUnnecessaryConditions: compiler-API type guard; Biome models it as always falsy (false positive)
  const clause = ts.isImportDeclaration(node) ? node.importClause : node.exportClause
  if (clause === undefined) return false

  if (ts.isImportClause(clause)) {
    return importClauseMentionsComponent(clause, oldClass)
  }
  if (ts.isNamedExports(clause)) {
    return namedExportsMentionsComponent(clause, oldClass)
  }
  return clause.name.text === oldClass
}

function importsComponent(sourceFile: ts.SourceFile, oldClass: string): boolean {
  let found = false

  const visit = (node: ts.Node): void => {
    if (found) return
    // biome-ignore lint/suspicious/noUnnecessaryConditions: compiler-API type guard; Biome models it as always falsy (false positive)
    const isModuleDeclaration = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
    if (isModuleDeclaration && mentionsComponentInClause(node, oldClass)) {
      found = true
      return
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return found
}

function isPropertyNamePosition(node: ts.Identifier): boolean {
  const { parent } = node
  return (
    (ts.isPropertyAccessExpression(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent) ||
      ts.isEnumMember(parent)) &&
    parent.name === node
  )
}

function bindingNameMatches(name: ts.BindingName, oldClass: string): boolean {
  if (ts.isIdentifier(name)) {
    return name.text === oldClass
  }
  return name.elements.some(
    (element) => ts.isBindingElement(element) && bindingNameMatches(element.name, oldClass),
  )
}

function isLexicalScopeBoundary(node: ts.Node): boolean {
  return (
    ts.isBlock(node) ||
    ts.isSourceFile(node) ||
    ts.isModuleBlock(node) ||
    ts.isCaseBlock(node) ||
    ts.isCatchClause(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node)
  )
}

function findEnclosingScope(
  declaration: ts.Node,
  isScopeBoundary: (node: ts.Node) => boolean,
): ts.Node | undefined {
  let current = declaration.parent
  while (current !== undefined) {
    if (isScopeBoundary(current)) return current
    current = current.parent
  }
  return undefined
}

function getLocalBindingShadowingScope(node: ts.Node, oldClass: string): ts.Node | undefined {
  if (ts.isParameter(node)) {
    return bindingNameMatches(node.name, oldClass)
      ? findEnclosingScope(node, ts.isFunctionLike)
      : undefined
  }
  if (ts.isVariableDeclaration(node)) {
    return bindingNameMatches(node.name, oldClass)
      ? findEnclosingScope(node, isLexicalScopeBoundary)
      : undefined
  }
  return undefined
}

function getNamedDeclarationShadowingScope(
  node: ts.Node,
  oldClass: string,
  isMovedComponentFile: boolean,
): ts.Node | undefined {
  if (ts.isClassDeclaration(node)) {
    const isComponentDeclaration = isMovedComponentFile && node.name?.text === oldClass
    return node.name?.text === oldClass && !isComponentDeclaration
      ? findEnclosingScope(node, isLexicalScopeBoundary)
      : undefined
  }
  const isNamedFunctionOrEnum =
    (ts.isFunctionDeclaration(node) || ts.isEnumDeclaration(node)) && node.name?.text === oldClass
  if (isNamedFunctionOrEnum) {
    return findEnclosingScope(node, isLexicalScopeBoundary)
  }
  return undefined
}

function getShadowingScope(
  node: ts.Node,
  oldClass: string,
  isMovedComponentFile: boolean,
): ts.Node | undefined {
  return (
    getLocalBindingShadowingScope(node, oldClass) ??
    getNamedDeclarationShadowingScope(node, oldClass, isMovedComponentFile)
  )
}

function collectShadowedPositions(
  sourceFile: ts.SourceFile,
  oldClass: string,
  isMovedComponentFile: boolean,
): Set<number> {
  const positions = new Set<number>()

  const markScopeIdentifiers = (scope: ts.Node): void => {
    const visitScope = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node.text === oldClass) {
        positions.add(node.getStart(sourceFile))
      }
      ts.forEachChild(node, visitScope)
    }
    visitScope(scope)
  }

  const visit = (node: ts.Node): void => {
    const shadowingScope = getShadowingScope(node, oldClass, isMovedComponentFile)
    if (shadowingScope !== undefined) {
      markScopeIdentifiers(shadowingScope)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return positions
}

function collectEdits(sourceFile: ts.SourceFile, options: ComponentRewriteOptions): SourceEdit[] {
  const { oldClass, newClass, rewritePath, isMovedComponentFile = false } = options
  const shouldRewriteIdentifiers = isMovedComponentFile || importsComponent(sourceFile, oldClass)
  const shadowedPositions = collectShadowedPositions(sourceFile, oldClass, isMovedComponentFile)
  const edits: SourceEdit[] = []

  const visit = (node: ts.Node): void => {
    const isComponentReference =
      shouldRewriteIdentifiers &&
      ts.isIdentifier(node) &&
      node.text === oldClass &&
      !isPropertyNamePosition(node) &&
      !shadowedPositions.has(node.getStart(sourceFile))

    if (isComponentReference && newClass !== oldClass) {
      edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: newClass })
    }

    const moduleSpecifier = getModuleSpecifier(node)
    if (moduleSpecifier) {
      const rewrittenPath = rewritePath(moduleSpecifier.text)
      if (rewrittenPath !== moduleSpecifier.text) {
        edits.push({
          start: moduleSpecifier.getStart(sourceFile) + 1,
          end: moduleSpecifier.getEnd() - 1,
          text: rewrittenPath,
        })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return edits
}

function applyEdits(content: string, edits: SourceEdit[]): string {
  return edits
    .slice()
    .sort((left, right) => right.start - left.start)
    .reduce(
      (updatedContent, edit) =>
        updatedContent.slice(0, edit.start) + edit.text + updatedContent.slice(edit.end),
      content,
    )
}

export function rewriteComponentCode(
  content: string,
  filePath: string,
  options: ComponentRewriteOptions,
): string {
  const scriptKind = filePath.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  )

  return applyEdits(content, collectEdits(sourceFile, options))
}
