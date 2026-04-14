export function getNestedProperty(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, part) => {
    if (current === null || current === undefined) return undefined
    return (current as Record<string, unknown>)[part]
  }, obj)
}

export function setNestedProperty(obj: unknown, path: string, value: unknown): boolean {
  const parts = path.split('.')
  const lastPart = parts.pop()

  if (!lastPart) return false

  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined) return false
    if (!(part in (current as object))) return false
    current = (current as Record<string, unknown>)[part]
  }

  if (current === null || current === undefined) return false

  ;(current as Record<string, unknown>)[lastPart] = value
  return true
}
