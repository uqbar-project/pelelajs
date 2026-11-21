import { setupBindings } from '../../../packages/core/src/bindings/setupBindings'
import type { RenderFunction } from '../../../packages/core/src/bindings/types'
import {
  createReactiveViewModel,
  type ReactiveViewModel,
} from '../../../packages/core/src/reactivity/reactiveProxy'

const ROW_COUNT = 100
const LOW_THRESHOLD = 50
const STRESS_ROW_INDEX = 0

type Row = { value: number; offset: number; colorClass: string }
type GridState = {
  rows: Row[]
  bumpAll: () => void
  destroyAll: () => void
}
type MountedRows = {
  reactiveState: ReactiveViewModel<GridState>
  render: RenderFunction
}

declare global {
  interface Window {
    __pelelaMutate: () => void
    __pelelaDestroy: () => void
    __pelelaRunCycles: (count: number) => void
  }
}

function createRows(): Row[] {
  return Array.from({ length: ROW_COUNT }, (_, index) => ({
    value: index,
    offset: 0,
    colorClass: index > LOW_THRESHOLD ? 'hot' : 'cold',
  }))
}

function rowsMarkup(rows: Row[]): string {
  return rows
    .map(
      (_, index) => `
      <div class="row" data-row="${index}">
        <input bind-value="rows.${index}.value" />
        <span class="value" bind-content="rows.${index}.value"></span>
        <span class="offset" bind-content="rows.${index}.offset"></span>
        <span class="color" bind-class="rows.${index}.colorClass"></span>
      </div>
    `,
    )
    .join('')
}

function mutateRows(targetRows: Row[]): void {
  targetRows.forEach((row) => {
    row.value += 1
    row.offset += 1
    row.colorClass = row.value > LOW_THRESHOLD ? 'hot' : 'cold'
  })
}

function mutateStressRow(targetRows: Row[]): void {
  const row = targetRows[STRESS_ROW_INDEX]
  row.value += 1
  row.offset += 1
  row.colorClass = row.value > LOW_THRESHOLD ? 'hot' : 'cold'
}

function mountRows(container: HTMLElement, rows: Row[]): MountedRows {
  container.innerHTML = `
    <div class="grid">${rowsMarkup(rows)}</div>
    <button class="stress" click="bumpAll">Stress</button>
    <button class="destroy" click="destroyAll">Destroy</button>
  `

  let render: RenderFunction
  const state: GridState = {
    rows,
    bumpAll: () => mutateRows(reactiveState.rows as Row[]),
    destroyAll: () => render.destroy(),
  }
  const reactiveState = createReactiveViewModel(state, (changedPath) => render(changedPath))
  render = setupBindings(container, reactiveState)

  return { reactiveState, render }
}

const root = document.getElementById('app')
if (!root) throw new Error('Performance fixture root is missing')

const initial = mountRows(root, createRows())

window.__pelelaMutate = () => mutateStressRow(initial.reactiveState.rows as Row[])
window.__pelelaDestroy = () => initial.render.destroy()

window.__pelelaRunCycles = (count) => {
  Array.from({ length: count }, () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const mounted = mountRows(container, createRows())
    mounted.render.destroy()
    return container
  }).forEach((container) => {
    container.remove()
  })
}
