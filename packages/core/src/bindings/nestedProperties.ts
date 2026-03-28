export function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, part) => {
    if (current === null || current === undefined) return undefined
    return current[part]
  }, obj)
}

export function setNestedProperty(obj: any, path: string, value: any): boolean {
  const parts = path.split('.')
  const lastPart = parts.pop()

  if (!lastPart) return false

  let current = obj
  for (const part of parts) {
    if (current === null || current === undefined) return false
    if (!(part in current)) return false
    current = current[part]
  }

  if (current === null || current === undefined) return false

  current[lastPart] = value
  return true
}
