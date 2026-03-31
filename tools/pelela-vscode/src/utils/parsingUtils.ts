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

export type ViewModelMemberType = 'property' | 'method'

export interface MemberMatch {
  name: string
  type: ViewModelMemberType
}

/**
 * Attempts to match a property, getter, or method on a given line.
 */
export function findMemberMatch(line: string): MemberMatch | null {
  const nameMatch = findPropertyMatch(line) || findGetterMatch(line) || findMethodMatch(line)

  if (!nameMatch) return null

  const { name, type } = nameMatch
  if (type === 'method' && !isValidMethodName(name)) return null

  return { name, type }
}

function findPropertyMatch(line: string): MemberMatch | null {
  const propMatch = /^\s*(?:public\s+|private\s+|protected\s+)?([a-zA-Z_]\w*)\s*(?::|=)\s*/.exec(
    line
  )
  return propMatch ? { name: propMatch[1], type: 'property' } : null
}

function findGetterMatch(line: string): MemberMatch | null {
  const getterMatch = /^\s*(?:public\s+|private\s+|protected\s+)?get\s+([a-zA-Z_]\w*)\s*\(/.exec(
    line
  )
  return getterMatch ? { name: getterMatch[1], type: 'property' } : null
}

function findMethodMatch(line: string): MemberMatch | null {
  const methodMatch = /^\s*(?:public\s+|private\s+|protected\s+)?([a-zA-Z_]\w*)\s*\(/.exec(line)
  return methodMatch ? { name: methodMatch[1], type: 'method' } : null
}

function isValidMethodName(name: string): boolean {
  return name !== 'constructor' && name !== 'if'
}
