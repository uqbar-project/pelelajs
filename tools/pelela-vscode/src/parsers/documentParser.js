function getCurrentAttributeName(lineText, positionCharacter) {
  const textUpToCursor = lineText.slice(0, positionCharacter)
  const match = /(\b[\w-]+)\s*=\s*"[^"]*$/.exec(textUpToCursor)
  return match ? match[1] : null
}

function isInsideTag(textBeforeCursor) {
  return /<[^>]*$/.test(textBeforeCursor)
}

function isStartingTag(textBeforeCursor) {
  return /<\w*$/.test(textBeforeCursor)
}

function getAttributeValueMatch(textBeforeCursor) {
  const attrValueMatch = /=\s*"([^"]*)$/.exec(textBeforeCursor)
  return attrValueMatch ? attrValueMatch[1] : null
}

function parseForEachValue(forEachValue) {
  const indexedExprMatch = /^\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s+of\s+(\w+)\s*$/.exec(forEachValue)
  if (indexedExprMatch) {
    return {
      itemName: indexedExprMatch[1],
      indexName: indexedExprMatch[2],
      collectionName: indexedExprMatch[3],
    }
  }

  const basicExprMatch = /^\s*(\w+)\s+of\s+(\w+)\s*$/.exec(forEachValue)
  if (basicExprMatch) {
    return {
      itemName: basicExprMatch[1],
      collectionName: basicExprMatch[2],
    }
  }

  return null
}

function getForEachAliasPositions(attrValue, hasIndexAlias) {
  if (hasIndexAlias) {
    const indexedMatch = /^(\s*\(\s*)(\w+)(\s*,\s*)(\w+)(\s*\)\s+of\s+)(\w+)(\s*)$/.exec(attrValue)
    if (!indexedMatch) {
      return null
    }

    return {
      itemPos: indexedMatch[1].length,
      indexPos: indexedMatch[1].length + indexedMatch[2].length + indexedMatch[3].length,
    }
  }

  const basicMatch = /^(\s*)(\w+)(\s+of\s+)(\w+)(\s*)$/.exec(attrValue)
  if (!basicMatch) {
    return null
  }

  return {
    itemPos: basicMatch[1].length,
    indexPos: undefined,
  }
}

function getForEachTagName(lineText) {
  const tagMatch = /<\s*([a-zA-Z][\w-]*)\b[^>]*\bfor-each\s*=/.exec(lineText)
  return tagMatch ? tagMatch[1] : null
}

function findForEachScopeEndBeforeCursor(
  document,
  forEachLine,
  currentLine,
  currentCharacter,
  tagName
) {
  const tagRegex = new RegExp(`<\\/?\\s*${tagName}\\b[^>]*>`, 'g')
  let openDepth = 0

  for (let lineIndex = forEachLine; lineIndex <= currentLine; lineIndex++) {
    const fullLineText = document.lineAt(lineIndex).text ?? ''
    const lineText =
      lineIndex === currentLine && typeof currentCharacter === 'number'
        ? fullLineText.slice(0, currentCharacter)
        : fullLineText

    for (const tagMatch of lineText.matchAll(tagRegex)) {
      const tagText = tagMatch[0]
      const isClosingTag = /^<\s*\//.test(tagText)
      const isSelfClosingTag = /\/\s*>$/.test(tagText)

      if (isClosingTag) {
        openDepth -= 1
        if (openDepth <= 0) {
          return {
            line: lineIndex,
            character: tagMatch.index,
          }
        }
      } else if (!isSelfClosingTag) {
        openDepth += 1
      }
    }
  }

  return null
}

function isWithinForEachScope(document, forEachLine, currentLine, currentCharacter, tagName) {
  if (currentLine === forEachLine) {
    return true
  }

  // The cursor is inside the loop scope only if the host tag has not closed yet.
  const scopeEnd = findForEachScopeEndBeforeCursor(
    document,
    forEachLine,
    currentLine,
    currentCharacter,
    tagName
  )
  return scopeEnd === null
}

function findForEachInElement(document, currentLine, currentCharacter) {
  const forEachResults = []

  for (let i = currentLine; i >= 0; i--) {
    const lineText = document.lineAt(i).text
    const forEachExpression = parseForEachExpression(lineText)
    if (forEachExpression) {
      const attrMatch = /for-each=(["'])([^"']+)\1/.exec(lineText)
      if (!attrMatch) {
        continue
      }

      const forEachTagName = getForEachTagName(lineText)
      if (!forEachTagName) {
        continue
      }

      if (!isWithinForEachScope(document, i, currentLine, currentCharacter, forEachTagName)) {
        continue
      }

      const attrText = attrMatch[0]
      const attrValue = attrMatch[2]
      const valueStart = attrMatch.index + attrText.indexOf(attrValue)

      const aliasPositions = getForEachAliasPositions(attrValue, !!forEachExpression.indexName)
      if (!aliasPositions) {
        continue
      }

      const itemPos = valueStart + aliasPositions.itemPos
      const indexPos =
        typeof aliasPositions.indexPos === 'number'
          ? valueStart + aliasPositions.indexPos
          : undefined

      forEachResults.push({
        ...forEachExpression,
        line: i,
        itemPos,
        indexPos,
      })
    }
  }

  return forEachResults.length > 0 ? forEachResults[0] : null
}

function parseForEachExpression(forEachLine) {
  const forEachAttrMatch = /for-each=["']([^"']+)["']/.exec(forEachLine)
  if (!forEachAttrMatch) {
    return null
  }

  return parseForEachValue(forEachAttrMatch[1])
}

function parsePropertyPath(valueBeforeCursor) {
  const dotMatch = /(\w+(?:\.\w+)*)\.$/.exec(valueBeforeCursor)
  return dotMatch ? dotMatch[1].split('.') : null
}

module.exports = {
  getCurrentAttributeName,
  isInsideTag,
  isStartingTag,
  getAttributeValueMatch,
  findForEachInElement,
  parseForEachExpression,
  parsePropertyPath,
}
