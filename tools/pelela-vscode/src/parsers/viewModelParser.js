const { readFileLines, readFileContent } = require('../utils/fileUtils')

function extractViewModelMembers(tsFilePath) {
  const lines = readFileLines(tsFilePath)
  const properties = new Set()
  const methods = new Set()

  let inInterface = false
  let inClass = false
  let interfaceBraceDepth = 0
  let classBraceDepth = 0
  let propertyBraceDepth = 0
  let inPropertyValue = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (isInterfaceDeclaration(line)) {
      inInterface = true
      interfaceBraceDepth = calculateBraceDepth(line)
      if (interfaceBraceDepth === 0) {
        inInterface = false
      }
      continue
    }

    if (inInterface) {
      interfaceBraceDepth = updateBraceDepth(interfaceBraceDepth, line)
      if (interfaceBraceDepth === 0) {
        inInterface = false
      }
      continue
    }

    if (isClassDeclaration(line)) {
      inClass = true
      classBraceDepth = calculateBraceDepth(line)
      if (classBraceDepth === 0) {
        inClass = false
      }
      continue
    }

    if (inClass) {
      const prevClassBraceDepth = classBraceDepth
      classBraceDepth = updateBraceDepth(classBraceDepth, line)

      if (inPropertyValue) {
        propertyBraceDepth = updateBraceDepth(propertyBraceDepth, line)
        if (propertyBraceDepth === 0) {
          inPropertyValue = false
        }
      } else if (prevClassBraceDepth === 1) {
        extractClassMembers(line, properties, methods)

        if (line.includes('=') && line.includes('{')) {
          inPropertyValue = true
          propertyBraceDepth = calculateBraceDepth(line)
          if (propertyBraceDepth === 0) {
            inPropertyValue = false
          }
        }
      }

      if (classBraceDepth === 0) {
        inClass = false
        inPropertyValue = false
      }
    }
  }

  return {
    properties: Array.from(properties),
    methods: Array.from(methods),
  }
}

function isInterfaceDeclaration(line) {
  return /^\s*(?:export\s+)?interface\s+\w+/.test(line)
}

function isClassDeclaration(line) {
  return /^\s*(?:export\s+)?class\s+\w+/.test(line)
}

function calculateBraceDepth(line) {
  const openBraces = (line.match(/{/g) || []).length
  const closeBraces = (line.match(/}/g) || []).length
  return openBraces - closeBraces
}

function updateBraceDepth(currentDepth, line) {
  return currentDepth + calculateBraceDepth(line)
}

