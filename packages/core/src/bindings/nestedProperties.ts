const BLACKLISTED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function isUnsafeKey(key: string): boolean {
  return BLACKLISTED_KEYS.has(key)
}

function hasProperty(obj: object, key: string): boolean {
  return Object.hasOwn(obj, key)
}

export function getNestedProperty(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, part) => {
    if (current === null || current === undefined || isUnsafeKey(part)) return undefined
    return (current as Record<string, unknown>)[part]
  }, obj)
}

export function setNestedProperty(obj: unknown, path: string, value: unknown): boolean {
  const parts = path.split('.')
  const lastPart = parts.pop()

  if (!lastPart || isUnsafeKey(lastPart)) return false

  let current: unknown = obj
  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object' ||
      isUnsafeKey(part)
    ) {
      return false
    }

    if (!hasProperty(current as object, part)) return false
    current = (current as Record<string, unknown>)[part]
  }

  if (current === null || current === undefined || typeof current !== 'object') {
    return false
  }

  ;(current as Record<string, unknown>)[lastPart] = value
  return true
}
