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

function findForEachInElement(document, currentLine) {
  const forEachResults = []

  for (let i = currentLine; i >= 0; i--) {
    const lineText = document.lineAt(i).text

    const forEachMatch = /for-each=["'](\w+)\s+of\s+\w+["']/.exec(lineText)
    if (forEachMatch) {
      const itemName = forEachMatch[1]
      const itemPos = lineText.indexOf(itemName, lineText.indexOf('for-each='))
      forEachResults.push({ itemName, line: i, itemPos })
    }
  }

  return forEachResults.length > 0 ? forEachResults[0] : null
}

function parseForEachExpression(forEachLine) {
  const forEachExprMatch = /for-each=["'](\w+)\s+of\s+(\w+)["']/.exec(forEachLine)
  if (forEachExprMatch) {
    return {
      itemName: forEachExprMatch[1],
      collectionName: forEachExprMatch[2],
    }
  }
  return null
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
