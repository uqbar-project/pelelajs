/**
 * Scalar literal casting utilities.
 *
 * Used to convert the raw text of a const-* attribute value into a typed
 * scalar (number, boolean or string). Only plain literals are supported:
 * Pelela templates must not contain expressions.
 */

export function isNumberLiteral(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Number(value))
}

export function parseBooleanLiteral(value: string): boolean | null {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

export function parseScalarLiteral(raw: string): number | boolean | string {
  if (isNumberLiteral(raw)) return Number(raw)

  const booleanLiteral = parseBooleanLiteral(raw.trim())
  if (booleanLiteral !== null) return booleanLiteral

  return raw
}
