import { readFileContent, readFileLines } from '../utils/fileUtils'
import {
  calculateBraceDepth,
  findMemberMatch,
  isClassDeclaration,
  isInterfaceDeclaration,
  isObjectLiteralStart,
} from '../utils/parsingUtils'

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
    if (state.context === 'none') {
      return handleOuterContext(state, line)
    }

    if (state.context === 'interface') {
      return handleInterfaceContext(state, line)
    }

    if (state.context === 'class') {
      return handleClassContext(state, line)
    }

    return state
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
    const braceDepth = calculateBraceDepth(line)
    const context = isInterface ? 'interface' : 'class'

    return {
      ...state,
      braceDepth,
      context: braceDepth === 0 ? 'none' : context,
    }
  }

  return state
}

function handleInterfaceContext(state: ParserState, line: string): ParserState {
  const newBraceDepth = state.braceDepth + calculateBraceDepth(line)

  return {
    ...state,
    braceDepth: newBraceDepth,
    context: newBraceDepth === 0 ? 'none' : state.context,
  }
}

function handleClassContext(state: ParserState, line: string): ParserState {
  const previousBraceDepth = state.braceDepth
  const newBraceDepth = state.braceDepth + calculateBraceDepth(line)

  let newInPropertyValue = state.inPropertyValue
  let newPropertyBraceDepth = state.propertyBraceDepth
  let newMethods = state.methods
  let newProperties = state.properties

  if (state.inPropertyValue) {
    newPropertyBraceDepth += calculateBraceDepth(line)
    if (newPropertyBraceDepth === 0) {
      newInPropertyValue = false
    }
  } else if (previousBraceDepth === 1) {
    const member = findMemberMatch(line)
    if (member) {
      if (member.type === 'method') {
        newMethods = new Set(state.methods).add(member.name)
      } else {
        newProperties = new Set(state.properties).add(member.name)
      }
    }

    if (isObjectLiteralStart(line)) {
      newInPropertyValue = true
      newPropertyBraceDepth = calculateBraceDepth(line)
      if (newPropertyBraceDepth === 0) {
        newInPropertyValue = false
      }
    }
  }

  let newContext = state.context
  if (newBraceDepth === 0) {
    newContext = 'none'
    newInPropertyValue = false
  }

  return {
    ...state,
    braceDepth: newBraceDepth,
    inPropertyValue: newInPropertyValue,
    propertyBraceDepth: newPropertyBraceDepth,
    methods: newMethods,
    properties: newProperties,
    context: newContext,
  }
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
    .findIndex((line) => isObjectLiteralStart(line))

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
