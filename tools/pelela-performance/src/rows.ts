export const ROW_COUNT = 100
export const COMPARISON_ROW_COUNT = 50
export const LOW_THRESHOLD = 50

export type Row = {
  value: number
  offset: number
  colorClass: string
}

export function createRows(count = ROW_COUNT): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    value: index,
    offset: 0,
    colorClass: index > LOW_THRESHOLD ? 'hot' : 'cold',
  }))
}
