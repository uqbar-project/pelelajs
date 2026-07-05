export function findFirst<T>(
  iterable: Iterable<T>,
  predicate: (item: T) => boolean
): T | undefined {
  for (const item of iterable) {
    if (predicate(item)) return item
  }
  return undefined
}
