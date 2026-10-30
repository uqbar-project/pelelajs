import * as ts from 'typescript'

export interface ComponentRewriteOptions {
  oldClass: string
  newClass: string
  rewritePath: (importPath: string) => string
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
    (ts.isPropertyAssignment(parent) ||
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

function collectEdits(sourceFile: ts.SourceFile, options: ComponentRewriteOptions): SourceEdit[] {
  const { oldClass, newClass, rewritePath } = options
  const shouldRewriteIdentifiers = importsComponent(sourceFile, oldClass)
  const edits: SourceEdit[] = []

  const visit = (node: ts.Node): void => {
    const isComponentReference =
      shouldRewriteIdentifiers &&
      ts.isIdentifier(node) &&
      node.text === oldClass &&
      !isPropertyNamePosition(node)

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
