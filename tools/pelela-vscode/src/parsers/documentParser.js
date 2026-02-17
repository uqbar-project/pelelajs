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

function findForEachHostTag(document, forEachLine) {
  const forEachLineText = document.lineAt(forEachLine).text ?? ''
  const inlineHostMatch = /<\s*([a-zA-Z][\w-]*)\b[^>]*\bfor-each\s*=[^>]*(?:>|$)/.exec(
    forEachLineText
  )
  if (inlineHostMatch) {
    return {
      line: forEachLine,
      tagName: inlineHostMatch[1],
    }
  }

  for (let lineIndex = forEachLine; lineIndex >= 0; lineIndex--) {
    const lineText = document.lineAt(lineIndex).text ?? ''
    const tagMatches = [...lineText.matchAll(/<\s*([a-zA-Z][\w-]*)\b[^>]*(?:>|$)/g)]
    if (tagMatches.length > 0) {
      const lastTagMatch = tagMatches[tagMatches.length - 1]
      return {
        line: lineIndex,
        tagName: lastTagMatch[1],
      }
    }
  }

  return null
}

function findForEachScopeEndBeforeCursor(
  document,
  hostStartLine,
  currentLine,
  currentCharacter,
  tagName
) {
  const tagRegex = new RegExp(`<\\/?\\s*${tagName}\\b[^>]*>`, 'g')
  const hostLineText = document.lineAt(hostStartLine).text ?? ''
  const hostOpenTagMatch = new RegExp(`<\\s*${tagName}\\b[^>]*>`).exec(hostLineText)
  // Host loop tag is always open by definition at this point.
  let openDepth = 1

  for (let lineIndex = hostStartLine; lineIndex <= currentLine; lineIndex++) {
    const fullLineText = document.lineAt(lineIndex).text ?? ''
    const lineText =
      lineIndex === currentLine && typeof currentCharacter === 'number'
        ? fullLineText.slice(0, currentCharacter)
        : fullLineText

    for (const tagMatch of lineText.matchAll(tagRegex)) {
      const tagText = tagMatch[0]
      const isClosingTag = /^<\s*\//.test(tagText)
      const isSelfClosingTag = /\/\s*>$/.test(tagText)

      // Avoid double-counting the host opening tag when it is fully present in hostStartLine.
      if (
        lineIndex === hostStartLine &&
        hostOpenTagMatch &&
        !isClosingTag &&
        !isSelfClosingTag &&
        tagMatch.index === hostOpenTagMatch.index
      ) {
        continue
      }

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

function isWithinForEachScope(document, hostStartLine, currentLine, currentCharacter, tagName) {
  if (currentLine === hostStartLine) {
    return true
  }

  // The cursor is inside the loop scope only if the host tag has not closed yet.
  const scopeEnd = findForEachScopeEndBeforeCursor(
    document,
    hostStartLine,
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

      const hostTag = findForEachHostTag(document, i)
      if (!hostTag) {
        continue
      }

      if (
        !isWithinForEachScope(
          document,
          hostTag.line,
          currentLine,
          currentCharacter,
          hostTag.tagName
        )
      ) {
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
