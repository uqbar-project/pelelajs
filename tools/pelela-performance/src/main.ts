import { setupBindings } from '../../../packages/core/src/bindings/setupBindings'
import type { RenderFunction } from '../../../packages/core/src/bindings/types'
import { createReactiveViewModel } from '../../../packages/core/src/reactivity/reactiveProxy'

const ROW_COUNT = 100
const LOW_THRESHOLD = 50

type Row = { value: number; offset: number; colorClass: string }

declare global {
  interface Window {
    __pelelaMutate: () => void
    __pelelaMutateDegraded: () => void
    __pelelaDestroy: () => void
  }
}

function mutateRows(targetRows: Row[]): void {
  targetRows.forEach((row) => {
    row.value += 1
    row.offset += 1
    row.colorClass = row.value > LOW_THRESHOLD ? 'hot' : 'cold'
  })
}

const initialRows = Array.from({ length: ROW_COUNT }, (_, index) => ({
  value: index,
  offset: 0,
  colorClass: index > LOW_THRESHOLD ? 'hot' : 'cold',
}))

const state = {
  rows: initialRows,
  bumpAll() {
    mutateRows(reactiveState.rows as Row[])
  },
  destroyAll() {
    render.destroy()
  },
}

let render: RenderFunction
const reactiveState = createReactiveViewModel(state as Record<string, unknown>, (changedPath) =>
  render(changedPath),
)

const root = document.getElementById('app')
if (!root) throw new Error('Performance fixture root is missing')

root.innerHTML = `
  <div class="grid">
    ${initialRows
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
      .join('')}
  </div>
  <button id="stress" click="bumpAll">Stress</button>
  <button id="destroy" click="destroyAll">Destroy</button>
`

render = setupBindings(root, reactiveState)

window.__pelelaMutate = () => mutateRows(reactiveState.rows as Row[])
window.__pelelaMutateDegraded = () => {
  mutateRows(state.rows)
  render()
}
window.__pelelaDestroy = () => render.destroy()
