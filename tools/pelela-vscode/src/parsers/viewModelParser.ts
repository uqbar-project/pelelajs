import { readFileContent, readFileLines } from '../utils/fileUtils'

export interface ViewModelMembers {
  properties: string[]
  methods: string[]
}

interface ParserState {
  properties: Set<string>
  methods: Set<string>
  context: 'none' | 'interface' | 'class'
  braceDepth: number
  inPropertyValue: boolean
  propertyBraceDepth: number
}

export function extractViewModelMembers(typescriptFilePath: string): ViewModelMembers {
  const lines = readFileLines(typescriptFilePath)

  const initialState: ParserState = {
    properties: new Set<string>(),
    methods: new Set<string>(),
    context: 'none',
    braceDepth: 0,
    inPropertyValue: false,
    propertyBraceDepth: 0,
  }

  const finalState = lines.reduce((state, line) => {
    const nextState = { ...state }

    if (state.context === 'none') {
      return handleOuterContext(nextState, line)
    }

    if (state.context === 'interface') {
      return handleInterfaceContext(nextState, line)
    }

    if (state.context === 'class') {
      return handleClassContext(nextState, line)
    }

    return nextState
  }, initialState)

  return {
    properties: Array.from(finalState.properties),
    methods: Array.from(finalState.methods),
  }
}

function handleOuterContext(state: ParserState, line: string): ParserState {
  const isInterface = isInterfaceDeclaration(line)
  const isClass = isClassDeclaration(line)

  if (isInterface || isClass) {
    state.braceDepth = calculateBraceDepth(line)
    const context = isInterface ? 'interface' : 'class'
    state.context = state.braceDepth === 0 ? 'none' : context
    return state
  }

  return state
}

function handleInterfaceContext(state: ParserState, line: string): ParserState {
  state.braceDepth += calculateBraceDepth(line)
  if (state.braceDepth === 0) {
    state.context = 'none'
  }
  return state
}

function handleClassContext(state: ParserState, line: string): ParserState {
  const previousBraceDepth = state.braceDepth
  state.braceDepth += calculateBraceDepth(line)

  if (state.inPropertyValue) {
    state.propertyBraceDepth += calculateBraceDepth(line)
    if (state.propertyBraceDepth === 0) {
      state.inPropertyValue = false
    }
  } else if (previousBraceDepth === 1) {
    extractClassMembers(line, state.properties, state.methods)

    if (isBeginningOfObjectLiteral(line)) {
      state.inPropertyValue = true
      state.propertyBraceDepth = calculateBraceDepth(line)
      if (state.propertyBraceDepth === 0) {
        state.inPropertyValue = false
      }
    }
  }

  if (state.braceDepth === 0) {
    state.context = 'none'
    state.inPropertyValue = false
  }

  return state
}

function isInterfaceDeclaration(line: string): boolean {
  return /^\s*(?:export\s+)?interface\s+\w+/.test(line)
}

function isClassDeclaration(line: string): boolean {
  return /^\s*(?:export\s+)?class\s+\w+/.test(line)
}

function isBeginningOfObjectLiteral(line: string): boolean {
  return line.includes('=') && line.includes('{')
}

function calculateBraceDepth(line: string): number {
  const openBraces = (line.match(/{/g) || []).length
  const closeBraces = (line.match(/}/g) || []).length
  return openBraces - closeBraces
}

function extractClassMembers(line: string, properties: Set<string>, methods: Set<string>): void {
  const nameMatch = findPropertyMatch(line) || findGetterMatch(line) || findMethodMatch(line)

  if (!nameMatch) return

  const { name, type } = nameMatch
  if (type === 'method' && !isValidMethodName(name)) return

  if (type === 'method') {
    methods.add(name)
  } else {
    properties.add(name)
  }
}

function findPropertyMatch(line: string): { name: string; type: 'property' } | null {
  const propMatch = /^\s*(?:public\s+|private\s+|protected\s+)?([a-zA-Z_]\w*)\s*(?::|=)\s*/.exec(
    line
  )
  return propMatch ? { name: propMatch[1], type: 'property' } : null
}

