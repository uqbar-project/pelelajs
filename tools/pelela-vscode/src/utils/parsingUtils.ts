/**
 * Calculates the net depth of braces in a string.
 * @param line The string to analyze.
 * @returns The number of open braces minus the number of close braces.
 */
export function calculateBraceDepth(line: string): number {
  const openBraceCount = (line.match(/{/g) || []).length
  const closeBraceCount = (line.match(/}/g) || []).length
  return openBraceCount - closeBraceCount
}

/**
 * Detects if a line is a TypeScript interface declaration.
 */
export function isInterfaceDeclaration(line: string): boolean {
  return /^\s*(?:export\s+)?interface\s+\w+/.test(line)
}

/**
 * Detects if a line is a TypeScript class declaration.
 */
export function isClassDeclaration(line: string): boolean {
  return /^\s*(?:export\s+)?class\s+\w+/.test(line)
}

/**
 * Detects if a line is the beginning of an object literal.
 */
export function isObjectLiteralStart(line: string): boolean {
  return (line.includes('=') || line.includes(':')) && line.includes('{')
}