function extractClassMembers(line, properties, methods) {
  const propMatch = /^\s*(?:public\s+|private\s+|protected\s+)?([a-zA-Z_]\w*)\s*(?::|=)\s*/.exec(
    line
  )
  if (propMatch) {
    properties.add(propMatch[1])
    return
  }

  const getterMatch = /^\s*(?:public\s+|private\s+|protected\s+)?get\s+([a-zA-Z_]\w*)\s*\(/.exec(
    line
  )
  if (getterMatch) {
    properties.add(getterMatch[1])
    return
  }

  const methodMatch = /^\s*(?:public\s+|private\s+|protected\s+)?([a-zA-Z_]\w*)\s*\(/.exec(line)
  if (methodMatch) {
    const name = methodMatch[1]
    if (name !== 'constructor' && name !== 'if') {
      methods.add(name)
    }
  }
}

function extractNestedProperties(tsFilePath, propertyPath) {
  const lines = readFileLines(tsFilePath)
  const text = readFileContent(tsFilePath)

  if (propertyPath.length === 0) {
    return []
  }

  const rootProperty = propertyPath[0]
  const rootLineIndex = findPropertyLine(lines, rootProperty)

  if (rootLineIndex === -1) {
    return []
  }

  const rootLine = lines[rootLineIndex]
  const arrayTypeMatch = rootLine.match(/:\s*(\w+)\[\]/)

  if (arrayTypeMatch && propertyPath.length === 1) {
    const interfaceName = arrayTypeMatch[1]
    return extractInterfaceProperties(text, interfaceName)
  }

  return extractPropertiesFromObjectPath(lines, rootLineIndex, propertyPath.slice(1))
}

function findPropertyLine(lines, propertyName) {
  const rootPropRegex = new RegExp(
    `^\\s*(?:public\\s+|private\\s+|protected\\s+)?${propertyName}\\??\\s*[=:]`,
    'm'
  )

  for (let i = 0; i < lines.length; i++) {
    if (rootPropRegex.test(lines[i])) {
      return i
    }
  }

  return -1
}

function extractPropertiesFromObjectPath(lines, startLineIndex, remainingPath) {
  let currentLineIndex = startLineIndex
  let braceDepth = 0
  let inObjectLiteral = false

  for (let i = currentLineIndex; i < lines.length; i++) {
    const line = lines[i]

    if (!inObjectLiteral) {
      if ((line.includes('=') || line.includes(':')) && line.includes('{')) {
        inObjectLiteral = true
        braceDepth = calculateBraceDepth(line)
        currentLineIndex = i + 1
        break
      }
    }
  }

  if (!inObjectLiteral) {
    return []
  }

  if (remainingPath.length === 0) {
    return collectPropertiesAtDepth(lines, currentLineIndex, braceDepth)
  }

  return findNestedProperty(lines, currentLineIndex, braceDepth, remainingPath)
}

function collectPropertiesAtDepth(lines, startIndex, initialBraceDepth) {
  const nestedProps = new Set()
  let braceDepth = initialBraceDepth

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]
    const prevBraceDepth = braceDepth
    braceDepth = updateBraceDepth(braceDepth, line)

    if (braceDepth === 0) {
      break
    }

    if (prevBraceDepth === 1) {
      const propMatch = /^\s*([a-zA-Z_]\w*)\s*[=:]/.exec(line)
      if (propMatch) {
        nestedProps.add(propMatch[1])
      }
    }
  }

  return Array.from(nestedProps)
}

function findNestedProperty(lines, startIndex, initialBraceDepth, remainingPath) {
  const targetProperty = remainingPath[0]
  let braceDepth = initialBraceDepth

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]
    const prevBraceDepth = braceDepth
    braceDepth = updateBraceDepth(braceDepth, line)

    if (braceDepth === 0) {
      break
    }

    const propMatch = new RegExp(`^\\s*${targetProperty}\\s*[=:]`).exec(line)
    if (propMatch && prevBraceDepth === 1) {
      return extractPropertiesFromObjectPath(lines, i, remainingPath.slice(1))
    }
  }

  return []
}

function extractInterfaceProperties(text, interfaceName) {
  const lines = text.split('\n')
  const interfaceRegex = new RegExp(`^\\s*interface\\s+${interfaceName}\\s*\\{?`, 'm')

  const interfaceLineIndex = findLineMatchingRegex(lines, interfaceRegex)

  if (interfaceLineIndex === -1) {
    return []
  }

  return collectInterfaceProperties(lines, interfaceLineIndex)
}

function findLineMatchingRegex(lines, regex) {
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      return i
    }
  }
  return -1
}

function collectInterfaceProperties(lines, startIndex) {
  const properties = new Set()
  let braceDepth = 0
  let inInterface = false

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]

    if (!inInterface) {
      if (line.includes('{')) {
        inInterface = true
        braceDepth = calculateBraceDepth(line)
      }
      continue
    }

    braceDepth = updateBraceDepth(braceDepth, line)

    if (braceDepth === 0) {
      break
    }

    const propMatch = /^\s*([a-zA-Z_]\w*)\s*[?:]/.exec(line)
    if (propMatch) {
      properties.add(propMatch[1])
    }
  }

  return Array.from(properties)
}

module.exports = {
  extractViewModelMembers,
  extractNestedProperties,
  extractInterfaceProperties,
}