function findGetterMatch(line: string): { name: string; type: 'property' } | null {
  const getterMatch = /^\s*(?:public\s+|private\s+|protected\s+)?get\s+([a-zA-Z_]\w*)\s*\(/.exec(
    line
  )
  return getterMatch ? { name: getterMatch[1], type: 'property' } : null
}

function findMethodMatch(line: string): { name: string; type: 'method' } | null {
  const methodMatch = /^\s*(?:public\s+|private\s+|protected\s+)?([a-zA-Z_]\w*)\s*\(/.exec(line)
  return methodMatch ? { name: methodMatch[1], type: 'method' } : null
}

function isValidMethodName(name: string): boolean {
  return name !== 'constructor' && name !== 'if'
}

export function extractNestedProperties(
  typescriptFilePath: string,
  propertyPaths: string[]
): string[] {
  const lines = readFileLines(typescriptFilePath)
  const fullFileContent = readFileContent(typescriptFilePath)

  if (propertyPaths.length === 0) return []

  const rootPropertyName = propertyPaths[0]
  const rootPropertyLineIndex = findPropertyLine(lines, rootPropertyName)

  if (rootPropertyLineIndex === -1) return []

  const rootPropertyLine = lines[rootPropertyLineIndex]
  const arrayTypeMatch = rootPropertyLine.match(/:\s*(\w+)\[\]/)

  if (arrayTypeMatch && propertyPaths.length === 1) {
    const interfaceName = arrayTypeMatch[1]
    return extractInterfaceProperties(fullFileContent, interfaceName)
  }

  return extractPropertiesFromObjectPath(lines, rootPropertyLineIndex, propertyPaths.slice(1))
}

function findPropertyLine(lines: string[], propertyName: string): number {
  const propertyDeclarationRegex = new RegExp(
    `^\\s*(?:public\\s+|private\\s+|protected\\s+)?${propertyName}\\??\\s*[=:]`,
    'm'
  )

  return lines.findIndex((line) => propertyDeclarationRegex.test(line))
}

function extractPropertiesFromObjectPath(
  lines: string[],
  startLineIndex: number,
  remainingPropertyPath: string[]
): string[] {
  const objectLiteralLineIndex = lines
    .slice(startLineIndex)
    .findIndex((line) => (line.includes('=') || line.includes(':')) && line.includes('{'))

  if (objectLiteralLineIndex === -1) return []

  const absoluteObjectLiteralLineIndex = startLineIndex + objectLiteralLineIndex
  const braceDepth = calculateBraceDepth(lines[absoluteObjectLiteralLineIndex])
  const searchStartIndex = absoluteObjectLiteralLineIndex + 1

  if (remainingPropertyPath.length === 0) {
    return collectPropertiesAtBraceLevelOne(lines, searchStartIndex, braceDepth)
  }

  return findNestedPropertyRecursive(lines, searchStartIndex, braceDepth, remainingPropertyPath)
}

function collectPropertiesAtBraceLevelOne(
  lines: string[],
  searchStartIndex: number,
  initialBraceDepth: number
): string[] {
  let currentBraceDepth = initialBraceDepth
  const discoveredProperties = new Set<string>()

  for (let lineIndex = searchStartIndex; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    const previousBraceDepth = currentBraceDepth
    currentBraceDepth += calculateBraceDepth(line)

    if (currentBraceDepth === 0) break

    if (previousBraceDepth === 1) {
      const propertyNameMatch = /^\s*([a-zA-Z_]\w*)\s*[=:]/.exec(line)
      if (propertyNameMatch) {
        discoveredProperties.add(propertyNameMatch[1])
      }
    }
  }

  return Array.from(discoveredProperties)
}

function findNestedPropertyRecursive(
  lines: string[],
  searchStartIndex: number,
  initialBraceDepth: number,
  remainingPropertyPath: string[]
): string[] {
  const targetProperty = remainingPropertyPath[0]
  let currentBraceDepth = initialBraceDepth

  for (let lineIndex = searchStartIndex; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    const previousBraceDepth = currentBraceDepth
    currentBraceDepth += calculateBraceDepth(line)

    if (currentBraceDepth === 0) break

    const propertyMatchRegex = new RegExp(`^\\s*${targetProperty}\\s*[=:]`)
    if (propertyMatchRegex.test(line) && previousBraceDepth === 1) {
      return extractPropertiesFromObjectPath(lines, lineIndex, remainingPropertyPath.slice(1))
    }
  }

  return []
}

export function extractInterfaceProperties(
  fullFileContent: string,
  interfaceName: string
): string[] {
  const lines = fullFileContent.split('\n')
  const interfaceDeclarationRegex = new RegExp(`^\\s*interface\\s+${interfaceName}\\s*\\{?`, 'm')

  const interfaceStartLineIndex = lines.findIndex((line) => interfaceDeclarationRegex.test(line))

  if (interfaceStartLineIndex === -1) return []

  return collectInterfaceMembers(lines, interfaceStartLineIndex)
}

function collectInterfaceMembers(lines: string[], searchStartIndex: number): string[] {
  const discoveredProperties = new Set<string>()
  let currentBraceDepth = 0
  let isInsideInterface = false

  for (let lineIndex = searchStartIndex; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]

    if (!isInsideInterface) {
      if (line.includes('{')) {
        isInsideInterface = true
        currentBraceDepth = calculateBraceDepth(line)
      }
      continue
    }

    currentBraceDepth += calculateBraceDepth(line)
    if (currentBraceDepth === 0) break

    const interfacePropertyMatch = /^\s*([a-zA-Z_]\w*)\s*[?:]/.exec(line)
    if (interfacePropertyMatch) {
      discoveredProperties.add(interfacePropertyMatch[1])
    }
  }

  return Array.from(discoveredProperties)
}
